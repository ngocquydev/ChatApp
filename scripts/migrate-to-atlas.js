import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from '../backend/node_modules/mongoose/index.js';

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/chatapp';
const ATLAS_URI = process.env.MONGODB_URI;

if (!ATLAS_URI) {
  console.error('❌ MONGODB_URI chưa được thiết lập trong biến môi trường!');
  process.exit(1);
}

async function migrate() {
  console.log('🔄 [Migration] Đang kết nối tới MongoDB Local và MongoDB Atlas...');

  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Đã kết nối Local MongoDB:', LOCAL_URI);

  const atlasConn = await mongoose.createConnection(ATLAS_URI, { dbName: 'chatapp' }).asPromise();
  console.log('✅ Đã kết nối MongoDB Atlas (Database: chatapp)');

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  const collections = await localDb.listCollections().toArray();
  console.log(`📋 Tìm thấy ${collections.length} collection tại Local.`);

  for (const col of collections) {
    const name = col.name;
    const localCollection = localDb.collection(name);
    const atlasCollection = atlasDb.collection(name);

    let filter = {};
    if (name === 'users') {
      // Bỏ dữ liệu người dùng ảo mock test
      filter = { email: { $not: /@mock\.chatapp\.vn/ } };
    }

    const docs = await localCollection.find(filter).toArray();
    console.log(`📦 Đang chuyển dữ liệu '${name}': ${docs.length} tài liệu...`);

    if (docs.length > 0) {
      const ids = docs.map((d) => d._id);
      await atlasCollection.deleteMany({ _id: { $in: ids } });
      await atlasCollection.insertMany(docs);
      console.log(`   ✔️ Đã chuyển thành công ${docs.length} tài liệu vào Atlas collection '${name}'.`);
    } else {
      console.log(`   ℹ️ Collection '${name}' rỗng.`);
    }

    try {
      const indexes = await localCollection.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const options = { name: idx.name };
        if (idx.unique) options.unique = true;
        if (idx.weights) {
          options.weights = idx.weights;
          if (idx.default_language) options.default_language = idx.default_language;
        }
        try {
          await atlasCollection.createIndex(idx.key, options);
          console.log(`   🔑 Đã tạo index trên Atlas: ${idx.name}`);
        } catch (err) {
          console.log(`   ⚠️ Index ${idx.name} đã tồn tại hoặc bỏ qua: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`   ⚠️ Không thể đọc index của ${name}: ${err.message}`);
    }
  }

  console.log('\n🎉 [Migration] Đã hoàn tất đồng bộ dữ liệu và cấu trúc index lên MongoDB Atlas!');
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Lỗi di chuyển dữ liệu:', err);
  process.exit(1);
});
