import { Box, Skeleton } from "@mui/material";
import { isVideoUrl, type PostView } from "@/services/postsApi";

export const SHORT_VIDEO_COPY = {
  title: { vi: "Video ngắn", en: "Short videos", "zh-CN": "短视频", "zh-TW": "短片", ko: "짧은 동영상", th: "วิดีโอสั้น" },
  uploadVideo: { vi: "Đăng video", en: "Post video", "zh-CN": "发布视频", "zh-TW": "發佈影片", ko: "동영상 게시", th: "โพสต์วิดีโอ" },
  description: { vi: "Khám phá video công khai từ cộng đồng.", en: "Discover public videos from the community.", "zh-CN": "发现社区公开视频。", "zh-TW": "探索社群公開影片。", ko: "커뮤니티의 공개 동영상을 둘러보세요.", th: "ค้นพบวิดีโอสาธารณะจากชุมชน" },
  noVideos: { vi: "Chưa có video công khai", en: "No public videos yet", "zh-CN": "暂无公开视频", "zh-TW": "尚無公開影片", ko: "아직 공개 동영상이 없습니다", th: "ยังไม่มีวิดีโอสาธารณะ" },
  noVideosDesc: { vi: "Video công khai mới sẽ xuất hiện tại đây.", en: "New public videos will appear here.", "zh-CN": "新的公开视频会显示在这里。", "zh-TW": "新的公開影片會顯示在這裡。", ko: "새 공개 동영상이 여기에 표시됩니다.", th: "วิดีโอสาธารณะใหม่จะแสดงที่นี่" },
  unmute: { vi: "Bật âm thanh", en: "Unmute videos", "zh-CN": "开启声音", "zh-TW": "開啟聲音", ko: "동영상 소리 켜기", th: "เปิดเสียงวิดีโอ" },
  mute: { vi: "Tắt âm thanh", en: "Mute videos", "zh-CN": "关闭声音", "zh-TW": "關閉聲音", ko: "동영상 음소거", th: "ปิดเสียงวิดีโอ" },
  comments: { vi: "Mở bình luận", en: "Open comments", "zh-CN": "打开评论", "zh-TW": "開啟留言", ko: "댓글 열기", th: "เปิดความคิดเห็น" },
  share: { vi: "Chia sẻ video", en: "Share video", "zh-CN": "分享视频", "zh-TW": "分享影片", ko: "동영상 공유", th: "แชร์วิดีโอ" },
  heart: { vi: "Thả tim video", en: "Love video", "zh-CN": "给视频送爱心", "zh-TW": "為影片送愛心", ko: "동영상에 하트 보내기", th: "กดหัวใจวิดีโอ" },
  removeHeart: { vi: "Bỏ tim video", en: "Remove love", "zh-CN": "取消视频爱心", "zh-TW": "取消影片愛心", ko: "동영상 하트 취소", th: "ยกเลิกหัวใจวิดีโอ" },
  shareTitle: { vi: "Chia sẻ video", en: "Share video", "zh-CN": "分享视频", "zh-TW": "分享影片", ko: "동영상 공유", th: "แชร์วิดีโอ" },
  shareDirectLink: { vi: "Liên kết mở video công khai trực tiếp.", en: "This link opens the public video directly.", "zh-CN": "此链接直接打开公开视频。", "zh-TW": "此連結會直接開啟公開影片。", ko: "이 링크는 공개 동영상을 직접 엽니다.", th: "ลิงก์นี้เปิดวิดีโอสาธารณะโดยตรง" },
  sharePrivate: { vi: "Video này chỉ có thể chia sẻ trong ChatApp.", en: "This video can only be shared in ChatApp.", "zh-CN": "此视频只能在 ChatApp 中分享。", "zh-TW": "此影片只能在 ChatApp 中分享。", ko: "이 동영상은 ChatApp 안에서만 공유할 수 있습니다.", th: "วิดีโอนี้แชร์ได้เฉพาะใน ChatApp" },
  shareInApp: { vi: "Chia sẻ trong ChatApp", en: "Share in ChatApp", "zh-CN": "在 ChatApp 中分享", "zh-TW": "在 ChatApp 中分享", ko: "ChatApp에서 공유", th: "แชร์ใน ChatApp" },
  shareMore: { vi: "Ứng dụng khác", en: "More apps", "zh-CN": "其他应用", "zh-TW": "其他應用程式", ko: "다른 앱", th: "แอปอื่น" },
  copyLink: { vi: "Sao chép liên kết", en: "Copy link", "zh-CN": "复制链接", "zh-TW": "複製連結", ko: "링크 복사", th: "คัดลอกลิงก์" },
  copiedLink: { vi: "Đã sao chép liên kết.", en: "Link copied.", "zh-CN": "链接已复制。", "zh-TW": "連結已複製。", ko: "링크가 복사되었습니다.", th: "คัดลอกลิงก์แล้ว" },
  shareFailed: { vi: "Không thể chia sẻ. Hãy thử sao chép liên kết.", en: "Could not share. Try copying the link.", "zh-CN": "无法分享，请尝试复制链接。", "zh-TW": "無法分享，請嘗試複製連結。", ko: "공유할 수 없습니다. 링크를 복사해 보세요.", th: "แชร์ไม่ได้ ลองคัดลอกลิงก์" },
  copyFailed: { vi: "Không thể sao chép tự động. Hãy chọn liên kết và sao chép thủ công.", en: "Could not copy automatically. Select the link and copy it manually.", "zh-CN": "无法自动复制，请选择链接手动复制。", "zh-TW": "無法自動複製，請選取連結手動複製。", ko: "자동으로 복사할 수 없습니다. 링크를 선택해 직접 복사하세요.", th: "คัดลอกอัตโนมัติไม่ได้ โปรดเลือกลิงก์แล้วคัดลอกเอง" },
  facebook: { vi: "Facebook", en: "Facebook", "zh-CN": "Facebook", "zh-TW": "Facebook", ko: "Facebook", th: "Facebook" },
  x: { vi: "X", en: "X", "zh-CN": "X", "zh-TW": "X", ko: "X", th: "X" },
  whatsapp: { vi: "WhatsApp", en: "WhatsApp", "zh-CN": "WhatsApp", "zh-TW": "WhatsApp", ko: "WhatsApp", th: "WhatsApp" },
  telegram: { vi: "Telegram", en: "Telegram", "zh-CN": "Telegram", "zh-TW": "Telegram", ko: "Telegram", th: "Telegram" },
  sensitive: { vi: "Nội dung nhạy cảm", en: "Sensitive content", "zh-CN": "敏感内容", "zh-TW": "敏感內容", ko: "민감한 콘텐츠", th: "เนื้อหาที่ละเอียดอ่อน" },
  reveal: { vi: "Nhấn để xem video", en: "Tap to view video", "zh-CN": "点击查看视频", "zh-TW": "點擊查看影片", ko: "탭하여 동영상 보기", th: "แตะเพื่อดูวิดีโอ" },
  loadingMore: { vi: "Đang tải thêm video", en: "Loading more videos", "zh-CN": "正在加载更多视频", "zh-TW": "正在載入更多影片", ko: "동영상을 더 불러오는 중", th: "กำลังโหลดวิดีโอเพิ่มเติม" },
  play: { vi: "Phát video", en: "Play video", "zh-CN": "播放视频", "zh-TW": "播放影片", ko: "동영상 재생", th: "เล่นวิดีโอ" },
  pause: { vi: "Tạm dừng video", en: "Pause video", "zh-CN": "暂停视频", "zh-TW": "暫停影片", ko: "동영상 일시정지", th: "หยุดวิดีโอชั่วคราว" },
  seek: { vi: "Tua video", en: "Seek video", "zh-CN": "调整视频进度", "zh-TW": "調整影片進度", ko: "동영상 탐색", th: "เลื่อนตำแหน่งวิดีโอ" },
  commentsTitle: { vi: "Bình luận", en: "Comments", "zh-CN": "评论", "zh-TW": "留言", ko: "댓글", th: "ความคิดเห็น" },
  previous: { vi: "Video trước", en: "Previous video", "zh-CN": "上一个视频", "zh-TW": "上一部影片", ko: "이전 동영상", th: "วิดีโอก่อนหน้า" },
  next: { vi: "Video tiếp theo", en: "Next video", "zh-CN": "下一个视频", "zh-TW": "下一部影片", ko: "다음 동영상", th: "วิดีโอถัดไป" },
  videoError: { vi: "Không phát được video này.", en: "This video could not be played.", "zh-CN": "无法播放此视频。", "zh-TW": "無法播放此影片。", ko: "이 동영상을 재생할 수 없습니다.", th: "ไม่สามารถเล่นวิดีโอนี้ได้" },
} as const;

export function getPostVideo(post: PostView): string | null {
  return post.images.find((url) => isVideoUrl(url)) ?? null;
}

export function VideoSkeleton() {
  return (
    <Box sx={{ width: "100%", maxWidth: 520, mx: "auto", display: "flex", gap: 2 }}>
      <Skeleton variant="rounded" sx={{ width: "100%", height: { xs: "58dvh", sm: 600 }, borderRadius: "16px" }} />
    </Box>
  );
}
