# .github/scripts/backup-database.ps1 — Kịch bản tự động sao lưu CSDL MongoDB & Redis cho ChatApp
param (
    [string]$TargetDir = "apps/server/backups",
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "backup_chatapp_$timestamp.archive.gz"

Write-Host "📦 [Database Backup] Bắt đầu sao lưu cơ sở dữ liệu..." -ForegroundColor Cyan
Write-Host "🕒 Thời gian: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Yellow

# Tạo thư mục nếu chưa tồn tại
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
}

$resolvedTarget = Join-Path (Get-Location) "$TargetDir/$filename"
$containerTmp = "/tmp/$filename"

# 1. Kiểm tra Docker container chat_mongo
$mongoRunning = docker ps --filter "name=chat_mongo" --filter "status=running" -q
if (-not $mongoRunning) {
    Write-Error "❌ Container 'chat_mongo' không đang chạy! Vui lòng khởi động Docker container trước."
    exit 1
}

# 2. Chạy mongodump nén trực tiếp bằng gzip
Write-Host "🚀 Đang thực thi mongodump bên trong container chat_mongo..." -ForegroundColor Green
docker exec chat_mongo mongodump --db=chatapp --archive=$containerTmp --gzip

# 3. Sao chép file archive ra máy chủ
Write-Host "📥 Đang sao chép file sao lưu ra thư mục lưu trữ..." -ForegroundColor Green
docker cp "chat_mongo:$containerTmp" "$resolvedTarget"

# 4. Xóa file tạm trong container
docker exec chat_mongo rm -f $containerTmp

$fileSize = (Get-Item $resolvedTarget).Length / 1MB
Write-Host ("✅ [Thành công] Bản sao lưu đã được lưu: {0} ({1:N2} MB)" -f $resolvedTarget, $fileSize) -ForegroundColor Green

# 5. Dọn dẹp bản sao lưu cũ quá RetentionDays ngày
Write-Host "🧹 Đang kiểm tra và dọn dẹp bản sao lưu cũ hơn $RetentionDays ngày..." -ForegroundColor Cyan
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $TargetDir -Filter "backup_chatapp_*.archive.gz" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Write-Host "🗑️ Đang xóa bản sao lưu hết hạn: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Force
    $metaFile = "$($_.FullName).meta.json"
    if (Test-Path $metaFile) { Remove-Item $metaFile -Force }
}

Write-Host "🎉 Hoàn tất quy trình sao lưu cơ sở dữ liệu!" -ForegroundColor Green

