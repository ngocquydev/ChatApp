#!/usr/bin/env python3
"""
=============================================================================
MOCK DATA GENERATOR FOR LAMBDA FRIEND RECOMMENDATION SYSTEM
=============================================================================
Tạo 1.000 users và 10.000 cạnh bạn bè tuân theo phân phối mạng xã hội thực tế
(Power-Law / Barabási–Albert Network):
1. Có các cụm bạn bè đông đúc (triangles & diamonds).
2. Có Super-nodes / KOLs (để kiểm thử tính năng Pruning chống OOM của Spark).
3. Có nhóm Cold-Start Users (0 bạn bè, có tọa độ GPS và sở thích) để kiểm thử
   cơ chế Fallback (Geo-Proximity 10km + Matching Interests).
4. Xuất file:
   - data/edges.csv (cho Spark Batch Job)
   - data/users.json (cho MongoDB)
   - data/mock_kafka_events.json (để test Speed Layer)
"""

import os
import json
import random
import csv
import math

NUM_USERS = 1000
TARGET_EDGES = 10000
COLD_START_USERS_COUNT = 50  # 50 users cuối cùng (951 - 1000) có 0 bạn bè

INTEREST_POOL = [
    "AI", "Machine Learning", "Data Engineering", "Cloud Computing",
    "Web Development", "Mobile App", "UI/UX Design", "Cybersecurity",
    "Blockchain", "DevOps", "Gaming", "Music", "Photography",
    "Travel", "Football", "Basketball", "Reading", "Startup"
]

# Tọa độ trung tâm Hà Nội: ~21.0285, 105.8542
BASE_LAT = 21.0285
BASE_LON = 105.8542

FIRST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"]
MIDDLE_NAMES = ["Văn", "Thị", "Hải", "Đức", "Thành", "Ngọc", "Minh", "Quốc", "Anh", "Hoàng", "Gia", "Thế", "Trọng"]
LAST_NAMES = ["Huy", "Qúy", "Nam", "Long", "Tùng", "Sơn", "Hùng", "Trang", "Linh", "Hương", "Hà", "Phương", "Tuấn", "Dũng", "Khánh"]

def generate_vietnamese_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(MIDDLE_NAMES)} {random.choice(LAST_NAMES)}"

def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)

    print(f"[*] Bắt đầu sinh {NUM_USERS} users...")

    users = []
    # 1. Sinh danh sách Users
    for uid in range(1, NUM_USERS + 1):
        # Tạo tọa độ ngẫu nhiên trong bán kính ~15km quanh Hà Nội
        # 1 độ vĩ độ ~ 111km -> 10km ~ 0.09 độ
        radius_offset = random.uniform(0.001, 0.12)
        angle = random.uniform(0, 2 * math.pi)
        lat = BASE_LAT + radius_offset * math.sin(angle)
        lon = BASE_LON + radius_offset * math.cos(angle)

        num_interests = random.randint(2, 5)
        user_interests = random.sample(INTEREST_POOL, num_interests)

        user_doc = {
            "_id": uid,
            "name": generate_vietnamese_name(),
            "email": f"user{uid}@chatapp.io",
            "avatar": f"https://api.dicebear.com/7.x/adventurer/svg?seed=user_{uid}",
            "bio": f"Xin chào, tôi là thành viên #{uid}. Rất vui được kết nối!",
            "interests": user_interests,
            "location": {
                "type": "Point",
                "coordinates": [round(lon, 6), round(lat, 6)] # [longitude, latitude]
            },
            "isDeleted": False
        }
        users.append(user_doc)

    # 2. Sinh mạng lưới bạn bè theo mô hình Ưu tiên Kết nối (Preferential Attachment)
    # Nhóm Cold-start (951 -> 1000) sẽ không được thêm cạnh nào
    active_users = list(range(1, NUM_USERS - COLD_START_USERS_COUNT + 1))
    edges_set = set()

    # Tạo trước mạng lưới lõi (Seed graph: 10 node đầu tiên kết nối đầy đủ)
    seed_nodes = active_users[:10]
    for i in range(len(seed_nodes)):
        for j in range(i + 1, len(seed_nodes)):
            u, v = seed_nodes[i], seed_nodes[j]
            edges_set.add((min(u, v), max(u, v)))

    # Tạo một Super-node / KOL đặc biệt (Node 1) để kiểm tra Pruning của Spark
    kol_node = 1
    for target in active_users[1:1050 if len(active_users) > 1050 else len(active_users)]:
        if target != kol_node:
            edges_set.add((min(kol_node, target), max(kol_node, target)))

    # Phân phối Barabási–Albert cho các node còn lại
    node_degrees = {u: 0 for u in active_users}
    for u, v in edges_set:
        node_degrees[u] += 1
        node_degrees[v] += 1

    pool = []
    for u, deg in node_degrees.items():
        pool.extend([u] * deg)

    while len(edges_set) < TARGET_EDGES:
        u = random.choice(active_users)
        if pool and random.random() < 0.7:
            v = random.choice(pool)
        else:
            v = random.choice(active_users)

        if u != v:
            edge = (min(u, v), max(u, v))
            if edge not in edges_set:
                edges_set.add(edge)
                pool.append(u)
                pool.append(v)
                node_degrees[u] += 1
                node_degrees[v] += 1

    print(f"[*] Đã sinh {len(edges_set)} cạnh bạn bè hợp lệ!")
    print(f"[*] Bậc của Super-Node 1: {node_degrees.get(1, 0)} bạn bè (KOL Node)")

    # 3. Xuất file CSV edges cho Spark
    edges_csv_path = os.path.join(data_dir, "edges.csv")
    with open(edges_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["user", "friend"])
        for u, v in sorted(edges_set):
            writer.writerow([u, v])
            writer.writerow([v, u]) # Ghi cả 2 chiều

    print(f"[+] File edges đã lưu tại: {edges_csv_path}")

    # 4. Xuất file JSON users cho MongoDB
    users_json_path = os.path.join(data_dir, "users.json")
    with open(users_json_path, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

    print(f"[+] File users đã lưu tại: {users_json_path}")

    # 5. Sinh Mock Kafka Events cho Speed Layer
    events = [
        {"eventType": "FRIEND_ACCEPTED", "userA": 960, "userB": 961, "timestamp": 1720000000000},
        {"eventType": "FRIEND_ACCEPTED", "userA": 960, "userB": 962, "timestamp": 1720000001000},
        {"eventType": "FRIEND_ACCEPTED", "userA": 961, "userB": 963, "timestamp": 1720000002000},
        {"eventType": "FRIEND_ACCEPTED", "userA": 5, "userB": 25, "timestamp": 1720000003000},
        {"eventType": "FRIEND_ACCEPTED", "userA": 12, "userB": 48, "timestamp": 1720000004000}
    ]
    events_json_path = os.path.join(data_dir, "mock_kafka_events.json")
    with open(events_json_path, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"[+] File sample Kafka events đã lưu tại: {events_json_path}")
    print("\n[OK] Hoàn tất quá trình sinh Mock Data thành công 100%!")

if __name__ == "__main__":
    main()
