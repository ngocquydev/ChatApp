/**
 * Danh sách email được cấp quyền admin qua biến môi trường ADMIN_EMAILS (phân tách bằng dấu phẩy).
 * Quyền admin KHÔNG bao giờ được nhận từ dữ liệu client gửi lên.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** Role hiệu lực: admin nếu DB ghi admin hoặc email nằm trong ADMIN_EMAILS */
export function resolveEffectiveRole(user: { email?: string | null; role?: string | null }): string {
  if (user.role === 'admin' || isAdminEmail(user.email)) return 'admin';
  return user.role || 'user';
}

