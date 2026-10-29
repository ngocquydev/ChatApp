package com.chatapp.recommendation.config

import scopt.OParser

/**
 * Cấu hình tham số cho Spark Batch Adamic-Adar Recommendation Job.
 *
 * @param inputEdgesPath Đường dẫn file CSV/Parquet chứa quan hệ bạn bè (user_id, friend_id)
 * @param redisHost      Địa chỉ máy chủ Redis
 * @param redisPort      Cổng Redis
 * @param redisAuth      Mật khẩu Redis (nếu có)
 * @param redisKeyPrefix Tiền tố Key lưu trữ gợi ý (mặc định: "rec:user:")
 * @param minDegree      Ngưỡng bậc tối thiểu để xem xét làm cầu nối (mặc định: 2)
 * @param maxDegree      Ngưỡng bậc tối đa để loại bỏ Super-nodes / KOLs chống OOM & Skew (mặc định: 1000)
 * @param topK           Số lượng ứng viên đề xuất tối đa cho mỗi người dùng (mặc định: 50)
 * @param redisTtlSec    Thời gian sống (TTL) của bộ đệm gợi ý trên Redis tính bằng giây (mặc định: 3 ngày)
 */
case class SparkJobConfig(
    inputEdgesPath: String = "data/edges.csv",
    redisHost: String = "localhost",
    redisPort: Int = 6379,
    redisAuth: Option[String] = None,
    redisKeyPrefix: String = "rec:user:",
    minDegree: Int = 2,
    maxDegree: Int = 1000,
    topK: Int = 50,
    redisTtlSec: Int = 259200 // 3 ngày
)

object SparkJobConfig {
  def parse(args: Array[String]): Option[SparkJobConfig] = {
    val builder = OParser.builder[SparkJobConfig]
    val parser = {
      import builder._
      OParser.sequence(
        programName("AdamicAdarBatchJob"),
        head("Adamic-Adar Spark Recommendation Engine", "1.0.0"),
        opt[String]('i', "input")
          .action((x, c) => c.copy(inputEdgesPath = x))
          .text("Đường dẫn file edges (CSV/Parquet)"),
        opt[String]("redis-host")
          .action((x, c) => c.copy(redisHost = x))
          .text("Redis Host (mặc định: localhost)"),
        opt[Int]("redis-port")
          .action((x, c) => c.copy(redisPort = x))
          .text("Redis Port (mặc định: 6379)"),
        opt[String]("redis-auth")
          .action((x, c) => c.copy(redisAuth = Some(x)))
          .text("Redis Auth Password"),
        opt[String]("redis-prefix")
          .action((x, c) => c.copy(redisKeyPrefix = x))
          .text("Redis Key Prefix (mặc định: rec:user:)"),
        opt[Int]("min-degree")
          .action((x, c) => c.copy(minDegree = x))
          .text("Ngưỡng bậc tối thiểu để làm cầu nối (mặc định: 2)"),
        opt[Int]("max-degree")
          .action((x, c) => c.copy(maxDegree = x))
          .text("Ngưỡng bậc tối đa loại trừ super-node / KOLs (mặc định: 1000)"),
        opt[Int]("top-k")
          .action((x, c) => c.copy(topK = x))
          .text("Số lượng đề xuất cao nhất lưu vào Redis (mặc định: 50)"),
        opt[Int]("redis-ttl")
          .action((x, c) => c.copy(redisTtlSec = x))
          .text("Thời gian sống TTL trên Redis (giây)")
      )
    }

    OParser.parse(parser, args, SparkJobConfig())
  }
}

