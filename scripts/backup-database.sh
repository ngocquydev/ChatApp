#!/bin/bash
# scripts/backup-database.sh — Kịch bản tự động sao lưu CSDL MongoDB cho ChatApp (Linux / Docker / Cronjob)
set -e

TARGET_DIR="backend/backups"
RETENTION_DAYS=7

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backup_chatapp_${TIMESTAMP}.archive.gz"

echo "📦 [Database Backup] Bắt đầu sao lưu cơ sở dữ liệu: $(date)"

mkdir -p "$TARGET_DIR"

CONTAINER_TMP="/tmp/${FILENAME}"
RESOLVED_TARGET="${TARGET_DIR}/${FILENAME}"

# 1. Kiểm tra container
if ! docker ps --filter "name=chat_mongo" --filter "status=running" -q | grep -q .; then
    echo "❌ Lỗi: Container 'chat_mongo' không đang chạy!"
    exit 1
fi

# 2. Chạy mongodump
echo "🚀 Đang thực thi mongodump bên trong container chat_mongo..."
docker exec chat_mongo mongodump --db=chatapp --archive="${CONTAINER_TMP}" --gzip

# 3. Copy file ra host
echo "📥 Đang sao chép file sao lưu ra host..."
docker cp "chat_mongo:${CONTAINER_TMP}" "${RESOLVED_TARGET}"

# 4. Dọn dẹp file tạm
docker exec chat_mongo rm -f "${CONTAINER_TMP}"

echo "✅ Bản sao lưu đã được lưu: ${RESOLVED_TARGET}"

# 5. Retention policy: Dọn dẹp file cũ hơn 7 ngày
echo "🧹 Đang dọn dẹp các bản sao lưu cũ hơn ${RETENTION_DAYS} ngày..."
find "$TARGET_DIR" -type f -name "backup_chatapp_*.archive.gz" -mtime +$RETENTION_DAYS -delete
find "$TARGET_DIR" -type f -name "*.meta.json" -mtime +$RETENTION_DAYS -delete

echo "🎉 Hoàn tất sao lưu cơ sở dữ liệu!"

