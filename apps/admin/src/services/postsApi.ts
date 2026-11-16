import api from "./api";

export function mediaUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

