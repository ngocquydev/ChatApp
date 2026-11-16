#!/usr/bin/env node

/**
 * backend/scripts/reset-database.mjs — Script reset dữ liệu an toàn cho ChatApp (MongoDB, Redis, Neo4j)
 *
 * Tuân thủ quy tắc AGENTS.md:
 * - Dùng `deleteMany({})`, KHÔNG drop database để giữ nguyên toàn bộ index & schema.
 * - Khởi tạo tài khoản Super Admin mặc định: admin@chatapp.internal / Password123@
 * - Khởi tạo tài khoản Aura AI Bot: aura.bot@chatapp.internal
 * - Khôi phục cấu hình bảo mật WAF mặc định.
 * - Xóa sạch cache/token trên Redis (FLUSHDB).
 * - Làm sạch đồ thị Neo4j (DETACH DELETE) và đồng bộ lại 2 node cốt lõi.
 */

import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp biến môi trường từ .env.local gốc hoặc apps/server/.env.local
dotenv.config({
  path: [
    path.resolve(__dirname, '../../../.env.local'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
  ],
});

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'chatapp';
const REDIS_URL = process.env.REDIS_URL;
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE;

const AURA_BOT_ID = '666666666666666666666666';
const ADMIN_ID = '6ae733855778db757433d16a';
const DEFAULT_PASSWORD = 'Password123@';

async function main() {
  console.log('====================================================');
  console.log('🚀 [Database Reset] Bắt đầu quá trình thiết lập lại dữ liệu...');
  console.log('🕒 Thời gian:', new Date().toLocaleString('vi-VN'));
  console.log('====================================================');

  // ----------------------------------------------------
  // BƯỚC 1: RESET MONGODB ATLAS
  // ----------------------------------------------------
  console.log('\n[1/3] 🍃 Đang kết nối tới MongoDB Atlas...');
  if (!MONGODB_URI) {
    throw new Error('Thiếu MONGODB_URI trong file backend/.env');
  }

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  const db = mongoose.connection.db;
  console.log(`✅ Kết nối thành công CSDL: ${MONGODB_DB_NAME}`);

  const collections = await db.listCollections().toArray();
  console.log(`📦 Tìm thấy ${collections.length} collections. Bắt đầu dọn dẹp bằng deleteMany({})...`);

  for (const col of collections) {
    const colName = col.name;
    const res = await db.collection(colName).deleteMany({});
    console.log(`   - [XÓA] ${colName}: đã xóa ${res.deletedCount} tài liệu`);
  }

  console.log('\n🌱 [MongoDB] Khởi tạo tài khoản cốt lõi và cấu hình hệ thống:');

  // 1. Tạo Aura AI Bot
  const auraBotDoc = {
    _id: new mongoose.Types.ObjectId(AURA_BOT_ID),
    name: 'Aura AI',
    email: 'aura.bot@chatapp.internal',
    role: 'bot',
    avatar: '/assets/avatars/aura-bot.png',
    bio: 'Trợ lý AI thông minh tích hợp Llama 3.3 (Groq) (@aura)',
    isDeleted: false,
    isBan: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('users').insertOne(auraBotDoc);
  console.log('   ✅ Đã tạo tài khoản bot: Aura AI (aura.bot@chatapp.internal)');

  // 2. Tạo Super Admin
  const adminPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const adminDoc = {
    _id: new mongoose.Types.ObjectId(ADMIN_ID),
    name: 'System Super Admin',
    email: 'admin@chatapp.internal',
    password: adminPasswordHash,
    role: 'admin',
    isDeleted: false,
    isBan: false,
    phone: '0901234567',
    avatar: '',
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('users').insertOne(adminDoc);
  console.log(`   ✅ Đã tạo tài khoản quản trị: System Super Admin (admin@chatapp.internal / ${DEFAULT_PASSWORD})`);

  // 3. Khôi phục cấu hình bảo mật WAF toàn cục
  const wafSettingsDoc = {
    key: 'global',
    allowedCountries: ['VN'],
    blockBadUserAgents: true,
    blockScanners: true,
    challengeForeignAuth: true,
    enabled: true,
    ipAllowlist: [],
    ipBlocklist: [],
    underAttack: false,
    updatedBy: ADMIN_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('waf_settings').insertOne(wafSettingsDoc);
  console.log('   ✅ Đã khôi phục cấu hình WAF bảo mật mặc định (waf_settings)');

  await mongoose.disconnect();
  console.log('🍃 [MongoDB] Đã hoàn tất và đóng kết nối an toàn.');

  // ----------------------------------------------------
  // BƯỚC 2: RESET REDIS (CACHE & TOKENS)
  // ----------------------------------------------------
  console.log('\n[2/3] ⚡ Đang kết nối tới Upstash Redis...');
  if (REDIS_URL) {
    try {
      const redis = new Redis(REDIS_URL);
      const keysBefore = await redis.dbsize();
      console.log(`   - Số lượng keys trước khi xóa: ${keysBefore}`);
      await redis.flushdb();
      console.log('   ✅ Đã thực thi FLUSHDB: Xóa sạch toàn bộ cache và blacklist tokens trên Redis');
      await redis.quit();
    } catch (err) {
      console.warn('   ⚠️ Không thể kết nối Redis để FLUSHDB:', err.message);
    }
  } else {
    console.log('   ℹ️ Bỏ qua Redis (không tìm thấy REDIS_URL)');
  }

  // ----------------------------------------------------
  // BƯỚC 3: RESET NEO4J AURA GRAPH DATABASE
  // ----------------------------------------------------
  console.log('\n[3/3] 🕸️ Đang kết nối tới Neo4j Aura...');
  if (NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD) {
    let driver;
    try {
      driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
        connectionAcquisitionTimeout: 10000,
      });
      await driver.verifyConnectivity();
      console.log('   ✅ Kết nối thành công Neo4j Aura');

      const session = NEO4J_DATABASE ? driver.session({ database: NEO4J_DATABASE }) : driver.session();

      // Xóa toàn bộ nodes và relations
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('   ✅ Đã thực thi DETACH DELETE: Xóa sạch toàn bộ node và quan hệ đồ thị');

      // Đảm bảo ràng buộc unique
      try {
        await session.run(`
          CREATE CONSTRAINT user_id_unique IF NOT EXISTS
          FOR (u:User) REQUIRE u.id IS UNIQUE
        `);
      } catch {
        // Schema constraint đã tồn tại
      }

      // Khởi tạo 2 node cốt lõi
      await session.run(
        `
        MERGE (a:User {id: $adminId})
        SET a.name = $adminName, a.role = 'admin'
        MERGE (b:User {id: $botId})
        SET b.name = $botName, b.role = 'bot'
        `,
        {
          adminId: ADMIN_ID,
          adminName: 'System Super Admin',
          botId: AURA_BOT_ID,
          botName: 'Aura AI',
        },
      );
      console.log('   ✅ Đã khởi tạo lại 2 node cốt lõi: System Super Admin & Aura AI trên Neo4j');

      await session.close();
      await driver.close();
    } catch (err) {
      console.warn('   ⚠️ Không thể kết nối Neo4j:', err.message);
      if (driver) await driver.close();
    }
  } else {
    console.log('   ℹ️ Bỏ qua Neo4j (không đủ biến môi trường)');
  }

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC RESET VỀ TRẠNG THÁI MỚI TINH!');
  console.log('🔑 Thông tin đăng nhập Quản trị viên (Super Admin):');
  console.log('   - Email: admin@chatapp.internal');
  console.log(`   - Mật khẩu: ${DEFAULT_PASSWORD}`);
  console.log('🤖 Bot AI: Aura AI (aura.bot@chatapp.internal)');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ Lỗi khi reset database:', err);
  process.exit(1);
});
