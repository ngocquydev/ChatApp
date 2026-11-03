import type { SupportedLanguage } from "@/i18n/types";
import { useLanguageStore } from "@/i18n/useLanguageStore";

function getCurrentLanguage(): SupportedLanguage {
  return useLanguageStore.getState().language;
}

function getLocale(lang: SupportedLanguage = getCurrentLanguage()): string {
  switch (lang) {
    case "en":
      return "en-US";
    case "zh-CN":
      return "zh-CN";
    case "zh-TW":
      return "zh-TW";
    case "ko":
      return "ko-KR";
    case "th":
      return "th-TH";
    case "vi":
    default:
      return "vi-VN";
  }
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số ngày chênh lệch theo lịch (0 = hôm nay, 1 = hôm qua...). */
function calendarDayDiff(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

function getYesterdayLabel(lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return "Yesterday";
    case "zh-CN":
      return "昨天";
    case "zh-TW":
      return "昨天";
    case "ko":
      return "어제";
    case "th":
      return "เมื่อวาน";
    case "vi":
    default:
      return "Hôm qua";
  }
}

function getTodayLabel(lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return "Today";
    case "zh-CN":
      return "今天";
    case "zh-TW":
      return "今天";
    case "ko":
      return "오늘";
    case "th":
      return "วันนี้";
    case "vi":
    default:
      return "Hôm nay";
  }
}

function getJustNowLabel(lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return "Just now";
    case "zh-CN":
      return "刚刚";
    case "zh-TW":
      return "剛剛";
    case "ko":
      return "방금 전";
    case "th":
      return "เมื่อสักครู่";
    case "vi":
    default:
      return "Vừa xong";
  }
}

function formatMinutesAgo(minutes: number, lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    case "zh-CN":
      return `${minutes} 分钟前`;
    case "zh-TW":
      return `${minutes} 分鐘前`;
    case "ko":
      return `${minutes}분 전`;
    case "th":
      return `${minutes} นาทีที่แล้ว`;
    case "vi":
    default:
      return `${minutes} phút trước`;
  }
}

function formatHoursAgo(hours: number, lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    case "zh-CN":
      return `${hours} 小时前`;
    case "zh-TW":
      return `${hours} 小時前`;
    case "ko":
      return `${hours}시간 전`;
    case "th":
      return `${hours} ชั่วโมงที่แล้ว`;
    case "vi":
    default:
      return `${hours} giờ trước`;
  }
}

function formatDaysAgo(days: number, lang: SupportedLanguage): string {
  switch (lang) {
    case "en":
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    case "zh-CN":
      return `${days} 天前`;
    case "zh-TW":
      return `${days} 天前`;
    case "ko":
      return `${days}일 전`;
    case "th":
      return `${days} วันที่แล้ว`;
    case "vi":
    default:
      return `${days} ngày trước`;
  }
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
  if (diff === 1) return getYesterdayLabel(lang);
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
  if (diff <= 0) return getTodayLabel(lang);
  if (diff === 1) return getYesterdayLabel(lang);
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
  if (seconds < 60) return getJustNowLabel(lang);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return formatMinutesAgo(minutes, lang);
  }
  const diffDays = calendarDayDiff(date, now);
  const hours = Math.floor(minutes / 60);
  if (diffDays <= 0 && hours < 24) {
    return formatHoursAgo(hours, lang);
  }
  if (diffDays === 1) return getYesterdayLabel(lang);
  if (diffDays < 7) {
    return formatDaysAgo(diffDays, lang);
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
