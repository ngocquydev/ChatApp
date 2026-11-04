import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from '../backend/node_modules/mongoose/index.js';
import neo4j from '../backend/node_modules/neo4j-driver/lib/index.js';

async function sync() {
  console.log('🔄 [Neo4j Sync] Đang kết nối tới MongoDB Atlas và Neo4j Aura...');

  const mongoUri = process.env.MONGODB_URI;
  const neo4jUri = process.env.NEO4J_URI;
  const neo4jUser = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const neo4jPass = process.env.NEO4J_PASSWORD;
  const neo4jDb = process.env.NEO4J_DATABASE;

  if (!mongoUri || !neo4jUri || !neo4jUser || !neo4jPass) {
    console.error('❌ Thiếu biến môi trường MONGODB_URI hoặc NEO4J_*');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName: 'chatapp' });
  console.log('✅ Đã kết nối MongoDB Atlas');

  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPass), {
    connectionAcquisitionTimeout: 10000,
  });
  await driver.verifyConnectivity();
  console.log('✅ Đã kết nối Neo4j Aura');

  const session = neo4jDb ? driver.session({ database: neo4jDb }) : driver.session();

  // 1. Tạo ràng buộc unique
  try {
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);
  } catch (err) {
    console.log('Schema constraint note:', err.message);
  }

  // 2. Đồng bộ người dùng
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log(`👤 Đang đồng bộ ${users.length} người dùng vào Neo4j...`);
  for (const u of users) {
    await session.run(
      `
      MERGE (usr:User {id: $id})
      SET usr.name = $name,
          usr.avatar = $avatar
      `,
      {
        id: u._id.toString(),
        name: u.name || '',
        avatar: u.avatar || '',
      },
    );
  }

  // 3. Đồng bộ mối quan hệ bạn bè đã chấp nhận
  const friendships = await mongoose.connection.db
    .collection('friendships')
    .find({ status: 'accepted' })
    .toArray();
  console.log(`🤝 Đang đồng bộ ${friendships.length} quan hệ bạn bè vào Neo4j...`);
  for (const f of friendships) {
    await session.run(
      `
      MERGE (u1:User {id: $u1})
      MERGE (u2:User {id: $u2})
      MERGE (u1)-[:FRIEND]-(u2)
      `,
      {
        u1: f.requesterId.toString(),
        u2: f.recipientId.toString(),
      },
    );
  }

  const countRes = await session.run('MATCH (u:User) RETURN count(u) AS count');
  const userCount = countRes.records[0].get('count').toInt();
  const relRes = await session.run('MATCH ()-[r:FRIEND]->() RETURN count(r) AS count');
  const relCount = relRes.records[0].get('count').toInt();

  console.log(`\n🎉 [Neo4j Sync] Hoàn tất!`);
  console.log(`   - Tổng số User nodes: ${userCount}`);
  console.log(`   - Tổng số FRIEND relationships: ${relCount}`);

  await session.close();
  await driver.close();
  await mongoose.disconnect();
  process.exit(0);
}

sync().catch((err) => {
  console.error('❌ Lỗi đồng bộ Neo4j:', err);
  process.exit(1);
});
