import type { SupportedLanguage } from "./types";

export interface LangEntry {
  vi: string;
  en: string;
  "zh-CN": string;
  "zh-TW": string;
  ko: string;
  th: string;
}

/**
 * Bản đồ từ điển mở rộng tự động cho 6 ngôn ngữ.
 * Dùng để hỗ trợ hàm tr(vi, en) khi chuyển sang zh-CN, zh-TW, ko, th.
 */
export const AUTO_TRANSLATIONS: Record<string, Omit<LangEntry, "vi" | "en">> = {
  // Navigation & Headers
  "tin nhắn": { "zh-CN": "消息", "zh-TW": "訊息", ko: "메시지", th: "ข้อความ" },
  messages: { "zh-CN": "消息", "zh-TW": "訊息", ko: "메시지", th: "ข้อความ" },
  "hội thoại": { "zh-CN": "聊天", "zh-TW": "聊天", ko: "대화", th: "แชท" },
  "đoạn chat": { "zh-CN": "聊天", "zh-TW": "聊天", ko: "대화", th: "แชท" },
  chats: { "zh-CN": "聊天", "zh-TW": "聊天", ko: "대화", th: "แชท" },
  "bạn bè": { "zh-CN": "好友", "zh-TW": "好友", ko: "친구", th: "เพื่อน" },
  friends: { "zh-CN": "好友", "zh-TW": "好友", ko: "친구", th: "เพื่อน" },
  "thông báo": { "zh-CN": "通知", "zh-TW": "通知", ko: "알림", th: "การแจ้งเตือน" },
  notifications: { "zh-CN": "通知", "zh-TW": "通知", ko: "알림", th: "การแจ้งเตือน" },
  "thông báo hệ thống": { "zh-CN": "系统通知", "zh-TW": "系統通知", ko: "시스템 알림", th: "การแจ้งเตือนระบบ" },
  "system notifications": { "zh-CN": "系统通知", "zh-TW": "系統通知", ko: "시스템 알림", th: "การแจ้งเตือนระบบ" },

  // Chat Page (/chat)
  "tìm kiếm hội thoại…": { "zh-CN": "搜索聊天…", "zh-TW": "搜尋對話…", ko: "대화 검색…", th: "ค้นหาการสนทนา…" },
  "tìm kiếm hội thoại": { "zh-CN": "搜索聊天", "zh-TW": "搜尋對話", ko: "대화 검색", th: "ค้นหาการสนทนา" },
  "search conversations…": { "zh-CN": "搜索聊天…", "zh-TW": "搜尋對話…", ko: "대화 검색…", th: "ค้นหาการสนทนา…" },
  "search conversations": { "zh-CN": "搜索聊天", "zh-TW": "搜尋對話", ko: "대화 검색", th: "ค้นหาการสนทนา" },
  "hộp thư": { "zh-CN": "收件箱", "zh-TW": "收件匣", ko: "받은편지함", th: "กล่องข้อความ" },
  inbox: { "zh-CN": "收件箱", "zh-TW": "收件匣", ko: "받은편지함", th: "กล่องข้อความ" },
  "bị hạn chế": { "zh-CN": "受限制", "zh-TW": "已限制", ko: "제한됨", th: "ถูกจำกัด" },
  restricted: { "zh-CN": "受限制", "zh-TW": "已限制", ko: "제한됨", th: "ถูกจำกัด" },
  "chọn một cuộc trò chuyện": { "zh-CN": "选择一个对话", "zh-TW": "選擇一個對話", ko: "대화를 선택하세요", th: "เลือกการสนทนา" },
  "select a conversation": { "zh-CN": "选择一个对话", "zh-TW": "選擇一個對话", ko: "대화를 선택하세요", th: "เลือกการสนทนา" },
  "chọn một đoạn chat ở danh sách bên trái hoặc chuyển sang tab bạn bè để bắt đầu trò chuyện.": {
    "zh-CN": "在左侧选择聊天或打开好友标签即可开始实时聊天。",
    "zh-TW": "在左側選擇對話或開啟好友標籤即可開始即時通訊。",
    ko: "실시간 대화를 시작하려면 왼쪽에서 채팅을 선택하거나 친구 탭을 여세요.",
    th: "เลือกแชททางด้านซ้ายหรือเปิดแท็บเพื่อนเพื่อเริ่มส่งข้อความแบบเรียลไทม์",
  },
  "select a chat on the left or open the friends tab to start messaging in real time.": {
    "zh-CN": "在左侧选择聊天或打开好友标签即可开始实时聊天。",
    "zh-TW": "在左側選擇對話或開啟好友標籤即可開始即時通訊。",
    ko: "실시간 대화를 시작하려면 왼쪽에서 채팅을 선택하거나 친구 탭을 여세요.",
    th: "เลือกแชททางด้านซ้ายหรือเปิดแท็บเพื่อนเพื่อเริ่มส่งข้อความแบบเรียลไทม์",
  },
  "chọn hội thoại ở danh sách bên trái hoặc mở tab bạn bè để bắt đầu nhắn tin theo thời gian thực.": {
    "zh-CN": "在左侧列表中选择一个对话或打开好友选项卡以开始实时聊天。",
    "zh-TW": "在左側列表中選擇一個對話或開啟好友標籤以開始即時聊天。",
    ko: "실시간 대화를 시작하려면 왼쪽 목록에서 대화를 선택하거나 친구 탭을 여세요.",
    th: "เลือกการสนทนาในรายการด้านซ้ายหรือเปิดแท็บเพื่อนเพื่อเริ่มการส่งข้อความแบบเรียลไทม์",
  },
  "thêm bạn": { "zh-CN": "添加好友", "zh-TW": "加為好友", ko: "친구 추가", th: "เพิ่มเพื่อน" },
  "chưa có thông báo nào": { "zh-CN": "暂无通知", "zh-TW": "暫無通知", ko: "알림이 없습니다", th: "ยังไม่มีการแจ้งเตือน" },
  "no notifications yet": { "zh-CN": "暂无通知", "zh-TW": "暫無通知", ko: "알림이 없습니다", th: "ยังไม่มีการแจ้งเตือน" },
  "bạn sẽ nhận được thông báo khi có người kết bạn hoặc tương tác.": {
    "zh-CN": "当有人加你为好友或互动时，你将在此收到通知。",
    "zh-TW": "當有人加你為好友或互動時，你將在此收到通知。",
    ko: "누군가 친구 요청을 하거나 반응을 보이면 알림을 받게 됩니다.",
    th: "คุณจะได้รับการแจ้งเตือนเมื่อมีคนเพิ่มคุณเป็นเพื่อนหรือโต้ตอบกับคุณ",
  },
  "you'll receive notifications when someone adds you or interacts with your posts.": {
    "zh-CN": "当有人加你为好友或互动时，你将在此收到通知。",
    "zh-TW": "當有人加你為好友或互動時，你將在此收到通知。",
    ko: "누군가 친구 요청을 하거나 반응을 보이면 알림을 받게 됩니다.",
    th: "คุณจะได้รับการแจ้งเตือนเมื่อมีคนเพิ่มคุณเป็นเพื่อนหรือโต้ตอบกับคุณ",
  },
  "không tìm thấy hội thoại": { "zh-CN": "未找到聊天", "zh-TW": "找不到對話", ko: "대화를 찾을 수 없습니다", th: "ไม่พบการสนทนา" },
  "no conversations found": { "zh-CN": "未找到聊天", "zh-TW": "找不到對話", ko: "대화를 찾을 수 없습니다", th: "ไม่พบการสนทนา" },
  "chưa có cuộc trò chuyện nào": { "zh-CN": "暂无对话", "zh-TW": "尚無任何對話", ko: "아직 대화가 없습니다", th: "ยังไม่มีการสนทนา" },
  "no conversations yet": { "zh-CN": "暂无对话", "zh-TW": "尚無任何對話", ko: "아직 대화가 없습니다", th: "ยังไม่มีการสนทนา" },
  "chọn một người bạn để bắt đầu nhắn tin.": { "zh-CN": "选择一位好友开始聊天。", "zh-TW": "選擇一位好友開始聊天。", ko: "대화를 시작할 친구를 선택하세요.", th: "เลือกเพื่อนเพื่อเริ่มส่งข้อความ" },
  "select a friend to start chatting.": { "zh-CN": "选择一位好友开始聊天。", "zh-TW": "選擇一位好友開始聊天。", ko: "대화를 시작할 친구를 선택하세요.", th: "เลือกเพื่อนเพื่อเริ่มส่งข้อความ" },
  "mở danh sách bạn bè": { "zh-CN": "打开好友列表", "zh-TW": "開啟好友名單", ko: "친구 목록 열기", th: "เปิดรายชื่อเพื่อน" },
  "open friends list": { "zh-CN": "打开好友列表", "zh-TW": "開啟好友名單", ko: "친구 목록 열기", th: "เปิดรายชื่อเพื่อน" },
  "tìm bạn mới": { "zh-CN": "结识新好友", "zh-TW": "尋找新朋友", ko: "새 친구 찾기", th: "หาเพื่อนใหม่" },
  "find new friends": { "zh-CN": "结识新好友", "zh-TW": "尋找新朋友", ko: "새 친구 찾기", th: "หาเพื่อนใหม่" },
  "tạo nhóm chat mới": { "zh-CN": "创建新群聊", "zh-TW": "建立新群組", ko: "새 그룹 채팅 만들기", th: "สร้างกลุ่มแชทใหม่" },
  "create new group chat": { "zh-CN": "创建新群聊", "zh-TW": "建立新群組", ko: "새 그룹 채팅 만들기", th: "สร้างกลุ่มแชทใหม่" },
  "không có đoạn chat bị hạn chế": { "zh-CN": "无受限制的聊天", "zh-TW": "沒有受限制的對話", ko: "제한된 대화가 없습니다", th: "ไม่มีแชทที่ถูกจำกัด" },
  "no restricted chats": { "zh-CN": "无受限制的聊天", "zh-TW": "沒有受限制的對話", ko: "제한된 대화가 없습니다", th: "ไม่มีแชทที่ถูกจำกัด" },
  "bắt đầu cuộc trò chuyện…": { "zh-CN": "开启一段对话…", "zh-TW": "開始一段對話…", ko: "대화 시작하기…", th: "เริ่มการสนทนา…" },
  "start a conversation…": { "zh-CN": "开启一段对话…", "zh-TW": "開始一段對話…", ko: "대화 시작하기…", th: "เริ่มการสนทนา…" },
  "nhóm chat": { "zh-CN": "群聊", "zh-TW": "群組聊天", ko: "그룹 채팅", th: "แชทกลุ่ม" },
  "group chat": { "zh-CN": "群聊", "zh-TW": "群組聊天", ko: "그룹 채팅", th: "แชทกลุ่ม" },
  "người dùng": { "zh-CN": "用户", "zh-TW": "使用者", ko: "사용자", th: "ผู้ใช้" },
  user: { "zh-CN": "用户", "zh-TW": "使用者", ko: "사용자", th: "ผู้ใช้" },
  "bạn": { "zh-CN": "你", "zh-TW": "你", ko: "나", th: "คุณ" },
  you: { "zh-CN": "你", "zh-TW": "你", ko: "나", th: "คุณ" },
  "chưa có tin nhắn nào": { "zh-CN": "暂无消息", "zh-TW": "尚無訊息", ko: "메시지가 없습니다", th: "ยังไม่มีข้อความ" },
  "no messages yet": { "zh-CN": "暂无消息", "zh-TW": "尚無訊息", ko: "메시지가 없습니다", th: "ยังไม่มีข้อความ" },
  "tin nhắn đã bị thu hồi": { "zh-CN": "消息已被撤回", "zh-TW": "訊息已收回", ko: "메시지가 취소되었습니다", th: "ข้อความถูกยกเลิกแล้ว" },
  "message unsent": { "zh-CN": "消息已被撤回", "zh-TW": "訊息已收回", ko: "메시지가 취소되었습니다", th: "ข้อความถูกยกเลิกแล้ว" },

  // Messenger Popover
  "tìm kiếm trên messenger": { "zh-CN": "在 Messenger 中搜索", "zh-TW": "在 Messenger 中搜尋", ko: "Messenger 검색", th: "ค้นหาบน Messenger" },
  "search messenger": { "zh-CN": "在 Messenger 中搜索", "zh-TW": "在 Messenger 中搜尋", ko: "Messenger 검색", th: "ค้นหาบน Messenger" },
  "tất cả": { "zh-CN": "全部", "zh-TW": "全部", ko: "전체", th: "ทั้งหมด" },
  all: { "zh-CN": "全部", "zh-TW": "全部", ko: "전체", th: "ทั้งหมด" },
  "chưa đọc": { "zh-CN": "未读", "zh-TW": "未讀", ko: "읽지 않음", th: "ยังไม่ได้อ่าน" },
  unread: { "zh-CN": "未读", "zh-TW": "未讀", ko: "읽지 않음", th: "ยังไม่ได้อ่าน" },
  "xem tất cả trong phòng chat": { "zh-CN": "在 Messenger 中查看全部", "zh-TW": "在 Messenger 中查看全部", ko: "Messenger에서 모두 보기", th: "ดูทั้งหมดใน Messenger" },
  "xem tất cả trong messenger": { "zh-CN": "在 Messenger 中查看全部", "zh-TW": "在 Messenger 中查看全部", ko: "Messenger에서 모두 보기", th: "ดูทั้งหมดใน Messenger" },
  "see all in messenger": { "zh-CN": "在 Messenger 中查看全部", "zh-TW": "在 Messenger 中查看全部", ko: "Messenger에서 모두 보기", th: "ดูทั้งหมดใน Messenger" },
  "tùy chọn đoạn chat": { "zh-CN": "聊天选项", "zh-TW": "聊天選項", ko: "채팅 옵션", th: "ตัวเลือกแชท" },
  "chat options": { "zh-CN": "聊天选项", "zh-TW": "聊天選項", ko: "채팅 옵션", th: "ตัวเลือกแชท" },
  "tin nhắn mới": { "zh-CN": "新消息", "zh-TW": "新訊息", ko: "새 메시지", th: "ข้อความใหม่" },
  "new message": { "zh-CN": "新消息", "zh-TW": "新訊息", ko: "새 메시지", th: "ข้อความใหม่" },

  // Explore Page (/explore)
  "khám phá bạn bè": { "zh-CN": "发现好友", "zh-TW": "探索好友", ko: "친구 탐색", th: "ค้นหาเพื่อน" },
  "explore friends": { "zh-CN": "发现好友", "zh-TW": "探索好友", ko: "친구 탐색", th: "ค้นหาเพื่อน" },
  "tìm kiếm người quen, kết nối bạn bè quanh đây và quản lý lời mời kết bạn.": {
    "zh-CN": "结识认识的人，与附近好友建立联系，并管理好友请求。",
    "zh-TW": "尋找認識的人，與附近好友建立連結，並管理交友邀請。",
    ko: "아는 사람을 찾고, 주변 친구와 연결하며, 친구 요청을 관리하세요.",
    th: "ค้นหาคนที่คุณรู้จัก เชื่อมต่อกับเพื่อนใกล้เคียง และจัดการคำขอเป็นเพื่อน",
  },
  "find people you know, connect with friends nearby, and manage friend requests.": {
    "zh-CN": "结识认识的人，与附近好友建立联系，并管理好友请求。",
    "zh-TW": "尋找認識的人，與附近好友建立連結，並管理交友邀請。",
    ko: "아는 사람을 찾고, 주변 친구와 연결하며, 친구 요청을 관리하세요.",
    th: "ค้นหาคนที่คุณรู้จัก เชื่อมต่อกับเพื่อนใกล้เคียง และจัดการคำขอเป็นเพื่อน",
  },
  "tìm bạn bè quanh đây": { "zh-CN": "查找附近好友", "zh-TW": "尋找附近好友", ko: "주변 친구 찾기", th: "ค้นหาเพื่อนใกล้เคียง" },
  "find friends nearby": { "zh-CN": "查找附近好友", "zh-TW": "尋找附近好友", ko: "주변 친구 찾기", th: "ค้นหาเพื่อนใกล้เคียง" },
  "cập nhật vị trí quanh đây": { "zh-CN": "更新附近位置", "zh-TW": "更新附近位置", ko: "주변 위치 업데이트", th: "อัปเดตตำแหน่งใกล้เคียง" },
  "update nearby location": { "zh-CN": "更新附近位置", "zh-TW": "更新附近位置", ko: "주변 위치 업데이트", th: "อัปเดตตำแหน่งใกล้เคียง" },
  "đang định vị…": { "zh-CN": "正在定位…", "zh-TW": "正在定位…", ko: "위치 확인 중…", th: "กำลังระบุตำแหน่ง…" },
  "locating…": { "zh-CN": "正在定位…", "zh-TW": "正在定位…", ko: "위치 확인 중…", th: "กำลังระบุตำแหน่ง…" },
  "nhập tên hoặc email người dùng cần tìm…": { "zh-CN": "输入姓名或邮箱进行搜索…", "zh-TW": "輸入姓名或電子郵件進行搜尋…", ko: "이름 또는 이메일을 입력하여 검색…", th: "ป้อนชื่อหรืออีเมลเพื่อค้นหา…" },
  "enter name or email to search…": { "zh-CN": "输入姓名或邮箱进行搜索…", "zh-TW": "輸入姓名或電子郵件進行搜尋…", ko: "이름 또는 이메일을 입력하여 검색…", th: "ป้อนชื่อหรืออีเมลเพื่อค้นหา…" },
  "gợi ý cho bạn": { "zh-CN": "为你推荐", "zh-TW": "為你推薦", ko: "회원님을 위한 추천", th: "คำแนะนำสำหรับคุณ" },
  "suggestions for you": { "zh-CN": "为你推荐", "zh-TW": "為你推薦", ko: "회원님을 위한 추천", th: "คำแนะนำสำหรับคุณ" },
  "lời mời kết bạn": { "zh-CN": "好友请求", "zh-TW": "交友邀請", ko: "친구 요청", th: "คำขอเป็นเพื่อน" },
  "friend requests": { "zh-CN": "好友请求", "zh-TW": "交友邀請", ko: "친구 요청", th: "คำขอเป็นเพื่อน" },
  "chưa có gợi ý kết bạn mới": { "zh-CN": "暂无新好友推荐", "zh-TW": "尚無新好友推薦", ko: "새로운 추천 친구가 없습니다", th: "ไม่มีคำแนะนำเพื่อนใหม่" },
  "no new friend suggestions": { "zh-CN": "暂无新好友推荐", "zh-TW": "尚無新好友推薦", ko: "새로운 추천 친구가 없습니다", th: "ไม่มีคำแนะนำเพื่อนใหม่" },
  "không có lời mời kết bạn": { "zh-CN": "无好友请求", "zh-TW": "沒有交友邀請", ko: "친구 요청 없음", th: "ไม่มีคำขอเป็นเพื่อน" },
  "no friend requests": { "zh-CN": "无好友请求", "zh-TW": "沒有交友邀請", ko: "친구 요청 없음", th: "ไม่มีคำขอเป็นเพื่อน" },
  "chưa có bạn bè nào": { "zh-CN": "暂无好友", "zh-TW": "尚無好友", ko: "아직 친구가 없습니다", th: "ยังไม่มีเพื่อน" },
  "no friends yet": { "zh-CN": "暂无好友", "zh-TW": "尚無好友", ko: "아직 친구가 없습니다", th: "ยังไม่มีเพื่อน" },
  "hãy thử tìm bằng tên hiển thị khác hoặc kiểm tra lại chính tả.": {
    "zh-CN": "请尝试搜索其他显示名称或检查拼写是否正确。",
    "zh-TW": "請嘗試搜尋其他顯示名稱或檢查拼字是否正確。",
    ko: "다른 닉네임으로 검색하거나 맞춤법을 확인해 보세요.",
    th: "ลองค้นหาด้วยชื่ออื่นหรือตรวจสอบตัวสะกด",
  },
  "try searching with a different display name or check your spelling.": {
    "zh-CN": "请尝试搜索其他显示名称或检查拼写是否正确。",
    "zh-TW": "請嘗試搜尋其他顯示名稱或檢查拼字是否正確。",
    ko: "다른 닉네임으로 검색하거나 맞춤법을 확인해 보세요.",
    th: "ลองค้นหาด้วยชื่ออื่นหรือตรวจสอบตัวสะกด",
  },
  "hãy bật định vị quanh đây hoặc sử dụng ô tìm kiếm phía trên để kết nối với bạn bè.": {
    "zh-CN": "请开启附近定位或使用上方搜索框结识好友。",
    "zh-TW": "請開啟附近定位或使用上方搜尋列結識好友。",
    ko: "주변 위치를 활성화하거나 상단 검색창을 사용하여 친구와 연결하세요.",
    th: "เปิดใช้งานตำแหน่งใกล้เคียงหรือใช้ช่องค้นหาด้านบนเพื่อเชื่อมต่อกับเพื่อนๆ",
  },
  "enable nearby location or use the search box above to connect with friends.": {
    "zh-CN": "请开启附近定位或使用上方搜索框结识好友。",
    "zh-TW": "請開啟附近定位或使用上方搜尋列結識好友。",
    ko: "주변 위치를 활성화하거나 상단 검색창을 사용하여 친구와 연결하세요.",
    th: "เปิดใช้งานตำแหน่งใกล้เคียงหรือใช้ช่องค้นหาด้านบนเพื่อเชื่อมต่อกับเพื่อนๆ",
  },

  // User Cards & Actions
  "thành viên chatapp": { "zh-CN": "ChatApp 成员", "zh-TW": "ChatApp 成員", ko: "ChatApp 회원", th: "สมาชิก ChatApp" },
  "chatapp member": { "zh-CN": "ChatApp 成员", "zh-TW": "ChatApp 成員", ko: "ChatApp 회원", th: "สมาชิก ChatApp" },
  "kết bạn": { "zh-CN": "添加好友", "zh-TW": "加為好友", ko: "친구 추가", th: "เพิ่มเพื่อน" },
  "add friend": { "zh-CN": "添加好友", "zh-TW": "加為好友", ko: "친구 추가", th: "เพิ่มเพื่อน" },
  "đã gửi": { "zh-CN": "已发送", "zh-TW": "已發送", ko: "전송됨", th: "ส่งแล้ว" },
  sent: { "zh-CN": "已发送", "zh-TW": "已發送", ko: "전송됨", th: "ส่งแล้ว" },
  "hủy lời mời đã gửi": { "zh-CN": "取消已发送的请求", "zh-TW": "取消已發送的邀請", ko: "보낸 요청 취소", th: "ยกเลิกคำขอที่ส่งแล้ว" },
  "cancel sent request": { "zh-CN": "取消已发送的请求", "zh-TW": "取消已發送的邀請", ko: "보낸 요청 취소", th: "ยกเลิกคำขอที่ส่งแล้ว" },
  "đồng ý": { "zh-CN": "同意", "zh-TW": "接受", ko: "수락", th: "ยอมรับ" },
  accept: { "zh-CN": "同意", "zh-TW": "接受", ko: "수락", th: "ยอมรับ" },
  "từ chối": { "zh-CN": "拒绝", "zh-TW": "拒絕", ko: "거절", th: "ปฏิเสธ" },
  decline: { "zh-CN": "拒绝", "zh-TW": "拒絕", ko: "거절", th: "ปฏิเสธ" },
  "từ chối lời mời": { "zh-CN": "拒绝请求", "zh-TW": "拒絕邀請", ko: "요청 거절", th: "ปฏิเสธคำขอ" },
  "decline request": { "zh-CN": "拒绝请求", "zh-TW": "拒絕邀請", ko: "요청 거절", th: "ปฏิเสธคำขอ" },
  "nhắn tin": { "zh-CN": "发消息", "zh-TW": "傳送訊息", ko: "메시지 보내기", th: "ส่งข้อความ" },
  message: { "zh-CN": "发消息", "zh-TW": "傳送訊息", ko: "메시지 보내기", th: "ส่งข้อความ" },
  "bạn chung": { "zh-CN": "共同好友", "zh-TW": "共同朋友", ko: "함께 아는 친구", th: "เพื่อนที่มีร่วมกัน" },
  "mutual friends": { "zh-CN": "共同好友", "zh-TW": "共同朋友", ko: "함께 아는 친구", th: "เพื่อนที่มีร่วมกัน" },
  "tài khoản uy tín": { "zh-CN": "受信账户", "zh-TW": "認證信譽帳戶", ko: "신뢰할 수 있는 계정", th: "บัญชีที่น่าเชื่อถือ" },
  "trusted account": { "zh-CN": "受信账户", "zh-TW": "認證信譽帳戶", ko: "신뢰할 수 있는 계정", th: "บัญชีที่น่าเชื่อถือ" },
  online: { "zh-CN": "在线", "zh-TW": "線上", ko: "온라인", th: "ออนไลน์" },
  "trực tuyến": { "zh-CN": "在线", "zh-TW": "線上", ko: "온라인", th: "ออนไลน์" },
  marketplace: { "zh-CN": "Marketplace", "zh-TW": "Marketplace", ko: "Marketplace", th: "Marketplace" },

  // Common Dialogs & General UI
  "xác nhận": { "zh-CN": "确认", "zh-TW": "確認", ko: "확인", th: "ยืนยัน" },
  confirm: { "zh-CN": "确认", "zh-TW": "確認", ko: "확인", th: "ยืนยัน" },
  hủy: { "zh-CN": "取消", "zh-TW": "取消", ko: "취소", th: "ยกเลิก" },
  cancel: { "zh-CN": "取消", "zh-TW": "取消", ko: "취소", th: "ยกเลิก" },
  đóng: { "zh-CN": "关闭", "zh-TW": "關閉", ko: "닫기", th: "ปิด" },
  close: { "zh-CN": "关闭", "zh-TW": "關閉", ko: "닫기", th: "ปิด" },
  lưu: { "zh-CN": "保存", "zh-TW": "儲存", ko: "저장", th: "บันทึก" },
  save: { "zh-CN": "保存", "zh-TW": "儲存", ko: "저장", th: "บันทึก" },
  "chỉnh sửa": { "zh-CN": "编辑", "zh-TW": "編輯", ko: "편집", th: "แก้ไข" },
  edit: { "zh-CN": "编辑", "zh-TW": "編輯", ko: "편집", th: "แก้ไข" },
  xóa: { "zh-CN": "删除", "zh-TW": "刪除", ko: "삭제", th: "ลบ" },
  delete: { "zh-CN": "删除", "zh-TW": "刪除", ko: "삭제", th: "ลบ" },
  "xem thêm": { "zh-CN": "查看更多", "zh-TW": "查看更多", ko: "더 보기", th: "ดูเพิ่มเติม" },
  "see more": { "zh-CN": "查看更多", "zh-TW": "查看更多", ko: "더 보기", th: "ดูเพิ่มเติม" },
  "thu gọn": { "zh-CN": "收起", "zh-TW": "收起", ko: "접기", th: "ย่อลง" },
  "see less": { "zh-CN": "收起", "zh-TW": "收起", ko: "접기", th: "ย่อลง" },
  "xem tất cả": { "zh-CN": "查看全部", "zh-TW": "查看全部", ko: "모두 보기", th: "ดูทั้งหมด" },
  "see all": { "zh-CN": "查看全部", "zh-TW": "查看全部", ko: "모두 보기", th: "ดูทั้งหมด" },
  "đang tải…": { "zh-CN": "正在加载…", "zh-TW": "載入中…", ko: "로딩 중…", th: "กำลังโหลด…" },
  "loading…": { "zh-CN": "正在加载…", "zh-TW": "載入中…", ko: "로딩 중…", th: "กำลังโหลด…" },
  "đang tải": { "zh-CN": "正在加载", "zh-TW": "載入中", ko: "로딩 중", th: "กำลังโหลด" },
  loading: { "zh-CN": "正在加载", "zh-TW": "載入中", ko: "로딩 중", th: "กำลังโหลด" },
};

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tra cứu bản dịch cho 1 cặp tiếng Việt / tiếng Anh sang 4 ngôn ngữ phụ:
 * zh-CN, zh-TW, ko, th.
 */
export function getAutoTranslation(
  viText: string,
  enText: string | undefined,
  targetLang: SupportedLanguage
): string | undefined {
  if (targetLang === "vi") return viText;
  if (targetLang === "en") return enText || viText;

  const keyVi = normalizeKey(viText);
  const keyEn = enText ? normalizeKey(enText) : "";

  // 1. Khớp chính xác
  if (AUTO_TRANSLATIONS[keyVi]?.[targetLang]) {
    return AUTO_TRANSLATIONS[keyVi][targetLang];
  }
  if (keyEn && AUTO_TRANSLATIONS[keyEn]?.[targetLang]) {
    return AUTO_TRANSLATIONS[keyEn][targetLang];
  }

  // 2. Khớp chuỗi có chứa số đếm ở cuối: "Tiêu đề (số)" hoặc "Title (number)"
  // Ví dụ: "Gợi ý cho bạn (6)" -> "คำแนะนำสำหรับคุณ (6)"
  const parenMatchVi = keyVi.match(/^(.+?)\s*\(([0-9]+)\)$/);
  const parenMatchEn = keyEn ? keyEn.match(/^(.+?)\s*\(([0-9]+)\)$/) : null;

  if (parenMatchVi || parenMatchEn) {
    const baseVi = parenMatchVi ? parenMatchVi[1].trim() : "";
    const baseEn = parenMatchEn ? parenMatchEn[1].trim() : "";
    const count = parenMatchVi ? parenMatchVi[2] : parenMatchEn ? parenMatchEn[2] : "";

    const transBase =
      (baseVi && AUTO_TRANSLATIONS[baseVi]?.[targetLang]) ||
      (baseEn && AUTO_TRANSLATIONS[baseEn]?.[targetLang]);

    if (transBase) {
      return `${transBase} (${count})`;
    }
  }

  // 3. Khớp chuỗi bắt đầu bằng số: "3 online", "5 members", "2 mutual friends"
  const prefixNumMatch = (enText || viText).match(/^([0-9]+)\s+(.+)$/);
  if (prefixNumMatch) {
    const num = prefixNumMatch[1];
    const unitKey = normalizeKey(prefixNumMatch[2]);
    const transUnit = AUTO_TRANSLATIONS[unitKey]?.[targetLang];
    if (transUnit) {
      return `${num} ${transUnit}`;
    }
  }

  // 4. Khớp chuỗi kết thúc bằng dấu ba chấm "…" hoặc "..."
  if (keyVi.endsWith("…") || keyVi.endsWith("...")) {
    const baseVi = keyVi.replace(/(…|\.\.\.)$/, "").trim();
    const baseEn = keyEn.replace(/(…|\.\.\.)$/, "").trim();
    const transBase =
      AUTO_TRANSLATIONS[baseVi]?.[targetLang] ||
      (baseEn && AUTO_TRANSLATIONS[baseEn]?.[targetLang]);
    if (transBase) {
      return `${transBase}…`;
    }
  }

  return undefined;
}
