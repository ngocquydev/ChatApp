# Script tự động tạo chứng chỉ SSL/TLS tự ký cho môi trường phát triển (Development)
# Dùng để bật mã hóa TLS 1.3 / WSS cho MQTT Broker nhằm chống bắt gói tin (Packet Sniffing)
$ErrorActionPreference = "Stop"

$certsDir = Join-Path $PSScriptRoot "..\backend\certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Force -Path $certsDir | Out-Null
}

$keyPath = Join-Path $certsDir "mqtt-key.pem"
$certPath = Join-Path $certsDir "mqtt-cert.pem"

if ((Test-Path $keyPath) -and (Test-Path $certPath)) {
    Write-Host "✅ [SSL/TLS] Chứng chỉ SSL/TLS phát triển đã tồn tại sẵn tại: $certsDir" -ForegroundColor Green
    exit 0
}

Write-Host "🔐 [SSL/TLS] Đang tạo chứng chỉ SSL/TLS tự ký mới cho localhost..." -ForegroundColor Cyan

# 1. Thử tìm OpenSSL
$opensslCmd = $null
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    $opensslCmd = "openssl"
} elseif (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
    $opensslCmd = "C:\Program Files\Git\usr\bin\openssl.exe"
}

if ($opensslCmd) {
    & $opensslCmd req -x509 -newkey rsa:2048 -nodes -sha256 `
        -keyout $keyPath -out $certPath -days 3650 `
        -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    Write-Host "✅ [SSL/TLS] Đã tạo thành công chứng chỉ phát triển qua OpenSSL:" -ForegroundColor Green
    Write-Host "   - Khóa bí mật (Private Key): $keyPath" -ForegroundColor Gray
    Write-Host "   - Chứng chỉ (Certificate):  $certPath" -ForegroundColor Gray
    exit 0
}

Write-Host "⚠️ [SSL/TLS] Không tìm thấy OpenSSL. Hãy cài đặt OpenSSL hoặc thêm chứng chỉ vào backend/certs/" -ForegroundColor Yellow
exit 1

