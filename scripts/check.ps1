# Script kiểm tra chất lượng & bảo mật toàn diện trước khi push / merge
$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "🔍 [CI Quality Gate] Bat dau quy trinh kiem tra chat luong & bao mat toan dien" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Write-Host "`n➡️ [1/7] Kiem tra Cu phap & TypeScript Types..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run lint
    npm run typecheck
} finally {
    Pop-Location
}
Push-Location frontend
try {
    npm run lint
    npm run typecheck
} finally {
    Pop-Location
}
Write-Host "✅ [1/7] Cu phap & Types: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [2/7] Phan tich tinh: OWASP, Ro ri RAM, Tran bo nho & N+1 Query..." -ForegroundColor Yellow
node scripts/ci-inspect.mjs
Write-Host "✅ [2/7] Phan tich tinh CI Inspector: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [3/7] Kiem thu Bao mat OWASP & Chong Ro ri Du lieu..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run test:security
} finally {
    Pop-Location
}
Write-Host "✅ [3/7] OWASP & Data Leakage Tests: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [4/7] Kiem thu Ro ri RAM, Tran bo dem & Gioi han Heap..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run test:memory
} finally {
    Pop-Location
}
Write-Host "✅ [4/7] Memory Leak & Buffer Overflow Tests: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [5/7] Kiem thu Phong chong Loi Truy van N+1..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run test:nplusone
} finally {
    Pop-Location
}
Write-Host "✅ [5/7] N+1 Query Tests: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [6/7] Kiem thu Toan bo Don vi (Unit Tests)..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run test
} finally {
    Pop-Location
}
Write-Host "✅ [6/7] Backend Unit Tests: PASSED" -ForegroundColor Green

Write-Host "`n➡️ [7/7] Kiem tra Bien dich Dong goi (Production Build)..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run build
} finally {
    Pop-Location
}
Push-Location frontend
try {
    npm run build
} finally {
    Pop-Location
}
Write-Host "✅ [7/7] Backend & Frontend Build: PASSED" -ForegroundColor Green

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "🎉 [CI Quality Gate] TAT CA BAI KIEM TRA DEU PASSED! Ma nguon dat chuan an toan!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
