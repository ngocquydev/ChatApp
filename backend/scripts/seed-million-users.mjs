#!/usr/bin/env node

/**
 * Script nạp dữ liệu ảo (Seeder) số lượng lớn (1.000.000 tài khoản) vào MongoDB.
 *
 * Tối ưu hóa hiệu năng:
 * 1. Pre-hash password một lần duy nhất với Bcrypt -> tiết kiệm hàng chục giờ xử lý CPU.
 * 2. Streaming theo từng batch (mặc định 10.000 tài khoản/batch) -> không tràn RAM Node.js heap.
 * 3. Chèn trực tiếp qua collection.insertMany({ ordered: false }) của MongoDB driver -> đạt tốc độ 15.000 - 30.000 records/giây.
 * 4. Email định danh theo đuôi @mock.chatapp.vn -> an toàn, dễ dàng dọn dẹp khi cần với cờ --clean.
 *
 * Cách dùng:
 *   node scripts/seed-million-users.mjs                 # Mặc định nạp 1.000.000 users
 *   node scripts/seed-million-users.mjs --count 100000  # Nạp 100.000 users
 *   node scripts/seed-million-users.mjs --clean         # Xóa sạch các tài khoản ảo đã tạo
 *   node scripts/seed-million-users.mjs --info          # Xem thống kê số lượng tài khoản
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load biến môi trường từ backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
const MOCK_DOMAIN = 'mock.chatapp.vn';
const DEFAULT_PASSWORD = 'Password123@';

// Dữ liệu họ, chữ đệm và tên tiếng Việt thực tế
const LAST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ',
  'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đào', 'Đinh', 'Đoàn',
  'Lâm', 'Mai', 'Trịnh', 'Lương', 'Thái', 'Hà', 'Tạ', 'Chu', 'Phùng'
];

const MIDDLE_NAMES = [
  'Văn', 'Thị', 'Đức', 'Hữu', 'Ngọc', 'Minh', 'Thanh', 'Gia', 'Anh',
  'Bảo', 'Kim', 'Xuân', 'Hải', 'Tuấn', 'Quang', 'Hồng', 'Quốc', 'Trọng'
];

const FIRST_NAMES = [
  'Huy', 'Khang', 'Bảo', 'Minh', 'Phúc', 'Anh', 'Khoa', 'Phát', 'Đạt',
  'Thịnh', 'Nam', 'Trí', 'Dũng', 'Hùng', 'Linh', 'Trang', 'Hương', 'Mai',
  'Thảo', 'Vy', 'Yến', 'Lan', 'Quỳnh', 'Nhi', 'Hân', 'Châu', 'Tú', 'Ngân',
  'Hiền', 'Dung', 'Long', 'Cường', 'Sơn', 'Tùng', 'Việt', 'Bình', 'Hạnh'
];

const BIOS = [
  'Lập trình viên đam mê công nghệ và mã nguồn mở.',
  'Yêu thích cà phê, du lịch và nghe nhạc.',
  'Xin chào mọi người! Rất vui được kết nối.',
  'Luôn học hỏi mỗi ngày và hướng tới những điều tích cực.',
  'Designer & Tech enthusiast.',
  'Cuộc sống là những chuyến đi khám phá điều mới mẻ.',
  'Kết nối bạn bè, chia sẻ kinh nghiệm sống.',
  'Yêu mèo, thích đọc sách và khám phá ẩm thực.',
  'Đang học tập và làm việc tại TP. Hồ Chí Minh.',
  'Đam mê xây dựng những sản phẩm hữu ích cho cộng đồng.'
];

const PHONE_PREFIXES = ['090', '091', '098', '097', '086', '077', '079', '038', '039', '032'];

// Parse arguments
const args = process.argv.slice(2);
function getArgValue(name, defaultValue) {
  const index = args.indexOf(name);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}

const isClean = args.includes('--clean');
const isInfo = args.includes('--info');
const totalCount = parseInt(getArgValue('--count', '1000000'), 10);
const batchSize = parseInt(getArgValue('--batch', '10000'), 10);
const passwordToUse = getArgValue('--password', DEFAULT_PASSWORD);

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(startYear = 1970, endYear = 2006) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

function generateVietnameseName() {
  const last = getRandomElement(LAST_NAMES);
  const middle = getRandomElement(MIDDLE_NAMES);
  const first = getRandomElement(FIRST_NAMES);
  return `${last} ${middle} ${first}`;
}

function generatePhone(index) {
  const prefix = PHONE_PREFIXES[index % PHONE_PREFIXES.length];
  const suffix = String((index * 137 + 1234567) % 10000000).padStart(7, '0');
  return `${prefix}${suffix}`;
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (min > 0) return `${min}m ${remainingSec}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function run() {
  console.log('===============================================================');
  console.log('       CHATAPP DATABASE SEEDER - 1.000.000 USER ACCOUNTS       ');
  console.log('===============================================================');
  console.log(`📡 Đang kết nối tới MongoDB: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  if (isInfo) {
    const totalUsers = await usersCollection.countDocuments();
    const mockUsers = await usersCollection.countDocuments({
      email: { $regex: `@${MOCK_DOMAIN.replace('.', '\\.')}$` }
    });
    console.log(`📊 Tổng số người dùng hiện tại: ${totalUsers.toLocaleString('vi-VN')}`);
    console.log(`🤖 Số tài khoản ảo (@${MOCK_DOMAIN}): ${mockUsers.toLocaleString('vi-VN')}`);
    console.log(`👤 Số tài khoản thật: ${(totalUsers - mockUsers).toLocaleString('vi-VN')}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  if (isClean) {
    console.log(`🧹 Đang tiến hành xóa toàn bộ tài khoản ảo (@${MOCK_DOMAIN})...`);
    const deleteResult = await usersCollection.deleteMany({
      email: { $regex: `@${MOCK_DOMAIN.replace('.', '\\.')}$` }
    });
    console.log(`✅ Đã xóa thành công ${deleteResult.deletedCount.toLocaleString('vi-VN')} tài khoản ảo!`);
    const remaining = await usersCollection.countDocuments();
    console.log(`📊 Số người dùng còn lại trong database: ${remaining.toLocaleString('vi-VN')}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Lấy chỉ số bắt đầu để không bị trùng lặp nếu chạy nhiều lần
  const existingMockCount = await usersCollection.countDocuments({
    email: { $regex: `@${MOCK_DOMAIN.replace('.', '\\.')}$` }
  });

  const startIndex = existingMockCount + 1;
  const endIndex = existingMockCount + totalCount;

  console.log(`⚙️  Cấu hình nạp:`);
  console.log(`   - Số lượng cần nạp: ${totalCount.toLocaleString('vi-VN')} tài khoản`);
  console.log(`   - Kích thước batch: ${batchSize.toLocaleString('vi-VN')} records/lần`);
  console.log(`   - Dải index: ${startIndex.toLocaleString('vi-VN')} -> ${endIndex.toLocaleString('vi-VN')}`);
  console.log(`   - Mật khẩu mặc định: ${passwordToUse}`);
  console.log(`   - Domain mock: @${MOCK_DOMAIN}`);

  console.log('\n🔒 Đang mã hóa mật khẩu mẫu một lần bằng Bcrypt (saltRounds = 10)...');
  const hashStartTime = Date.now();
  const hashedPassword = await bcrypt.hash(passwordToUse, 10);
  console.log(`⚡ Mã hóa hoàn tất trong ${Date.now() - hashStartTime}ms! Tái sử dụng cho tất cả tài khoản.`);

  console.log('\n🚀 Bắt đầu quá trình nạp dữ liệu...');
  const overallStartTime = Date.now();
  let insertedTotal = 0;
  const totalBatches = Math.ceil(totalCount / batchSize);

  for (let b = 0; b < totalBatches; b++) {
    const currentBatchSize = Math.min(batchSize, totalCount - b * batchSize);
    const batchDocs = new Array(currentBatchSize);
    const batchStart = Date.now();

    for (let i = 0; i < currentBatchSize; i++) {
      const globalIndex = startIndex + b * batchSize + i;
      const padId = String(globalIndex).padStart(7, '0');
      const email = `user_${padId}@${MOCK_DOMAIN}`;
      const name = generateVietnameseName();
      const phone = generatePhone(globalIndex);
      const dob = getRandomDate(1975, 2005);
      const bio = getRandomElement(BIOS);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=user_${padId}`;

      batchDocs[i] = {
        name,
        email,
        phone,
        password: hashedPassword,
        avatar,
        bio,
        dateOfBirth: dob,
        role: 'user',
        isDeleted: false,
        isBan: false,
        firebaseUid: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Insert batch trực tiếp vào MongoDB
    await usersCollection.insertMany(batchDocs, { ordered: false });
    insertedTotal += currentBatchSize;

    const elapsedTotal = Date.now() - overallStartTime;
    const batchElapsed = Date.now() - batchStart;
    const currentSpeed = Math.round(insertedTotal / (elapsedTotal / 1000));
    const percent = ((insertedTotal / totalCount) * 100).toFixed(1);
    const remainingDocs = totalCount - insertedTotal;
    const etaMs = currentSpeed > 0 ? (remainingDocs / currentSpeed) * 1000 : 0;

    // Log tiến độ mỗi batch
    console.log(
      `[Batch ${(b + 1).toString().padStart(3, ' ')}/${totalBatches}] ` +
      `Đã nạp: ${insertedTotal.toLocaleString('vi-VN').padStart(9, ' ')} / ${totalCount.toLocaleString('vi-VN')} (${percent}%) | ` +
      `Tốc độ: ${currentSpeed.toLocaleString('vi-VN')} docs/s | ` +
      `Đã chạy: ${formatDuration(elapsedTotal)} | ETA: ${formatDuration(etaMs)}`
    );
  }

  const finalDuration = Date.now() - overallStartTime;
  const finalTotalUsers = await usersCollection.countDocuments();

  console.log('\n===============================================================');
  console.log('               🎉 HOÀN THÀNH NẠP 1.000.000 TÀI KHOẢN!          ');
  console.log('===============================================================');
  console.log(`⏱️  Tổng thời gian: ${formatDuration(finalDuration)}`);
  console.log(`⚡ Tốc độ trung bình: ${Math.round(totalCount / (finalDuration / 1000)).toLocaleString('vi-VN')} docs/giây`);
  console.log(`📊 Tổng số người dùng trong database: ${finalTotalUsers.toLocaleString('vi-VN')}`);
  console.log('\n🔑 Thông tin tài khoản mẫu để bạn đăng nhập thử:');
  console.log(`   - Email: user_0000001@${MOCK_DOMAIN}`);
  console.log(`   - Mật khẩu: ${passwordToUse}`);
  console.log('\n💡 Lệnh hỗ trợ:');
  console.log('   - Kiểm tra số lượng:  npm run seed:million:info');
  console.log('   - Xóa các tài khoản ảo: npm run seed:million:clean');
  console.log('===============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Lỗi khi thực hiện seed dữ liệu:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
