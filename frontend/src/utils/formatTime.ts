import { useLanguageStore } from "@/i18n/useLanguageStore";

function getCurrentLanguage(): "vi" | "en" {
  return useLanguageStore.getState().language;
}

function getLocale(lang: "vi" | "en" = getCurrentLanguage()): string {
  return lang === "en" ? "en-US" : "vi-VN";
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số ngày chênh lệch theo lịch (0 = hôm nay, 1 = hôm qua...). */
function calendarDayDiff(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

/** "14:05" */
export function formatClockTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const lang = getCurrentLanguage();
  return date.toLocaleTimeString(getLocale(lang), { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Nhãn gọn cho danh sách hội thoại: giờ nếu hôm nay, "Hôm qua", thứ trong tuần, hoặc dd/MM. */
export function formatConversationTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const lang = getCurrentLanguage();
  const diff = calendarDayDiff(date);
  if (diff <= 0) return formatClockTime(dateStr);
  if (diff === 1) return lang === "en" ? "Yesterday" : "Hôm qua";
  if (diff < 7) return date.toLocaleDateString(getLocale(lang), { weekday: "short" });
  return date.toLocaleDateString(getLocale(lang), { day: "2-digit", month: "2-digit" });
}

/** Nhãn ngăn cách ngày trong khung chat: "Hôm nay", "Hôm qua", "25/10/2026". */
export function formatDaySeparator(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const lang = getCurrentLanguage();
  const diff = calendarDayDiff(date);
  if (diff <= 0) return lang === "en" ? "Today" : "Hôm nay";
  if (diff === 1) return lang === "en" ? "Yesterday" : "Hôm qua";
  return date.toLocaleDateString(getLocale(lang), { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Khoá ngày (yyyy-mm-dd, theo giờ địa phương) để nhóm tin nhắn. */
export function dayKey(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Nhãn thời gian tương đối cho bài viết: "Vừa xong", "5 phút trước", "2 giờ trước", "Hôm qua", "25/10/2026". */
export function formatRelativeTime(dateStr?: string, now: Date = new Date()): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const lang = getCurrentLanguage();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return lang === "en" ? "Just now" : "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return lang === "en"
      ? `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
      : `${minutes} phút trước`;
  }
  const diffDays = calendarDayDiff(date, now);
  const hours = Math.floor(minutes / 60);
  if (diffDays <= 0 && hours < 24) {
    return lang === "en"
      ? `${hours} ${hours === 1 ? "hour" : "hours"} ago`
      : `${hours} giờ trước`;
  }
  if (diffDays === 1) return lang === "en" ? "Yesterday" : "Hôm qua";
  if (diffDays < 7) {
    return lang === "en"
      ? `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
      : `${diffDays} ngày trước`;
  }
  return date.toLocaleDateString(getLocale(lang), { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Ngày giờ đầy đủ, dùng cho tooltip/`title` của nhãn thời gian. */
export function formatFullDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const lang = getCurrentLanguage();
  return date.toLocaleString(getLocale(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
