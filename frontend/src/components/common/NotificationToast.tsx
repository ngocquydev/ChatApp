"use client";

import NextLink from "next/link";
import { Alert, Button, Snackbar } from "@mui/material";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useTranslation } from "@/i18n/useTranslation";

/**
 * Toast thông báo tương tác realtime (thả cảm xúc, bình luận, chia sẻ bài viết)
 * Nằm ở góc dưới cùng bên trái, tự động ẩn sau 5 giây.
 */
export default function NotificationToast() {
  const activeNotice = useNotificationStore((s) => s.activeNotice);
  const dismissNotice = useNotificationStore((s) => s.dismissNotice);
  const { tr } = useTranslation();

  const contentSnippet = activeNotice
    ? activeNotice.content.startsWith(activeNotice.actor.name)
      ? activeNotice.content.slice(activeNotice.actor.name.length).trim()
      : activeNotice.content
    : "";

  return (
    <Snackbar
      key={activeNotice?._id}
      open={Boolean(activeNotice)}
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== "clickaway" && dismissNotice()}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      sx={{ bottom: { xs: 80, sm: 88 } }}
    >
      {activeNotice ? (
        <Alert
          severity="info"
          variant="filled"
          icon={
            <PresenceAvatar
              name={activeNotice.actor.name}
              src={activeNotice.actor.avatar}
              size={32}
              hidePresence
            />
          }
          onClose={dismissNotice}
          action={
            activeNotice.link ? (
              <Button
                component={NextLink}
                href={activeNotice.link}
                color="inherit"
                size="small"
                onClick={dismissNotice}
                sx={{ fontWeight: 700, whiteSpace: "nowrap", ml: 1 }}
              >
                {tr("Xem", "View")}
              </Button>
            ) : undefined
          }
          sx={{
            width: "100%",
            maxWidth: 420,
            alignItems: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            borderRadius: "14px",
            bgcolor: "var(--mui-palette-neutral-900)",
            color: "white",
            "& .MuiAlert-icon": { color: "var(--mui-palette-brand-400)" },
          }}
        >
          <strong>{activeNotice.actor.name}</strong> {contentSnippet}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

