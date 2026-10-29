package com.chatapp.recommendation.sink

import com.chatapp.recommendation.config.SparkJobConfig
import org.apache.spark.sql.Row
import redis.clients.jedis.{Jedis, JedisPool, JedisPoolConfig}

import scala.util.control.NonFatal

/**
 * Sink ghi kết quả từ Spark Partition xuống Redis sử dụng Jedis Pipelining.
 *
 * Tối ưu hóa hiệu năng mạng:
 * 1. Sử dụng Connection Pool (JedisPool) tái sử dụng kết nối TCP giữa các tasks trên cùng 1 Executor JVM.
 * 2. Gom nhóm các lệnh ZADD vào một Pipeline duy nhất (batching 1.000 lệnh / lượt flush) để giảm Round-Trip Time (RTT)
 *    từ hàng trăm mili-giây xuống dưới 5ms.
 * 3. Tự động thiết lập thời gian sống (TTL) cho mỗi Key để tránh rác bộ nhớ Redis.
 */
object RedisPipelineSink extends Serializable {

  @transient private var jedisPool: JedisPool = _

  /**
   * Khởi tạo Singleton Connection Pool trên mỗi Spark Executor JVM.
   */
  private def getOrCreatePool(config: SparkJobConfig): JedisPool = {
    if (jedisPool == null) {
      synchronized {
        if (jedisPool == null) {
          val poolConfig = new JedisPoolConfig()
          poolConfig.setMaxTotal(32)
          poolConfig.setMaxIdle(16)
          poolConfig.setMinIdle(4)
          poolConfig.setTestOnBorrow(false)
          poolConfig.setTestWhileIdle(true)
          poolConfig.setTimeBetweenEvictionRunsMillis(30000)

          jedisPool = config.redisAuth match {
            case Some(password) if password.nonEmpty =>
              new JedisPool(poolConfig, config.redisHost, config.redisPort, 5000, password)
            case _ =>
              new JedisPool(poolConfig, config.redisHost, config.redisPort, 5000)
          }

          sys.addShutdownHook {
            if (jedisPool != null && !jedisPool.isClosed) {
              jedisPool.close()
            }
          }
        }
      }
    }
    jedisPool
  }

  /**
   * Ghi toàn bộ dữ liệu của một Spark Partition vào Redis.
   *
   * Schema của Row yêu cầu:
   * - user_id: Long
   * - candidate_id: Long
   * - score: Double
   */
  def writePartition(partition: Iterator[Row], config: SparkJobConfig, batchSize: Int = 1000): Unit = {
    if (!partition.hasNext) return

    val pool = getOrCreatePool(config)
    var jedis: Jedis = null

    try {
      jedis = pool.getResource
      var pipeline = jedis.pipelined()
      var count = 0
      val touchedKeys = scala.collection.mutable.Set[String]()

      partition.foreach { row =>
        val userId = row.getAs[Long]("user_id")
        val candidateId = row.getAs[Long]("candidate_id")
        val score = row.getAs[Double]("score")

        val redisKey = s"${config.redisKeyPrefix}$userId"
        pipeline.zadd(redisKey, score, candidateId.toString)
        touchedKeys.add(redisKey)

        count += 1
        if (count >= batchSize) {
          pipeline.sync()
          pipeline = jedis.pipelined()
          count = 0
        }
      }

      // Đặt TTL cho các key vừa cập nhật để bộ nhớ Redis tự động giải phóng dữ liệu cũ
      touchedKeys.foreach { key =>
        pipeline.expire(key, config.redisTtlSec.toLong)
      }

      // Flush các lệnh còn lại trong buffer
      if (count > 0 || touchedKeys.nonEmpty) {
        pipeline.sync()
      }
    } catch {
      case NonFatal(e) =>
        throw new RuntimeException(s"Lỗi khi ghi dữ liệu partition vào Redis (${config.redisHost}:${config.redisPort})", e)
    } finally {
      if (jedis != null) {
        jedis.close() // Trả kết nối về Pool
      }
    }
  }
}

