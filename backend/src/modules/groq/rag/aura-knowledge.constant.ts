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
    id: 'app_overview',
    title: 'Tổng quan toàn bộ tính năng siêu ứng dụng ChatApp',
    keywords: ['tính năng', 'chức năng', 'có gì', 'làm được gì', 'tổng quan', 'chatapp có', 'app có', 'features'],
    description:
      'ChatApp là mạng xã hội & ứng dụng trò chuyện thời gian thực hiện đại, bao gồm: 1) Nhắn tin đa phương tiện & Nhóm chat đa người dùng (file 100MB, kho GIF, voice audio, 7 reactions Facebook, đổi màu chat); 2) Gọi thoại & Gọi video chất lượng cao WebRTC (1-1 và Gọi nhóm tối ưu Mesh với nhận diện người nói VAD); 3) Mạng xã hội Bảng tin (News Feed, đăng bài, bình luận ảnh/GIF); 4) Trang Fanpage doanh nghiệp & cá nhân; 5) Hội nhóm cộng đồng (Groups); 6) Trợ lý ảo AI Aura (Llama 3.3 70B, tóm tắt bài viết, tóm tắt chat, bóc phốt tương tác); 7) Chia sẻ vị trí thời gian thực (Live GPS); 8) Hệ thống AI kiểm duyệt an toàn, chống bot và lừa đảo 24/7; 9) Dark Mode & Hỗ trợ song ngữ Tiếng Việt/Tiếng Anh.',
    usageTips: 'Bạn có thể truy cập các tab Bảng tin, Khám phá, Trang, Nhóm, hoặc mở Đoạn chat để trải nghiệm ngay!',
  },
  {
    id: 'group_chat',
    title: 'Nhóm trò chuyện (Group Chat) đa người dùng',
    keywords: ['nhóm chat', 'tạo nhóm', 'group chat', 'thêm thành viên', 'quản trị viên nhóm', 'nhóm'],
    description:
      'ChatApp cho phép tạo nhóm trò chuyện không giới hạn, thêm/xóa thành viên, đặt tên & avatar nhóm, trao quyền Quản trị viên nhóm, ghim tin nhắn quan trọng và trò chuyện tức thì.',
    usageTips: 'Nhấn vào nút tạo nhóm (icon Users với dấu +) trong danh sách chat, đặt tên nhóm và chọn bạn bè tham gia.',
  },
  {
    id: 'group_call_webrtc',
    title: 'Gọi thoại & Gọi video nhóm tối ưu băng thông (WebRTC Mesh-Lite)',
    keywords: ['gọi nhóm', 'call nhóm', 'video nhóm', 'group call', 'họp nhóm', 'vad', 'tiết kiệm băng thông'],
    description:
      'Hỗ trợ gọi thoại & gọi video nhóm trực tiếp bằng WebRTC Mesh-Lite độ trễ cực thấp. Tự động nhận diện người đang nói (Voice Activity Detection - VAD) với viền xanh phát sáng, tối ưu độ phân giải 360p @ 15fps và trần âm thanh Opus 32kbps siêu nhẹ và mượt mà cho nhiều người cùng tham gia.',
    usageTips: 'Trong cửa sổ nhóm chat, nhấn biểu tượng Gọi thoại hoặc Gọi video ở thanh tiêu đề để bắt đầu cuộc gọi nhóm.',
  },
  {
    id: 'audio_video_call',
    title: 'Gọi thoại & Gọi video 1-1 WebRTC P2P chất lượng cao',
    keywords: ['gọi điện', 'gọi thoại', 'gọi video', 'call', 'video call', 'thoại', 'p2p'],
    description:
      'Gọi điện thoại và gọi video 1-1 sắc nét, mã hóa đầu cuối P2P qua WebRTC, hỗ trợ bật/tắt camera, micro, chuyển đổi camera và toàn màn hình mượt mà.',
    usageTips: 'Mở cửa sổ chat với người bạn muốn gọi, sau đó bấm biểu tượng điện thoại hoặc máy quay phim ở góc trên.',
  },
  {
    id: 'fanpages',
    title: 'Trang Fanpage MXH dành cho cá nhân & doanh nghiệp',
    keywords: ['fanpage', 'trang', 'page', 'tạo trang', 'doanh nghiệp', 'theo dõi trang'],
    description:
      'Tạo và quản lý các Trang Fanpage công khai theo danh mục (Công nghệ, Giải trí, Ẩm thực, Tin tức, Doanh nghiệp...), thu hút người theo dõi và đăng tải bài viết chính thức.',
    usageTips: 'Truy cập mục "Trang" trên thanh điều hướng để khám phá các trang nổi bật hoặc bấm "Tạo trang mới".',
  },
  {
    id: 'community_groups',
    title: 'Hội nhóm cộng đồng (Community Groups)',
    keywords: ['hội nhóm', 'cộng đồng', 'community group', 'nhóm mxh', 'nhóm công khai', 'nhóm riêng tư'],
    description:
      'Tạo hội nhóm theo sở thích, học tập hoặc thảo luận với chế độ Công khai (Public) hoặc Riêng tư (Private). Hỗ trợ xét duyệt thành viên, phân quyền Quản trị viên và bảng tin thảo luận nội bộ nhóm.',
    usageTips: 'Truy cập mục "Nhóm" trên thanh điều hướng để xem các nhóm bạn tham gia hoặc tạo nhóm cộng đồng mới.',
  },
  {
    id: 'social_feed_posts',
    title: 'Mạng xã hội: Bảng tin (News Feed) & Bài viết',
    keywords: ['bài viết', 'bảng tin', 'news feed', 'post', 'đăng bài', 'bình luận', 'chia sẻ'],
    description:
      'Đăng bài viết chia sẻ trạng thái, kèm tối đa 4 ảnh chất lượng cao hoặc video, tùy chỉnh quyền riêng tư (Công khai, Bạn bè, Chỉ mình tôi). Tương tác với 7 sắc thái cảm xúc, bình luận đa cấp kèm ảnh/GIF và chia sẻ bài viết về trang cá nhân.',
    usageTips: 'Vào Trang chủ (Bảng tin) và nhập nội dung vào ô "Bạn đang nghĩ gì thế?" để đăng bài.',
  },
  {
    id: 'voice_messages',
    title: 'Tin nhắn thoại trực quan (Voice Messages)',
    keywords: ['tin nhắn thoại', 'voice', 'ghi âm', 'âm thanh', 'voice message', 'sóng âm'],
    description:
      'Ghi âm và gửi tin nhắn thoại với giao diện hiển thị biểu đồ sóng âm thời gian thực, điều khiển phát/dừng và tua đoạn âm thanh tiện lợi.',
    usageTips: 'Nhấn và giữ biểu tượng Micro cạnh ô nhập tin nhắn để ghi âm và thả tay để gửi.',
  },
  {
    id: 'ai_moderation_engine',
    title: 'Hệ thống kiểm duyệt an toàn AI & Chống bot thông minh',
    keywords: ['kiểm duyệt', 'an toàn', 'chống bot', 'lừa đảo', 'moderation', 'trust engine', 'độc hại'],
    description:
      'Tích hợp đa mô hình học máy (NLP đa ngôn ngữ, Vision OCR, Isolation Forest và Autoencoder) tự động phát hiện ngôn từ độc hại, nội dung nhạy cảm, hành vi bot bất thường và cảnh báo lừa đảo số tài khoản/OTP trong tin nhắn.',
    usageTips: 'Hệ thống chạy ngầm tự động bảo vệ tài khoản và môi trường mạng xã hội lành mạnh suốt 24/7.',
  },
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
    id: 'groq_summary',
    title: 'Tóm tắt bài viết & Cuộc trò chuyện bằng Llama 3.3 (Groq)',
    keywords: ['tóm tắt', 'summarize', 'groq', 'llama', 'ai', 'tổng hợp', 'ngắn gọn'],
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

