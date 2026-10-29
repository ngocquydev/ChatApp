package com.chatapp.recommendation

import com.chatapp.recommendation.config.SparkJobConfig
import com.chatapp.recommendation.sink.RedisPipelineSink
import org.apache.spark.sql.expressions.Window
import org.apache.spark.sql.functions._
import org.apache.spark.sql.{DataFrame, SparkSession}
import org.slf4j.LoggerFactory

/**
 * =========================================================================================
 * BATCH LAYER: ADAMIC-ADAR FRIEND RECOMMENDATION SPARK JOB (SCALA 2.12/2.13 + SPARK 3.5)
 * =========================================================================================
 *
 * Thuật toán Adamic-Adar Index (AA):
 *   AA(A, C) = Tổng_{B thuộc N(A) giao N(C)} [ 1.0 / log(degree(B)) ]
 * Trong đó:
 *   - B là người bạn chung (bridge node) giữa người dùng A và C.
 *   - degree(B) là số lượng bạn bè của người bạn chung B.
 *   - log(degree(B)) đo lường mức độ phổ biến của B. Bạn bè chung càng ít bạn (ví dụ bạn thân,
 *     nhóm học tập riêng) thì trọng số càng cao (tín hiệu kết nối mạnh).
 *
 * CÁC KỸ THUẬT TỐI ƯU HÓA HỆ THỐNG PHÂN TÁN CHỐNG OOM & COMBINATORIAL EXPLOSION:
 * 1. Pruning Bridge Nodes (Cắt tỉa KOLs/Super-Nodes):
 *    - Node có degree < 2: Không thể là cầu nối giữa 2 người khác nhau -> Bỏ.
 *    - Node có degree > 1000: Là KOLs/Người nổi tiếng. Nếu thực hiện Self-Join qua node này,
 *      số cặp sinh ra = O(D^2) (ví dụ 10.000 bạn bè tạo ra ~50.000.000 cặp trên 1 partition),
 *      gây hiện tượng Data Skew khủng khiếp, executor bị nghẽn (stragglers) và văng lỗi OutOfMemory (OOM).
 *      Hơn nữa, 1 / log(10000) ~ 0.1, trọng số này đóng góp rất ít vào độ tin cậy kết bạn ngoài đời thực.
 *
 * 2. Unidirectional Self-Join (Tối ưu phép Self-Join 1 chiều):
 *    - Ép điều kiện A < C để loại bỏ việc tính toán trùng lặp (C, A).
 *    - Giảm trực tiếp 50% dữ liệu shuffle qua mạng và 50% chi phí GroupBy aggregation.
 *
 * 3. Left-Anti Join để loại trừ bạn bè hiện tại:
 *    - Sử dụng broadcast / left_anti join để lọc chính xác các cặp đã là bạn của nhau.
 *
 * 4. Window Ranking & Redis Pipeline Partition Sink:
 *    - Lấy Top 50 ứng viên điểm cao nhất cho mỗi user.
 *    - Ghi dữ liệu trực tiếp vào Redis bằng Partition Pipelining (Jedis) với độ trễ ghi cực thấp.
 */
object AdamicAdarBatchJob {

  private val logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    val config = SparkJobConfig.parse(args).getOrElse {
      logger.error("Tham số cấu hình không hợp lệ. Thoát ứng dụng.")
      sys.exit(1)
    }

    logger.info(s"Khởi động Adamic-Adar Recommendation Batch Job với cấu hình: $config")

    // Khởi tạo SparkSession tối ưu hóa Adaptive Query Execution (AQE) của Spark 3.5
    val spark = SparkSession.builder()
      .appName("AdamicAdarBatchRecommendation")
      .config("spark.sql.adaptive.enabled", "true")
      .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
      .config("spark.sql.adaptive.skewJoin.enabled", "true") // Tự động chia nhỏ partition bị skew
      .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
      .getOrCreate()

    import spark.implicits._

    try {
      runJob(spark, config)
      logger.info("Spark Batch Job hoàn tất thành công 100%!")
    } catch {
      case e: Throwable =>
        logger.error(s"Spark Job gặp sự cố nghiêm trọng: ${e.getMessage}", e)
        sys.exit(1)
    } finally {
      spark.stop()
    }
  }

  def runJob(spark: SparkSession, config: SparkJobConfig): Unit = {
    import spark.implicits._

    // =========================================================================
    // BƯỚC 1: ĐỌC DỮ LIỆU ĐỒ THỊ BẠN BÈ VÀ CHUẨN HÓA 2 CHIỀU
    // =========================================================================
    logger.info(s"Đang đọc dữ liệu cạnh bạn bè từ: ${config.inputEdgesPath}")

    // Hỗ trợ cả file CSV (user, friend) và Parquet
    val rawEdges: DataFrame = if (config.inputEdgesPath.endsWith(".parquet")) {
      spark.read.parquet(config.inputEdgesPath)
    } else {
      spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .csv(config.inputEdgesPath)
    }

    val parsedEdges = rawEdges
      .select(
        col("user").cast("long").as("u"),
        col("friend").cast("long").as("v")
      )
      .filter(col("u").isNotNull && col("v").isNotNull && col("u") =!= col("v"))

    // Quan hệ bạn bè là vô hướng (Undirected Graph).
    // Đảm bảo mỗi quan hệ (u, v) đều có cạnh ngược (v, u).
    val undirectedEdges = parsedEdges
      .union(parsedEdges.select(col("v").as("u"), col("u").as("v")))
      .distinct()
      .cache() // Cache đồ thị vì sẽ được sử dụng nhiều lần

    val totalEdgesCount = undirectedEdges.count()
    logger.info(s"Tổng số cạnh vô hướng đã nạp: $totalEdgesCount")

    // =========================================================================
    // BƯỚC 2: TÍNH BẬC KẾT NỐI (DEGREE) VÀ LỌC CẦU NỐI (PRUNING)
    // =========================================================================
    // Tính bậc (degree) của từng đỉnh: degree(B) = số lượng bạn bè của B
    val nodeDegrees = undirectedEdges
      .groupBy("u")
      .agg(count("v").as("degree"))
      .select(col("u").as("node_id"), col("degree"))

    // Lọc bỏ Super-nodes (KOLs) và Leaf-nodes khỏi vai trò làm cầu nối:
    // minDegree = 2 (tối thiểu 2 bạn để nối 2 người khác nhau)
    // maxDegree = 1000 (loại trừ tài khoản có trên 1000 bạn để chống bùng nổ phép tính OOM)
    // Trọng số cầu nối Adamic-Adar: W(B) = 1.0 / log(degree(B))
    val validBridges = nodeDegrees
      .filter(col("degree") >= config.minDegree && col("degree") <= config.maxDegree)
      .withColumn("bridge_weight", lit(1.0) / log(col("degree").cast("double")))
      .select(col("node_id").as("bridge_id"), col("bridge_weight"))

    logger.info(s"Số lượng bridge nodes hợp lệ sau khi cắt tỉa: ${validBridges.count()}")

    // =========================================================================
    // BƯỚC 3: GẮN TRỌNG SỐ VÀO CÁC CẠNH (EDGE-BRIDGE JOIN)
    // =========================================================================
    // Cặp (user_A -> bridge_B) đi kèm trọng số bridge_weight của B
    val edgesWithWeight = undirectedEdges
      .join(validBridges, undirectedEdges("v") === validBridges("bridge_id"), "inner")
      .select(
        col("u").as("user_A"),
        col("bridge_id"),
        col("bridge_weight")
      )

    // =========================================================================
    // BƯỚC 4: TỐI ƯU HÓA SELF-JOIN (UNIDIRECTIONAL JOIN: user_A < user_C)
    // =========================================================================
    // Hai người A và C có chung cầu nối B.
    // ĐIỀU KIỆN TỐI ƯU: e1.user_A < e2.user_A
    // -> Giảm 50% số dòng trung gian, tiết kiệm 50% băng thông Shuffle network và RAM!
    val candidatePairs = edgesWithWeight.as("e1")
      .join(
        edgesWithWeight.as("e2"),
        col("e1.bridge_id") === col("e2.bridge_id") && col("e1.user_A") < col("e2.user_A"),
        "inner"
      )
      .select(
        col("e1.user_A").as("user_A"),
        col("e2.user_A").as("user_C"),
        col("e1.bridge_weight").as("weight")
      )

    // Tính tổng điểm Adamic-Adar cho từng cặp (user_A, user_C)
    val scoredPairs = candidatePairs
      .groupBy("user_A", "user_C")
      .agg(sum("weight").as("raw_score"))

    // =========================================================================
    // BƯỚC 5: LOẠI BỎ CÁC CẶP ĐÃ LÀ BẠN BÈ HIỆN TẠI (LEFT ANTI JOIN)
    // =========================================================================
    // Chuẩn hóa bảng bạn bè hiện có theo quy ước user_A < user_C
    val existingFriendPairs = undirectedEdges
      .filter(col("u") < col("v"))
      .select(col("u").as("user_A"), col("v").as("user_C"))

    // Phép Left-Anti Join loại bỏ tất cả các cặp đã tồn tại trong đồ thị bạn bè
    val nonFriendRecommendations = scoredPairs
      .join(existingFriendPairs, Seq("user_A", "user_C"), "left_anti")

    // =========================================================================
    // BƯỚC 6: NHÂN ĐÔI CHIỀU ĐỀ XUẤT VÀ LẤY TOP K CHO MỖI USER
    // =========================================================================
    // Vì tính toán trên A < C, ta phát sinh đề xuất 2 chiều đối xứng:
    // A được gợi ý C (score) VÀ C được gợi ý A (score)
    val bidirectionalRecs = nonFriendRecommendations
      .select(col("user_A").as("user_id"), col("user_C").as("candidate_id"), col("raw_score").as("score"))
      .union(
        nonFriendRecommendations
          .select(col("user_C").as("user_id"), col("user_A").as("candidate_id"), col("raw_score").as("score"))
      )

    // Xếp hạng bằng Window Function: Lấy Top K ứng viên có điểm cao nhất cho từng người dùng
    val windowSpec = Window
      .partitionBy("user_id")
      .orderBy(col("score").desc)

    val topKRecommendations = bidirectionalRecs
      .withColumn("rank", row_number().over(windowSpec))
      .filter(col("rank") <= config.topK)
      .select("user_id", "candidate_id", "score")

    // =========================================================================
    // BƯỚC 7: XUẤT DỮ LIỆU XUỐNG REDIS PIPELINE
    // =========================================================================
    logger.info(s"Đang ghi kết quả gợi ý (Top ${config.topK}) vào Redis tại ${config.redisHost}:${config.redisPort}...")

    // Ghi song song qua từng Partition để tối đa hóa thông lượng mạng
    topKRecommendations.foreachPartition { partition: Iterator[org.apache.spark.sql.Row] =>
      RedisPipelineSink.writePartition(partition, config, batchSize = 1000)
    }

    undirectedEdges.unpersist()
    logger.info("Ghi dữ liệu xuống Redis hoàn tất thành công.")
  }
}

