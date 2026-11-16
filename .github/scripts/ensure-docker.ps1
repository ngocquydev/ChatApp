# scripts/ensure-docker.ps1 — Tự động kiểm tra và khởi động Docker Desktop & Containers
param (
    [switch]$StartContainers = $true,
    [switch]$All = $false,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Continue"

Write-Host "🐳 [Docker Check] Đang kiểm tra trạng thái Docker daemon..." -ForegroundColor Cyan

function Test-DockerDaemon {
    try {
        $null = docker info 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

$isDockerRunning = Test-DockerDaemon

if (-not $isDockerRunning) {
    Write-Host "⚠️ Docker daemon chưa chạy. Đang tự động tìm và khởi động Docker Desktop..." -ForegroundColor Yellow

    $dockerPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker Desktop\Docker Desktop.exe",
        "$env:ProgramW6432\Docker\Docker\Docker Desktop.exe"
    )

    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            $dockerExe = $path
            break
        }
    }

    if (-not $dockerExe) {
        Write-Error "❌ Không tìm thấy file thực thi Docker Desktop.exe trên hệ thống! Vui lòng cài đặt Docker Desktop."
        exit 1
    }

    $backendExe = "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
    if (Test-Path $backendExe) {
        Write-Host "🚀 Đang khởi động Docker Backend Engine từ: $backendExe" -ForegroundColor Green
        Start-Process -FilePath $backendExe -WindowStyle Hidden
    }

    Write-Host "🚀 Đang khởi động Docker Desktop từ: $dockerExe" -ForegroundColor Green
    Start-Process -FilePath $dockerExe -WindowStyle Minimized

    $startTime = Get-Date
    $ready = $false

    Write-Host "⏳ Đang chờ Docker daemon sẵn sàng (tối đa $TimeoutSeconds giây)..." -ForegroundColor Yellow
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        Start-Sleep -Seconds 3
        if (Test-DockerDaemon) {
            $ready = $true
            break
        }
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    Write-Host ""

    if (-not $ready) {
        Write-Error "❌ Đã hết thời gian chờ ($TimeoutSeconds giây) nhưng Docker daemon chưa sẵn sàng. Vui lòng kiểm tra Docker Desktop trên máy."
        exit 1
    }

    Write-Host "✅ Docker daemon đã khởi động và sẵn sàng hoạt động!" -ForegroundColor Green
} else {
    Write-Host "✅ Docker daemon đang chạy bình thường." -ForegroundColor Green
}

if ($StartContainers) {
    if ($All) {
        Write-Host "📦 Đang khởi động toàn bộ dịch vụ (Databases + Backend + Frontend + Admin) qua Docker Compose..." -ForegroundColor Cyan
        docker compose up -d --build
    } else {
        Write-Host "📦 Đang khởi động các dịch vụ cơ sở dữ liệu (MongoDB, Redis, Neo4j) qua Docker Compose..." -ForegroundColor Cyan
        docker compose up -d mongo redis neo4j
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Containers đã được khởi động thành công!" -ForegroundColor Green
        docker compose ps
    } else {
        Write-Error "❌ Khởi động docker compose thất bại!"
        exit $LASTEXITCODE
    }
}

