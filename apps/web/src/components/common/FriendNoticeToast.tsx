"use client";

import NextLink from "next/link";
import { Alert, Button, Snackbar } from "@mui/material";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useFriendStore } from "@/store/useFriendStore";

/**
 * Thông báo realtime về bạn bè ở mọi trang: "X đã chấp nhận lời mời kết bạn" /
 * "X đã gửi cho bạn lời mời kết bạn". Đặt bottom-left để không đè khung chat nổi (bottom-right).
 */
export default function FriendNoticeToast() {
  const notice = useFriendStore((s) => s.notice);
  const dismissNotice = useFriendStore((s) => s.dismissNotice);

  const accepted = notice?.type === "accepted";

  return (
    <Snackbar
      // key: sự kiện mới thay toast cũ ngay, thay vì chờ toast cũ tắt
      key={notice?.id}
      open={Boolean(notice)}
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== "clickaway" && dismissNotice()}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      {notice ? (
        <Alert
          severity={accepted ? "success" : "info"}
          variant="filled"
          icon={<PresenceAvatar name={notice.name} src={notice.avatar} size={28} hidePresence />}
          onClose={dismissNotice}
          action={
            notice.userId ? (
              <Button
                component={NextLink}
                href={`/profile/${notice.userId}`}
                color="inherit"
                size="small"
                onClick={dismissNotice}
                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Xem hồ sơ
              </Button>
            ) : undefined
          }
          sx={{ width: "100%", alignItems: "center" }}
        >
          <strong>{notice.name}</strong>{" "}
          {accepted ? "đã chấp nhận lời mời kết bạn của bạn." : "đã gửi cho bạn lời mời kết bạn."}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
