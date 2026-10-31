/**
 * Tiện ích dùng chung cho tính năng chia sẻ vị trí trực tiếp (Live Location).
 */

type Translate = (vi: string, en: string) => string;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** Các mốc thời lượng chia sẻ trực tiếp (đơn vị: phút) — giống Zalo/Telegram. */
export const LIVE_DURATION_OPTIONS = [15, 60, 8 * MINUTES_PER_HOUR, MINUTES_PER_DAY] as const;

export type LiveDurationMinutes = (typeof LIVE_DURATION_OPTIONS)[number];

/** Nhãn thời lượng: 15 phút · 1 giờ · 8 giờ · 1 ngày. */
export function formatLiveDuration(minutes: number, tr: Translate): string {
  if (minutes >= MINUTES_PER_DAY && minutes % MINUTES_PER_DAY === 0) {
    const days = minutes / MINUTES_PER_DAY;
    return tr(`${days} ngày`, days === 1 ? "1 day" : `${days} days`);
  }
  if (minutes >= MINUTES_PER_HOUR && minutes % MINUTES_PER_HOUR === 0) {
    const hours = minutes / MINUTES_PER_HOUR;
    return tr(`${hours} giờ`, hours === 1 ? "1 hour" : `${hours} hours`);
  }
  return tr(`${minutes} phút`, `${minutes} min`);
}

/** Thời gian còn lại đến khi hết hạn chia sẻ, vd. "Còn 7 giờ 59 phút". */
export function formatLiveRemaining(
  expiresAt: string | Date | null | undefined,
  now: number | null,
  tr: Translate,
): string {
  if (!expiresAt || now === null) return "";
  const diffMs = new Date(expiresAt).getTime() - now;
  if (diffMs <= 0) return tr("Đã hết hạn", "Expired");

  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes >= MINUTES_PER_HOUR) {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const mins = totalMinutes % MINUTES_PER_HOUR;
    return mins > 0
      ? tr(`Còn ${hours} giờ ${mins} phút`, `${hours}h ${mins}m left`)
      : tr(`Còn ${hours} giờ`, `${hours}h left`);
  }
  if (totalMinutes > 0) return tr(`Còn ${totalMinutes} phút`, `${totalMinutes}m left`);

  const secs = Math.floor(diffMs / 1000);
  return tr(`Còn ${secs} giây`, `${secs}s left`);
}

