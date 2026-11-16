import axios from "axios";
import type { MultiLangMap } from "@/i18n/useTranslation";

const invalidVideo: MultiLangMap = {
  vi: "Video không hợp lệ, không được hỗ trợ hoặc vượt quá giới hạn 100 MB.",
  en: "The video is invalid, unsupported, or exceeds the 100 MB limit.",
  "zh-CN": "视频无效、格式不受支持或超过 100 MB 限制。",
  "zh-TW": "影片無效、格式不受支援或超過 100 MB 限制。",
  ko: "동영상이 올바르지 않거나 지원되지 않거나 100MB 제한을 초과했습니다.",
  th: "วิดีโอไม่ถูกต้อง ไม่รองรับ หรือมีขนาดเกิน 100 MB",
};

const unavailableVideo: MultiLangMap = {
  vi: "Chưa thể xử lý video hoặc máy chủ đang bận. Hãy thử lại sau.",
  en: "Video processing is unavailable or the server is busy. Please try again later.",
  "zh-CN": "暂时无法处理视频，或服务器正忙。请稍后重试。",
  "zh-TW": "暫時無法處理影片，或伺服器忙碌中。請稍後再試。",
  ko: "동영상을 처리할 수 없거나 서버가 사용 중입니다. 잠시 후 다시 시도하세요.",
  th: "ยังประมวลผลวิดีโอไม่ได้หรือเซิร์ฟเวอร์กำลังทำงานอยู่ โปรดลองอีกครั้งภายหลัง",
};

const failedVideo: MultiLangMap = {
  vi: "Không tải được video. Hãy thử lại.",
  en: "Could not upload the video. Please try again.",
  "zh-CN": "无法上传视频。请重试。",
  "zh-TW": "無法上傳影片。請再試一次。",
  ko: "동영상을 업로드할 수 없습니다. 다시 시도하세요.",
  th: "อัปโหลดวิดีโอไม่ได้ โปรดลองอีกครั้ง",
};

export function videoUploadError(error: unknown, translate: (message: MultiLangMap) => string): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 400 || status === 413) return translate(invalidVideo);
  if (status === 503) return translate(unavailableVideo);
  return translate(failedVideo);
}
