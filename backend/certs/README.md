# 🔐 MQTT SSL/TLS Certificates (Chống bắt gói tin / Anti-Packet Sniffing)

Thư mục này chứa chứng chỉ SSL/TLS dùng để mã hóa toàn bộ dữ liệu trao đổi qua giao thức MQTT (WSS - WebSocket Secure và MQTTS - Native MQTT over TLS).

## 🛡️ TẠI SAO CẦN BẬT SSL/TLS CHO MQTT?

Khi MQTT chạy ở chế độ văn bản thuần (`ws://` hoặc `mqtt://` qua HTTP/TCP):
- Kẻ tấn công cùng mạng Wi-Fi/LAN có thể sử dụng các công cụ như **Wireshark**, **tcpdump** để bắt gói tin mạng (**Packet Sniffing**).
- Gói tin truyền tin nhắn, sự kiện gõ phím (Typing) và tọa độ vị trí trực tiếp (Live Location) có thể bị đọc trộm hoặc can thiệp (**Man-in-the-Middle Attack**).
- Trình duyệt hiện đại chạy trên môi trường HTTPS sẽ chặn đứng kết nối WebSocket không mã hóa theo chính sách bảo mật **Mixed Content**.

Khi kích hoạt **SSL/TLS (WSS / MQTTS)**:
- Toàn bộ kết nối được mã hóa bằng chuẩn mật mã **TLS 1.2 / TLS 1.3** (AES-GCM / ChaCha20-Poly1305).
- Các gói tin bắt được trên Wireshark chỉ là dữ liệu mã hóa nhị phân vô nghĩa (Ciphertext `Application Data`).
- Header cookie, Token xác thực JWT và nội dung tin nhắn được bảo vệ an toàn tuyệt đối.

## 🚀 CÁCH SỬ DỤNG TRONG MÔI TRƯỜNG PHÁT TRIỂN (LOCAL DEV)

Tự động tạo chứng chỉ tự ký (Self-signed) cho `localhost`:
```powershell
powershell -File .\scripts\generate-dev-certs.ps1
```
Hệ thống sẽ tạo ra hai tệp:
- `backend/certs/mqtt-key.pem` (Khóa bí mật)
- `backend/certs/mqtt-cert.pem` (Chứng chỉ công khai)

## 🌐 CẤU HÌNH CHO MÔI TRƯỜNG PRODUCTION (SẢN XUẤT)

Trên máy chủ Production hoặc Docker container, bạn có thể:
1. **Truyền trực tiếp chuỗi PEM qua biến môi trường:**
   ```env
   MQTT_TLS_KEY="-----BEGIN PRIVATE KEY-----\n..."
   MQTT_TLS_CERT="-----BEGIN CERTIFICATE-----\n..."
   ```
2. **Hoặc mount đường dẫn chứng chỉ Let's Encrypt / Cloudflare:**
   ```env
   MQTT_TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   MQTT_TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   ```
