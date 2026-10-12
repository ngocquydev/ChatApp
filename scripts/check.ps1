# Script kiem tra toan dien Backend va Frontend truoc khi push
$ErrorActionPreference = "Stop"

Write-Host "🔍 [CI Check] Bat dau kiem tra toan bo ma nguon..." -ForegroundColor Cyan

Write-Host "`n➡️ [1/4] Backend Lint (Oxlint)..." -ForegroundColor Yellow
Push-Location backend
try {
    npm run lint
    Write-Host "✅ Backend Lint: Passed" -ForegroundColor Green

    Write-Host "`n➡️ [2/4] Backend Unit Tests (Vitest)..." -ForegroundColor Yellow
    npm run test
    Write-Host "✅ Backend Tests: Passed" -ForegroundColor Green

    Write-Host "`n➡️ [3/4] Backend Build (NestJS)..." -ForegroundColor Yellow
    npm run build
    Write-Host "✅ Backend Build: Passed" -ForegroundColor Green
} finally {
    Pop-Location
}

Write-Host "`n➡️ [4/4] Frontend Lint & Build (Vite)..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm run lint
    Write-Host "✅ Frontend Lint: Passed" -ForegroundColor Green

    npm run build
    Write-Host "✅ Frontend Build: Passed" -ForegroundColor Green
} finally {
    Pop-Location
}

Write-Host "`n🎉 [CI Check] Tat ca cac bai kiem tra deu PASSED! San sang push len main!" -ForegroundColor Green
