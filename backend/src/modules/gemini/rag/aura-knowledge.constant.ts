/**
 * Kho tri thức về ứng dụng ChatApp dành cho hệ thống RAG (Retrieval-Augmented Generation) của Aura AI.
 */
export interface AppFeatureDoc {
  id: string;
  title: string;
  keywords: string[];
  description: string;
  usageTips: string;
}

export const CHATAPP_KNOWLEDGE_BASE: AppFeatureDoc[] = [
  {
    id: 'live_location',
    title: 'Chia sẻ vị trí thời gian thực (Live Location Sharing)',
    keywords: ['vị trí', 'location', 'bản đồ', 'tọa độ', 'định vị', 'đang ở đâu', 'live location', 'gps'],
    description:
      'ChatApp cho phép chia sẻ vị trí di chuyển theo thời gian thực (15 phút, 1 giờ, 8 giờ, 1 ngày) tích hợp radar nhấp nháy, đếm ngược tự động và mở Google Maps.',
    usageTips: 'Nhấn vào biểu tượng Pin vị trí cạnh ô soạn tin nhắn để bắt đầu chia sẻ vị trí.',
  },
  {
    id: 'file_transfer',
    title: 'Gửi tệp tin dung lượng lớn lên đến 100MB',
    keywords: ['gửi file', 'tệp', 'tài liệu', 'pdf', '100mb', 'dung lượng lớn', 'đính kèm', 'zip', 'docx'],
    description:
      'Hỗ trợ gửi mọi loại tài liệu văn phòng, ảnh chất lượng gốc, video và nén ZIP với kích thước lên đến 100MB và kiểm tra an toàn tệp.',
    usageTips: 'Nhấn vào biểu tượng kẹp giấy (Paperclip) trên thanh công cụ soạn tin để chọn tệp.',
  },
  {
    id: 'giphy_gifs',
    title: 'Kho ảnh động GIPHY triệu view & Masonry Layout',
    keywords: ['gif', 'ảnh động', 'giphy', 'meme', 'sticker', 'thác nước', 'masonry'],
    description:
      'Tìm kiếm và gửi hàng triệu ảnh động GIPHY thịnh hành với bố cục thác nước đa cột 2 hàng mượt mà, phân loại cảm xúc phong phú.',
    usageTips: 'Nhấn vào nút GIF ở khung bình luận hoặc trong ô soạn chat để tìm và gửi ảnh động.',
  },
  {
    id: 'facebook_reactions',
    title: 'Bộ 7 cảm xúc chuẩn Facebook (Reactions)',
    keywords: ['cảm xúc', 'reaction', 'thả tim', 'thích', 'haha', 'thương thương', 'wow', 'buồn', 'phẫn nộ', 'like'],
    description:
      'Thả 7 loại cảm xúc (Thích, Yêu thích, Thương thương, Haha, Wow, Buồn, Phẫn nộ) chuẩn phong cách Facebook trên bài viết, bình luận và tin nhắn.',
    usageTips: 'Di chuột hoặc giữ vào nút Thích hoặc biểu tượng cảm xúc tin nhắn để chọn biểu tượng.',
  },
  {
    id: 'chat_themes',
    title: 'Đổi chủ đề màu sắc cuộc trò chuyện',
    keywords: ['đổi màu', 'chủ đề', 'theme', 'giao diện chat', 'hồng', 'xanh', 'biển', 'bóng đêm'],
    description:
      'Hỗ trợ 5 chủ đề màu sắc: Mặc định, Hẹn hò lãng mạn, Bầu trời trong xanh, Bóng đêm huyền bí, Biển cả tươi mát.',
    usageTips: 'Bấm menu ba chấm ở đầu thanh tiêu đề chat và chọn "Đổi chủ đề".',
  },
  {
    id: 'gemini_summary',
    title: 'Tóm tắt bài viết & Cuộc trò chuyện bằng Llama 3.3 (Groq)',
    keywords: ['tóm tắt', 'summarize', 'gemini', 'ai', 'tổng hợp', 'ngắn gọn'],
    description:
      'Mô hình Llama 3.3 (Groq) tự động tóm lược 50 bình luận bài viết hoặc 50 tin nhắn gần nhất thành danh sách ngắn gọn và các đầu việc cần làm.',
    usageTips: 'Nhấn nút "Tóm tắt bình luận" trên bài viết hoặc menu "Tóm tắt hội thoại" trong chat.',
  },
  {
    id: 'friend_recommendations',
    title: 'Gợi ý bạn bè thông minh bằng đồ thị Neo4j',
    keywords: ['bạn bè', 'kết bạn', 'gợi ý', 'neo4j', 'tìm bạn', 'cạ cứng'],
    description:
      'Thuật toán đồ thị 2 tầng (Friends-of-Friends & Degree Centrality) tự động tìm kiếm những người có chung sở thích và mối quan hệ gần gũi nhất.',
    usageTips: 'Truy cập trang Khám phá (/explore) hoặc xem widget gợi ý ở thanh bên phải của Bảng tin.',
  },
  {
    id: 'in_chat_safety',
    title: 'Trợ lý an toàn In-Chat Safety Banner',
    keywords: ['lừa đảo', 'an toàn', 'chuyển tiền', 'stk', 'mật khẩu', 'otp', 'cảnh báo', 'safety'],
    description:
      'Hệ thống AI quét thời gian thực các tin nhắn chứa số tài khoản, mã OTP, yêu cầu chuyển tiền gấp để hiển thị banner cảnh báo an toàn tức thì.',
    usageTips: 'Hệ thống tự động kích hoạt bảo vệ bạn 24/7 mà không cần cài đặt thêm.',
  },
];

export const AURA_FUN_PROMPT_TEMPLATES = [
  {
    id: 'compare_activity',
    label: '🕵️ Bóc phốt ai nhắn nhiều hơn',
    prompt: '@aura bóc phốt xem trong đoạn chat này ai là người nhắn nhiều hơn và nói nhiều hơn? 😜',
  },
  {
    id: 'score_friendship',
    label: '💯 Chấm điểm cạ cứng',
    prompt: '@aura chấm điểm độ thân thiết và ăn ý của hai đứa tụi mình qua đoạn chat này xem nào! 🌟',
  },
  {
    id: 'food_arbitration',
    label: '🍜 Chọn kèo ăn uống',
    prompt: '@aura gợi ý giúp tụi mình hôm nay nên đi ăn gì hoặc chọn một quán ngon xem? 😋',
  },
  {
    id: 'friendship_poem',
    label: '📜 Làm thơ con cóc',
    prompt: '@aura làm một bài thơ 4 câu hài hước về tình bạn của hai đứa tụi tui dựa trên các câu chuyện đã chat 📝',
  },
  {
    id: 'chat_icebreaker',
    label: '💡 Gợi ý chủ đề chém gió',
    prompt: '@aura gợi ý một chủ đề cực cuốn để hai đứa tiếp tục tán gẫu hôm nay đi! 🔥',
  },
  {
    id: 'feature_help',
    label: '⚡ ChatApp có tính năng gì hot?',
    prompt: '@aura chỉ cho tui các tính năng xịn xò nhất của ChatApp mà tui nên thử ngay! 🚀',
  },
];

