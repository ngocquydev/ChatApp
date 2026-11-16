const LOCAL_ORIGINS = [3000, 3001, 5173, 5174, 5175].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);

export function isAllowedOrigin(origin: string): boolean {
  const configured = [process.env.FRONTEND_URL, process.env.ADMIN_URL, ...(process.env.CORS_ORIGIN ?? '').split(',')]
    .map((value) => value?.trim().replace(/\/$/, ''))
    .filter((value): value is string => Boolean(value));
  return configured.includes(origin) || (process.env.NODE_ENV !== 'production' && LOCAL_ORIGINS.includes(origin));
}

export function isAllowedCookieRequest(method: string, origin: string | undefined, hasSessionCookie: boolean): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true;
  if (origin) return isAllowedOrigin(origin);
  return !hasSessionCookie;
}
