/**
 * Dải IP chính thức của Cloudflare Edge.
 * Nguồn: https://www.cloudflare.com/ips-v4 và https://www.cloudflare.com/ips-v6
 * (cập nhật lần cuối: 2026-10). Cloudflare hiếm khi đổi dải IP; khi đổi, cập nhật danh sách này
 * hoặc bổ sung tạm qua biến môi trường TRUSTED_PROXY_CIDRS.
 */
export const CLOUDFLARE_IPV4_RANGES: readonly string[] = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

export const CLOUDFLARE_IPV6_RANGES: readonly string[] = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

/**
 * Proxy nội bộ được tin mặc định: loopback — nơi `cloudflared` (Cloudflare Tunnel) chạy cùng máy
 * với `network_mode: host` và chuyển tiếp request vào backend.
 */
export const DEFAULT_TRUSTED_PROXY_CIDRS = '127.0.0.1/32,::1/128';

