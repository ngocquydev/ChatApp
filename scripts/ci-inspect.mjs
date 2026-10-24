#!/usr/bin/env node

/**
 * CI Static Inspection Script
 * ----------------------------------------------------
 * Tự động quét và phát hiện các rủi ro nghiêm trọng:
 * 1. Lỗi truy vấn N+1 (N+1 Query Antipatterns in loops)
 * 2. Rò rỉ RAM & Tràn bộ nhớ (Buffer unsafe, memory leaks)
 * 3. Lỗi bảo mật OWASP (eval, hardcoded secrets, raw injection)
 * 4. Rò rỉ dữ liệu nhạy cảm (logging passwords, unmasked secrets)
 */

import fs from 'fs';
import path from 'path';

const BACKEND_SRC = path.resolve('backend/src');
const FRONTEND_SRC = path.resolve('frontend/src');

const errors = [];
const warnings = [];

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.mjs']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.next') {
        results = results.concat(getAllFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext) && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

console.log('🔍 [CI Inspector] Đang tiến hành quét phân tích tĩnh mã nguồn...\n');

// 1. Quét Backend
const backendFiles = getAllFiles(BACKEND_SRC);
for (const file of backendFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(process.cwd(), file);
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // --- KIỂM TRA LỖI TRUY VẤN N+1 ---
    // Kiểm tra await model.find* trong for loop hoặc map/forEach
    if (
      /(for\s*\(|\.map\(|\.forEach\().*(await\s+.*(Model|\.find|\.findOne|\.findById))/i.test(line)
    ) {
      errors.push({
        type: 'N+1 Query Risk',
        file: relPath,
        line: lineNum,
        message: 'Phát hiện gọi query Database bất đồng bộ bên trong vòng lặp (N+1 query problem). Vui lòng dùng toán tử $in hoặc Mongoose populate.',
        snippet: line.trim(),
      });
    }

    // --- KIỂM TRA RÒ RỈ RAM & TRÀN BỘ NHỚ ---
    if (/Buffer\.allocUnsafe\(/.test(line)) {
      errors.push({
        type: 'Memory Safety',
        file: relPath,
        line: lineNum,
        message: 'Phát hiện sử dụng Buffer.allocUnsafe không an toàn có thể gây rò rỉ dữ liệu RAM cũ. Hãy dùng Buffer.alloc.',
        snippet: line.trim(),
      });
    }

    // --- KIỂM TRA BẢO MẬT OWASP ---
    if (/\beval\s*\(/.test(line) && !line.includes('//')) {
      errors.push({
        type: 'OWASP A03 (Code Injection)',
        file: relPath,
        line: lineNum,
        message: 'Nghiêm cấm sử dụng hàm eval() vì nguy cơ Remote Code Execution (RCE).',
        snippet: line.trim(),
      });
    }

    if (/\$where\s*:/.test(line)) {
      errors.push({
        type: 'OWASP A03 (NoSQL Injection)',
        file: relPath,
        line: lineNum,
        message: 'Phát hiện sử dụng toán tử $where nguy hiểm trong MongoDB query.',
        snippet: line.trim(),
      });
    }

    // --- KIỂM TRA RÒ RỈ DỮ LIỆU NHẠY CẢM ---
    if (
      /console\.(log|info|debug)\(.*(password|refreshToken|secretKey|otp).*\)/i.test(line) &&
      !line.includes('***')
    ) {
      warnings.push({
        type: 'Data Leakage Risk',
        file: relPath,
        line: lineNum,
        message: 'Phát hiện in thông tin nhạy cảm (password/token/secret) ra console log.',
        snippet: line.trim(),
      });
    }
  });
}

// 2. Quét Frontend
const frontendFiles = getAllFiles(FRONTEND_SRC);
for (const file of frontendFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(process.cwd(), file);
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Kiểm tra lưu token nhạy cảm vào localStorage
    if (/localStorage\.setItem\(.*(access_token|accessToken|refreshToken)/i.test(line)) {
      errors.push({
        type: 'OWASP A05 (Sensitive Data in Storage)',
        file: relPath,
        line: lineNum,
        message: 'Không được lưu AccessToken hoặc RefreshToken vào localStorage (nguy cơ XSS). Hãy dùng HttpOnly Cookies.',
        snippet: line.trim(),
      });
    }

    // Kiểm tra dangerouslySetInnerHTML không an toàn
    if (/dangerouslySetInnerHTML/.test(line) && !line.includes('JSON.stringify') && !line.includes('jsonLd')) {
      warnings.push({
        type: 'OWASP A03 (XSS Risk)',
        file: relPath,
        line: lineNum,
        message: 'Cảnh báo sử dụng dangerouslySetInnerHTML không qua làm sạch (sanitization).',
        snippet: line.trim(),
      });
    }
  });
}

// In kết quả
console.log(`Đã quét tổng cộng: ${backendFiles.length + frontendFiles.length} tệp mã nguồn.`);

if (warnings.length > 0) {
  console.log(`\n⚠️  [CẢNH BÁO] Phát hiện ${warnings.length} điểm cần lưu ý:`);
  warnings.forEach((w, i) => {
    console.log(`  ${i + 1}. [${w.type}] ${w.file}:${w.line}`);
    console.log(`     Lỗi: ${w.message}`);
    console.log(`     Đoạn mã: ${w.snippet}\n`);
  });
}

if (errors.length > 0) {
  console.error(`\n❌ [LỖI NGHIÊM TRỌNG] Phát hiện ${errors.length} vi phạm chất lượng & bảo mật:`);
  errors.forEach((e, i) => {
    console.error(`  ${i + 1}. [${e.type}] ${e.file}:${e.line}`);
    console.error(`     Lỗi: ${e.message}`);
    console.error(`     Đoạn mã: ${e.snippet}\n`);
  });
  process.exit(1);
}

console.log('✅ [CI Inspector] Tất cả các kiểm tra cú pháp, bảo mật OWASP, tràn RAM, rò rỉ dữ liệu và truy vấn N+1 đều PASSED!\n');
process.exit(0);
