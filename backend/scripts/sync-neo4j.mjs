// backend/scripts/sync-neo4j.mjs
// Đồng bộ toàn bộ dữ liệu User và Friendship từ MongoDB sang Neo4j Graph Database
import neo4j from 'neo4j-driver';
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password123';

async function main() {
  console.log('🔄 [Neo4j Sync] Bắt đầu đồng bộ dữ liệu từ MongoDB sang Neo4j...');

  // 1. Kết nối MongoDB
  console.log(`📡 Kết nối MongoDB tại: ${MONGO_URI}`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db();

  // 2. Kết nối Neo4j
  console.log(`📡 Kết nối Neo4j tại: ${NEO4J_URI}`);
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
    encrypted: 'ENCRYPTION_OFF',
  });
  await driver.verifyConnectivity();
  const session = driver.session();

  try {
    // 3. Khởi tạo Unique Constraint trên Neo4j
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);

    // 4. Lấy danh sách Friendship đã kết bạn (status = accepted)
    const friendships = await db.collection('friendships').find({ status: 'accepted' }).toArray();
    console.log(`📋 Tìm thấy ${friendships.length} quan hệ bạn bè đã kết nối trong MongoDB.`);

    // Thu thập tất cả userId liên quan đến tình bạn
    const friendUserIds = new Set();
    for (const f of friendships) {
      if (f.requesterId) friendUserIds.add(f.requesterId.toString());
      if (f.recipientId) friendUserIds.add(f.recipientId.toString());
    }

    // 5. Lấy danh sách người dùng thật (không phải mock user hoặc có trong friendships)
    // Lấy tất cả user có id trong friendUserIds hoặc email không chứa @mock.chatapp.vn
    const objIds = Array.from(friendUserIds)
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const realUsers = await db
      .collection('users')
      .find({
        $or: [
          { _id: { $in: objIds } },
          { email: { $not: /@mock\.chatapp\.vn$/i } },
        ],
      })
      .project({ _id: 1, name: 1, email: 1, avatar: 1 })
      .toArray();

    console.log(`👥 Tìm thấy ${realUsers.length} người dùng thật cần đồng bộ vào Neo4j.`);

    // 6. Đồng bộ User Nodes vào Neo4j
    let syncedUsers = 0;
    for (const user of realUsers) {
      await session.run(
        `
        MERGE (u:User {id: $id})
        SET u.name = $name,
            u.email = $email,
            u.avatar = $avatar
        `,
        {
          id: user._id.toString(),
          name: user.name || 'Người dùng',
          email: user.email || '',
          avatar: user.avatar || '',
        },
      );
      syncedUsers++;
    }
    console.log(`✅ Đã đồng bộ ${syncedUsers} nút User vào Neo4j.`);

    // 7. Đồng bộ Relationships [:FRIEND] vào Neo4j
    let syncedRels = 0;
    for (const f of friendships) {
      const u1 = f.requesterId.toString();
      const u2 = f.recipientId.toString();

      await session.run(
        `
        MERGE (u1:User {id: $u1})
        MERGE (u2:User {id: $u2})
        MERGE (u1)-[:FRIEND]-(u2)
        `,
        { u1, u2 },
      );
      syncedRels++;
    }
    console.log(`✅ Đã đồng bộ ${syncedRels} quan hệ [:FRIEND] vào Neo4j.`);

    // 8. Đếm tổng kết trên Neo4j
    const countNodesRes = await session.run('MATCH (n:User) RETURN count(n) AS total');
    const countRelsRes = await session.run('MATCH ()-[r:FRIEND]->() RETURN count(r) AS total');

    const totalNodes = countNodesRes.records[0].get('total').toInt();
    const totalRels = countRelsRes.records[0].get('total').toInt();

    console.log('\n📊 THỐNG KÊ HIỆN TẠI TRONG NEO4J:');
    console.log(`   - Tổng số Nodes (User): ${totalNodes}`);
    console.log(`   - Tổng số Relationships ([:FRIEND]): ${totalRels}`);
    console.log('\n🎉 Hoàn tất đồng bộ dữ liệu MongoDB -> Neo4j thành công!');
  } finally {
    await session.close();
    await driver.close();
    await mongoClient.close();
  }
}

main().catch((err) => {
  console.error('❌ Lỗi khi đồng bộ Neo4j:', err);
  process.exit(1);
});
