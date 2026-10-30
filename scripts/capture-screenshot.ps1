# scripts/capture-screenshot.ps1 — Tự động mở app và chụp ảnh màn hình bằng Google Chrome Headless
param (
    [string]$Url = "http://localhost:5173",
    [string]$OutputFile = "docs/assets/screenshots/app-preview.png",
    [int]$Width = 1440,
    [int]$Height = 900,
    [int]$DelaySeconds = 3
)

$ErrorActionPreference = "Stop"

Write-Host "📸 [Screenshot Automation] Đang chuẩn bị chụp màn hình..." -ForegroundColor Cyan
Write-Host "🔗 URL: $Url" -ForegroundColor Yellow
Write-Host "📁 Output: $OutputFile" -ForegroundColor Yellow

$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromeExe = $path
        break
    }
}

if (-not $chromeExe) {
    Write-Error "❌ Không tìm thấy Google Chrome trên máy! Vui lòng cài đặt Google Chrome."
    exit 1
}

# Tạo thư mục cha nếu chưa có
$outputDir = Split-Path -Parent $OutputFile
if ($outputDir -and (-not (Test-Path $outputDir))) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputFile)

Write-Host "🚀 Đang khởi chạy Chrome Headless để chụp giao diện ($Width x $Height)..." -ForegroundColor Green
$chromeArgs = @(
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=$Width,$Height",
    "--screenshot=$resolvedOutput",
    $Url
)

$process = Start-Process -FilePath $chromeExe -ArgumentList $chromeArgs -Wait -PassThru -NoNewWindow

if (Test-Path $resolvedOutput) {
    $fileInfo = Get-Item $resolvedOutput
    Write-Host "✅ Đã chụp màn hình thành công: $resolvedOutput ($($fileInfo.Length) bytes)" -ForegroundColor Green
} else {
    Write-Error "❌ Chụp ảnh thất bại hoặc không tìm thấy file xuất ra."
    exit 1
}
