/**
 * =============================================================================
 * LOCAL RUNNER: ADAMIC-ADAR ALGORITHM ENGINE (STANDALONE / TESTING)
 * =============================================================================
 * Chạy giải thuật Adamic-Adar trực tiếp và nạp kết quả vào Redis Serving Cache:
 * 1. Đọc dữ liệu đồ thị bạn bè từ recommendation-engine/data/edges.csv.
 * 2. Cắt tỉa Bridge Nodes (degree >= 2 và degree <= 1000).
 * 3. Tính trọng số W(B) = 1.0 / log(degree(B)).
 * 4. Tính tổng điểm Adamic-Adar cho từng cặp chưa kết bạn.
 * 5. Ghi thẳng vào Redis Sorted Set: rec:user:{user_id} (Score = adamic_adar_score).
 */

const fs = require('fs');
const path = require('path');
const Redis = require('../../backend/node_modules/ioredis');

const edgesPath = path.join(__dirname, '..', 'data', 'edges.csv');
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const topK = 50;

async function runAdamicAdarLocal() {
  console.log('===============================================================');
  console.log('       ADAMIC-ADAR RECOMMENDATION COMPUTATION RUNNER           ');
  console.log('===============================================================\n');

  if (!fs.existsSync(edgesPath)) {
    console.error(`[!] Không tìm thấy tệp: ${edgesPath}. Hãy chạy export_mongo_edges.js hoặc generate_mock_data.js trước!`);
    process.exit(1);
  }

  const raw = fs.readFileSync(edgesPath, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    console.warn('[!] Tệp edges.csv chỉ có tiêu đề, không có cạnh nào.');
    return;
  }

  // 1. Nạp đồ thị vô hướng
  const adj = new Map(); // user -> Set(friends)

  function addEdge(u, v) {
    if (u === v) return;
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u).add(v);
    adj.get(v).add(u);
  }

  for (let i = 1; i < lines.length; i++) {
    const [u, v] = lines[i].split(',');
    if (u && v) addEdge(u, v);
  }

  console.log(`[+] Đã nạp đồ thị với ${adj.size} người dùng.`);

  // 2. Tính bậc (degree) & trọng số cầu nối W(B) = 1.0 / log(degree(B))
  const bridgeWeights = new Map();
  for (const [node, neighbors] of adj.entries()) {
    const deg = neighbors.size;
    if (deg >= 2 && deg <= 1000) {
      bridgeWeights.set(node, 1.0 / Math.log(deg));
    }
  }

  console.log(`[+] Số lượng bridge nodes hợp lệ (2 <= degree <= 1000): ${bridgeWeights.size}`);

  // 3. Tính điểm Adamic-Adar cho từng cặp người dùng chưa kết bạn
  // recommendations: userA -> Map(candidateC -> score)
  const recs = new Map();

  for (const [u, neighbors] of adj.entries()) {
    const candidates = new Map();

    for (const bridge of neighbors) {
      const weight = bridgeWeights.get(bridge);
      if (weight === undefined) continue;

      const fofs = adj.get(bridge);
      if (!fofs) continue;

      for (const candidate of fofs) {
        if (candidate === u) continue;
        if (neighbors.has(candidate)) continue; // Đã là bạn bè

        const currentScore = candidates.get(candidate) || 0;
        candidates.set(candidate, currentScore + weight);
      }
    }

    if (candidates.size > 0) {
      recs.set(u, candidates);
    }
  }

  console.log(`[+] Đã tính toán đề xuất cho ${recs.size} người dùng.`);

  // 4. Ghi kết quả vào Redis Sorted Set
  console.log(`[*] Đang kết nối tới Redis tại ${redisHost}:${redisPort}...`);
  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    lazyConnect: true,
  });

  await redis.connect();
  console.log('[✓] Đã kết nối Redis thành công.');

  const pipeline = redis.pipeline();
  let totalSaved = 0;

  for (const [userId, candidates] of recs.entries()) {
    const sorted = Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    const redisKey = `rec:user:${userId}`;
    pipeline.del(redisKey);

    for (const [candidateId, score] of sorted) {
      pipeline.zadd(redisKey, Math.round(score * 10000) / 10000, candidateId);
      totalSaved++;
    }

    pipeline.expire(redisKey, 86400 * 3); // TTL 3 ngày
  }

  await pipeline.exec();
  console.log(`[✓] Đã ghi thành công ${totalSaved} điểm gợi ý Adamic-Adar vào Redis!`);

  // Kiểm tra mẫu 1 key
  const sampleUserId = Array.from(recs.keys())[0];
  if (sampleUserId) {
    const sampleRecs = await redis.zrevrangebyscore(
      `rec:user:${sampleUserId}`,
      '+inf',
      '-inf',
      'WITHSCORES',
      'LIMIT',
      0,
      5,
    );
    console.log(`\n[*] Mẫu kết quả trong Redis cho User [${sampleUserId}] (key: rec:user:${sampleUserId}):`);
    for (let i = 0; i < sampleRecs.length; i += 2) {
      console.log(`    - Gợi ý: ${sampleRecs[i]} (Điểm Adamic-Adar: ${sampleRecs[i + 1]})`);
    }
  }

  await redis.quit();
  console.log('\n[✓] Hoàn tất luồng xử lý Adamic-Adar thành công 100%!');
}

runAdamicAdarLocal().catch((e) => {
  console.error('[!] Lỗi khi chạy Adamic-Adar runner:', e);
  process.exit(1);
});

