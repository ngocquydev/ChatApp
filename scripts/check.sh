#!/usr/bin/env bash
set -e

echo "🔍 [CI Check] Bắt đầu kiểm tra toàn bộ mã nguồn..."

echo "➡️ [1/4] Backend Lint (Oxlint)..."
(cd backend && npm run lint)
echo "✅ Backend Lint: Passed"

echo "➡️ [2/4] Backend Unit Tests (Vitest)..."
(cd backend && npm run test)
echo "✅ Backend Tests: Passed"

echo "➡️ [3/4] Backend Build (NestJS)..."
(cd backend && npm run build)
echo "✅ Backend Build: Passed"

echo "➡️ [4/4] Frontend Lint (ESLint)..."
(cd frontend && npm run lint)
echo "✅ Frontend Lint: Passed"

echo "➡️ [4/4] Frontend Build (Vite)..."
(cd frontend && npm run build)
echo "✅ Frontend Build: Passed"

echo "🎉 [CI Check] Tất cả các bài kiểm tra đều PASSED! Sẵn sàng push lên main!"
