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

export function resolveEffectiveRole(user: { email?: string | null; role?: string | null }): string {
  if (user.role === 'admin' || isAdminEmail(user.email)) return 'admin';
  return user.role || 'user';
}

