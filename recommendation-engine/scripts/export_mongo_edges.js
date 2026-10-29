/**
 * Script xuất đồ thị bạn bè từ MongoDB sang file edges.csv cho Apache Spark xử lý
 */
const mongoose = require('../../backend/node_modules/mongoose');
const fs = require('fs');
const path = require('path');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';
const outputPath = path.join(__dirname, '..', 'data', 'edges.csv');

async function exportEdges() {
  console.log(`[*] Kết nối tới MongoDB tại: ${mongoUri}`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    console.warn(`[!] Không kết nối được MongoDB: ${err.message}. Sử dụng dữ liệu mẫu sẵn có trong data/edges.csv`);
    return;
  }

  const db = mongoose.connection.db;
  const friendshipsCol = db.collection('friendships');
  const friendships = await friendshipsCol.find({ status: 'accepted' }).toArray();

  console.log(`[+] Tìm thấy ${friendships.length} quan hệ bạn bè chính thức trong MongoDB.`);

  const edgeSet = new Set();

  for (const f of friendships) {
    const u = f.requesterId ? f.requesterId.toString() : null;
    const v = f.recipientId ? f.recipientId.toString() : null;
    if (u && v && u !== v) {
      edgeSet.add(`${u},${v}`);
      edgeSet.add(`${v},${u}`);
    }
  }

  const outputLines = ['user,friend'];
  edgeSet.forEach((e) => outputLines.push(e));

  if (outputLines.length > 1) {
    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`[✓] Đã xuất thành công ${edgeSet.size} cạnh bạn bè ra: ${outputPath}`);
  } else {
    console.log('[i] Chưa có đủ quan hệ bạn bè trong DB. Giữ nguyên tệp edges.csv mẫu.');
  }

  await mongoose.disconnect();
}

exportEdges().catch((e) => {
  console.error('[!] Lỗi khi xuất đồ thị bạn bè:', e);
  process.exit(1);
});
