#!/usr/bin/env python3
"""
=============================================================================
APACHE SPARK BATCH JOB: ADAMIC-ADAR FRIEND RECOMMENDATION (PYSPARK 3.5)
=============================================================================
Thuật toán Adamic-Adar Index (AA):
  W(B) = 1.0 / log(degree(B))
  AA(A, C) = sum_{B in N(A) cap N(C)} W(B)

Tối ưu hóa phân tán:
1. Cắt tỉa Bridge Nodes (KOLs / Super-nodes: degree > 1000) chống OOM & Skew.
2. Unidirectional Self-Join (user_A < user_C) giảm 50% chi phí Shuffle & RAM.
3. Left-Anti Join loại bỏ các cặp đã là bạn của nhau.
4. Window Ranking: Lấy Top K ứng viên điểm cao nhất cho mỗi user.
5. Ghi trực tiếp xuống Redis Sorted Set (rec:user:{id}).
"""

import sys
import math
import argparse
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, lit, count, sum as spark_sum, log as spark_log, row_number
from pyspark.sql.window import Window


def parse_args():
    parser = argparse.ArgumentParser(description="Spark Adamic-Adar Recommendation Batch Job")
    parser.add_argument("--input", default="/opt/spark-data/edges.csv", help="Đường dẫn tệp CSV quan hệ bạn bè")
    parser.add_argument("--redis-host", default="redis", help="Địa chỉ Redis host")
    parser.add_argument("--redis-port", type=int, default=6379, help="Cổng kết nối Redis")
    parser.add_argument("--redis-auth", default="", help="Mật khẩu Redis (nếu có)")
    parser.add_argument("--top-k", type=int, default=50, help="Số lượng gợi ý tối đa cho mỗi user")
    parser.add_argument("--min-degree", type=int, default=2, help="Bậc tối thiểu của cầu nối")
    parser.add_argument("--max-degree", type=int, default=1000, help="Bậc tối đa của cầu nối để tránh bùng nổ phép tính OOM")
    parser.add_argument("--ttl-sec", type=int, default=86400 * 3, help="Thời gian sống TTL của key trong Redis (giây)")
    return parser.parse_args()


def write_partition_to_redis(rows, redis_host, redis_port, redis_auth, ttl_sec):
    """
    Ghi dữ liệu từng partition vào Redis bằng socket TCP kết nối trực tiếp
    (Không phụ thuộc thư viện bên ngoài, chạy ngay trên bất kỳ container Spark nào).
    """
    import socket

    rows_list = list(rows)
    if not rows_list:
        return

    # Mở kết nối TCP tới Redis
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(10.0)
    try:
        s.connect((redis_host, redis_port))

        # Nếu có mật khẩu
        if redis_auth:
            cmd = f"*2\r\n$4\r\nAUTH\r\n${len(redis_auth)}\r\n{redis_auth}\r\n".encode("utf-8")
            s.sendall(cmd)
            s.recv(1024)

        touched_keys = set()
        buffer = bytearray()

        for r in rows_list:
            u_id = str(r["user_id"])
            c_id = str(r["candidate_id"])
            score_val = str(round(float(r["score"]), 4))

            key = f"rec:user:{u_id}"
            touched_keys.add(key)

            # Lệnh ZADD key score member
            # RESP protocol: *4\r\n$4\r\nZADD\r\n${len(key)}\r\n{key}\r\n${len(score_val)}\r\n{score_val}\r\n${len(c_id)}\r\n{c_id}\r\n
            cmd = (
                f"*4\r\n$4\r\nZADD\r\n"
                f"${len(key)}\r\n{key}\r\n"
                f"${len(score_val)}\r\n{score_val}\r\n"
                f"${len(c_id)}\r\n{c_id}\r\n"
            ).encode("utf-8")
            buffer.extend(cmd)

            if len(buffer) >= 65536:
                s.sendall(buffer)
                buffer = bytearray()

        # Đặt TTL cho các key đã cập nhật
        for k in touched_keys:
            ttl_str = str(ttl_sec)
            cmd = (
                f"*3\r\n$6\r\nEXPIRE\r\n"
                f"${len(k)}\r\n{k}\r\n"
                f"${len(ttl_str)}\r\n{ttl_str}\r\n"
            ).encode("utf-8")
            buffer.extend(cmd)

        if buffer:
            s.sendall(buffer)

    except Exception as e:
        print(f"[!] Lỗi khi ghi partition xuống Redis ({redis_host}:{redis_port}): {e}", file=sys.stderr)
        raise e
    finally:
        s.close()


def main():
    args = parse_args()
    print(f"[*] Khởi động Apache Spark Adamic-Adar Recommendation Batch Job...")
    print(f"    Input: {args.input}")
    print(f"    Redis: {args.redis_host}:{args.redis_port}")
    print(f"    Top-K: {args.top_k} | Bridge degree filter: [{args.min_degree} - {args.max_degree}]")

    spark = (
        SparkSession.builder
        .appName("AdamicAdarBatchRecommendationPy")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
        .config("spark.sql.adaptive.skewJoin.enabled", "true")
        .getOrCreate()
    )

    # 1. Đọc dữ liệu đồ thị bạn bè (Hỗ trợ cả ID dạng số và MongoDB ObjectId)
    raw_df = spark.read.option("header", "true").csv(args.input)
    parsed_edges = (
        raw_df.select(
            col("user").cast("string").alias("u"),
            col("friend").cast("string").alias("v"),
        )
        .filter(col("u").isNotNull() & col("v").isNotNull() & (col("u") != col("v")))
    )

    # Đồ thị bạn bè vô hướng (Undirected)
    undirected = (
        parsed_edges
        .union(parsed_edges.select(col("v").alias("u"), col("u").alias("v")))
        .distinct()
        .cache()
    )

    total_edges = undirected.count()
    print(f"[+] Tổng số cạnh vô hướng đã nạp: {total_edges}")

    # 2. Tính bậc kết nối (degree) và lọc cầu nối (Pruning KOLs)
    node_degrees = (
        undirected
        .groupBy("u")
        .agg(count("v").alias("degree"))
        .select(col("u").alias("node_id"), col("degree"))
    )

    valid_bridges = (
        node_degrees
        .filter((col("degree") >= args.min_degree) & (col("degree") <= args.max_degree))
        .withColumn("bridge_weight", lit(1.0) / spark_log(col("degree").cast("double")))
        .select(col("node_id").alias("bridge_id"), col("bridge_weight"))
    )

    bridge_count = valid_bridges.count()
    print(f"[+] Số lượng Bridge Nodes hợp lệ sau khi cắt tỉa: {bridge_count}")

    # 3. Gắn trọng số cầu nối vào các cạnh (user_A -> bridge_B)
    edges_with_weight = (
        undirected
        .join(valid_bridges, undirected["v"] == valid_bridges["bridge_id"], "inner")
        .select(
            col("u").alias("user_A"),
            col("bridge_id"),
            col("bridge_weight"),
        )
    )

    # 4. Tối ưu Self-Join 1 chiều: user_A < user_C
    candidate_pairs = (
        edges_with_weight.alias("e1")
        .join(
            edges_with_weight.alias("e2"),
            (col("e1.bridge_id") == col("e2.bridge_id")) & (col("e1.user_A") < col("e2.user_A")),
            "inner",
        )
        .select(
            col("e1.user_A").alias("user_A"),
            col("e2.user_A").alias("user_C"),
            col("e1.bridge_weight").alias("weight"),
        )
    )

    # Tính tổng điểm Adamic-Adar cho từng cặp (user_A, user_C)
    scored_pairs = (
        candidate_pairs
        .groupBy("user_A", "user_C")
        .agg(spark_sum("weight").alias("raw_score"))
    )

    # 5. Left-Anti Join loại bỏ bạn bè đã kết bạn
    existing_friends = (
        undirected
        .filter(col("u") < col("v"))
        .select(col("u").alias("user_A"), col("v").alias("user_C"))
    )

    non_friends = scored_pairs.join(existing_friends, on=["user_A", "user_C"], how="left_anti")

    # 6. Nhân đôi chiều gợi ý và lấy Top K theo Window function
    bidirectional = (
        non_friends.select(col("user_A").alias("user_id"), col("user_C").alias("candidate_id"), col("raw_score").alias("score"))
        .union(
            non_friends.select(col("user_C").alias("user_id"), col("user_A").alias("candidate_id"), col("raw_score").alias("score"))
        )
    )

    window_spec = Window.partitionBy("user_id").orderBy(col("score").desc())
    top_k = (
        bidirectional
        .withColumn("rank", row_number().over(window_spec))
        .filter(col("rank") <= args.top_k)
        .select("user_id", "candidate_id", "score")
    )

    print(f"[*] Đang xuất kết quả gợi ý vào Redis...")
    host = args.redis_host
    port = args.redis_port
    auth = args.redis_auth
    ttl = args.ttl_sec

    # 7. Ghi phân tán theo partition
    top_k.foreachPartition(lambda p: write_partition_to_redis(p, host, port, auth, ttl))

    undirected.unpersist()
    print("[✓] Spark Batch Job hoàn tất thành công 100%!")
    spark.stop()


if __name__ == "__main__":
    main()

