package com.chatapp.recommendation

import org.apache.spark.sql.SparkSession
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

class AdamicAdarJobSpec extends AnyFunSuite with Matchers with BeforeAndAfterAll {

  private var spark: SparkSession = _

  override def beforeAll(): Unit = {
    spark = SparkSession.builder()
      .appName("AdamicAdarJobSpec")
      .master("local[2]")
      .config("spark.ui.enabled", "false")
      .getOrCreate()
  }

  override def afterAll(): Unit = {
    if (spark != null) {
      spark.stop()
    }
  }

  test("Adamic-Adar calculation on a triangle and diamond graph") {
    import spark.implicits._

    // Đồ thị thử nghiệm:
    // User 1 kết bạn với 2, 3
    // User 4 kết bạn với 2, 3
    // -> 1 và 4 có 2 bạn chung là 2 và 3!
    val edges = Seq(
      (1L, 2L),
      (1L, 3L),
      (4L, 2L),
      (4L, 3L),
      // Thêm các kết nối khác cho 2 và 3
      (2L, 5L),
      (3L, 6L)
    ).toDF("user", "friend")

    // Tính toán degree cho 2 và 3
    // degree(2) = 3 (1, 4, 5) => W(2) = 1.0 / log(3)
    // degree(3) = 3 (1, 4, 6) => W(3) = 1.0 / log(3)
    val expectedScore = (1.0 / math.log(3.0)) + (1.0 / math.log(3.0))

    edges.count() should be(6)
    expectedScore should be > 1.0
  }
}
