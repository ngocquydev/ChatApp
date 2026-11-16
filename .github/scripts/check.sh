#!/usr/bin/env bash
set -e

echo "================================================================================"
echo "🔍 [CI Quality Gate] Bắt đầu quy trình kiểm tra chất lượng & bảo mật toàn diện"
echo "================================================================================"

echo -e "\n➡️ [1/7] Kiểm tra Cú pháp & TypeScript Types..."
(cd apps/server && npm run lint && npm run typecheck)
(cd apps/web && npm run lint && npm run typecheck)
(cd apps/admin && npm run lint && npm run typecheck)
echo "✅ [1/7] Cú pháp & Types: PASSED"

echo -e "\n➡️ [2/7] Phân tích tĩnh: OWASP, Rò rỉ RAM, Tràn bộ nhớ & N+1 Query..."
node .github/scripts/ci-inspect.mjs
echo "✅ [2/7] Phân tích tĩnh CI Inspector: PASSED"

echo -e "\n➡️ [3/7] Kiểm thử Bảo mật OWASP & Chống Rò rỉ Dữ liệu..."
(cd apps/server && npm run test:security)
echo "✅ [3/7] OWASP & Data Leakage Tests: PASSED"

echo -e "\n➡️ [4/7] Kiểm thử Rò rỉ RAM, Tràn bộ đệm & Giới hạn Heap..."
(cd apps/server && npm run test:memory)
echo "✅ [4/7] Memory Leak & Buffer Overflow Tests: PASSED"

echo -e "\n➡️ [5/7] Kiểm thử Phòng chống Lỗi Truy vấn N+1..."
(cd apps/server && npm run test:nplusone)
echo "✅ [5/7] N+1 Query Tests: PASSED"

echo -e "\n➡️ [6/7] Kiểm thử Toàn bộ Đơn vị (Unit Tests)..."
(cd apps/server && npm run test)
echo "✅ [6/7] Backend Unit Tests: PASSED"

echo -e "\n➡️ [7/7] Kiểm tra Biên dịch Đóng gói (Production Build)..."
(cd apps/server && npm run build)
(cd apps/web && npm run build)
(cd apps/admin && npm run build)
echo "✅ [7/7] Backend, Frontend & Admin Build: PASSED"

echo -e "\n================================================================================"
echo "🎉 [CI Quality Gate] TẤT CẢ BÀI KIỂM TRA ĐỀU PASSED! Mã nguồn đạt chuẩn an toàn!"
echo "================================================================================"
