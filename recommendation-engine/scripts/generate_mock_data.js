#!/usr/bin/env node
/**
 * =============================================================================
 * MOCK DATA GENERATOR FOR LAMBDA FRIEND RECOMMENDATION SYSTEM (NODE.JS)
 * =============================================================================
 * Tạo 1.000 users và 10.000 cạnh bạn bè tuân theo phân phối mạng xã hội thực tế
 * (Power-Law / Barabási–Albert Network):
 * 1. Có các cụm bạn bè đông đúc (triangles & diamonds).
 * 2. Có Super-nodes / KOLs (Node 1) để kiểm thử tính năng Pruning chống OOM của Spark.
 * 3. Có nhóm Cold-Start Users (951-1000: 0 bạn bè, có tọa độ GPS & sở thích) để kiểm thử
 *    cơ chế Fallback (Geo-Proximity 10km + Matching Interests).
 * 4. Xuất file:
 *    - data/edges.csv (cho Spark Batch Job)
 *    - data/users.json (cho MongoDB)
 *    - data/mock_kafka_events.json (để test Speed Layer)
 */

const fs = require('fs');
const path = require('path');

const NUM_USERS = 1000;
const TARGET_EDGES = 10000;
const COLD_START_USERS_COUNT = 50; // Users 951 -> 1000 là Cold-Start (0 bạn bè)

const INTEREST_POOL = [
  'AI', 'Machine Learning', 'Data Engineering', 'Cloud Computing',
  'Web Development', 'Mobile App', 'UI/UX Design', 'Cybersecurity',
  'Blockchain', 'DevOps', 'Gaming', 'Music', 'Photography',
  'Travel', 'Football', 'Basketball', 'Reading', 'Startup'
];

const BASE_LAT = 21.0285;
const BASE_LON = 105.8542;

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Hải', 'Đức', 'Thành', 'Ngọc', 'Minh', 'Quốc', 'Anh', 'Hoàng', 'Gia', 'Thế', 'Trọng'];
const LAST_NAMES = ['Huy', 'Qúy', 'Nam', 'Long', 'Tùng', 'Sơn', 'Hùng', 'Trang', 'Linh', 'Hương', 'Hà', 'Phương', 'Tuấn', 'Dũng', 'Khánh'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample(arr, k) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, k);
}

function generateVietnameseName() {
  return `${randomChoice(FIRST_NAMES)} ${randomChoice(MIDDLE_NAMES)} ${randomChoice(LAST_NAMES)}`;
}

function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`[*] Bắt đầu sinh ${NUM_USERS} users...`);

  const users = [];
  for (let uid = 1; uid <= NUM_USERS; uid++) {
    const radiusOffset = 0.001 + Math.random() * 0.11; // ~10-12km bán kính
    const angle = Math.random() * 2 * Math.PI;
    const lat = BASE_LAT + radiusOffset * Math.sin(angle);
    const lon = BASE_LON + radiusOffset * Math.cos(angle);

    const numInterests = 2 + Math.floor(Math.random() * 4);
    const userInterests = sample(INTEREST_POOL, numInterests);

    users.push({
      _id: uid,
      name: generateVietnameseName(),
      email: `user${uid}@chatapp.io`,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=user_${uid}`,
      bio: `Xin chào, tôi là thành viên #${uid}. Rất vui được kết nối!`,
      interests: userInterests,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lon.toFixed(6)), parseFloat(lat.toFixed(6))]
      },
      isDeleted: false
    });
  }

  // Mạng xã hội bạn bè (Users 1 -> 950)
  const activeUsers = [];
  for (let i = 1; i <= NUM_USERS - COLD_START_USERS_COUNT; i++) {
    activeUsers.push(i);
  }

  const edgesMap = new Map(); // key: "min:max" -> true

  const addEdge = (u, v) => {
    if (u === v) return false;
    const min = Math.min(u, v);
    const max = Math.max(u, v);
    const key = `${min}:${max}`;
    if (!edgesMap.has(key)) {
      edgesMap.set(key, [min, max]);
      return true;
    }
    return false;
  };

  // 1. Tạo Seed Graph (10 node đầu liên kết mạng lưới)
  const seedNodes = activeUsers.slice(0, 10);
  for (let i = 0; i < seedNodes.length; i++) {
    for (let j = i + 1; j < seedNodes.length; j++) {
      addEdge(seedNodes[i], seedNodes[j]);
    }
  }

  // 2. Tạo Super-Node (Node 1) có nhiều bạn bè (> 900 bạn bè) để test KOL Pruning
  const kolNode = 1;
  for (let target = 2; target <= 950; target++) {
    addEdge(kolNode, target);
  }

  // 3. Phân phối Barabási-Albert cho các cạnh còn lại
  const degreeMap = new Map();
  for (const u of activeUsers) degreeMap.set(u, 0);
  for (const [u, v] of edgesMap.values()) {
    degreeMap.set(u, (degreeMap.get(u) || 0) + 1);
    degreeMap.set(v, (degreeMap.get(v) || 0) + 1);
  }

  const pool = [];
  for (const [u, deg] of degreeMap.entries()) {
    for (let d = 0; d < deg; d++) pool.push(u);
  }

  while (edgesMap.size < TARGET_EDGES) {
    const u = randomChoice(activeUsers);
    let v;
    if (pool.length > 0 && Math.random() < 0.65) {
      v = randomChoice(pool);
    } else {
      v = randomChoice(activeUsers);
    }

    if (u !== v && addEdge(u, v)) {
      pool.push(u, v);
      degreeMap.set(u, (degreeMap.get(u) || 0) + 1);
      degreeMap.set(v, (degreeMap.get(v) || 0) + 1);
    }
  }

  console.log(`[*] Đã sinh ${edgesMap.size} cạnh bạn bè hợp lệ!`);
  console.log(`[*] Bậc của Super-Node 1: ${degreeMap.get(1)} bạn bè (KOL Node để test Pruning)`);

  // Xuất file CSV edges cho Spark
  const edgesCsvPath = path.join(dataDir, 'edges.csv');
  let csvContent = 'user,friend\n';
  for (const [u, v] of edgesMap.values()) {
    csvContent += `${u},${v}\n`;
    csvContent += `${v},${u}\n`; // 2 chiều
  }
  fs.writeFileSync(edgesCsvPath, csvContent, 'utf-8');
  console.log(`[+] File edges đã lưu tại: ${edgesCsvPath}`);

  // Xuất file JSON users cho MongoDB
  const usersJsonPath = path.join(dataDir, 'users.json');
  fs.writeFileSync(usersJsonPath, JSON.stringify(users, null, 2), 'utf-8');
  console.log(`[+] File users đã lưu tại: ${usersJsonPath}`);

  // Xuất file mẫu Kafka Events
  const events = [
    { eventType: 'FRIEND_ACCEPTED', userA: 960, userB: 961, timestamp: 1720000000000 },
    { eventType: 'FRIEND_ACCEPTED', userA: 960, userB: 962, timestamp: 1720000001000 },
    { eventType: 'FRIEND_ACCEPTED', userA: 961, userB: 963, timestamp: 1720000002000 },
    { eventType: 'FRIEND_ACCEPTED', userA: 5, userB: 25, timestamp: 1720000003000 },
    { eventType: 'FRIEND_ACCEPTED', userA: 12, userB: 48, timestamp: 1720000004000 }
  ];
  const eventsJsonPath = path.join(dataDir, 'mock_kafka_events.json');
  fs.writeFileSync(eventsJsonPath, JSON.stringify(events, null, 2), 'utf-8');
  console.log(`[+] File sample Kafka events đã lưu tại: ${eventsJsonPath}`);

  console.log('\n[OK] Hoàn tất quá trình sinh Mock Data thành công 100%!');
}

main();
