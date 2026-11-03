"use client";

import { useRouter } from "next/navigation";
import { Alert, Button, Snackbar } from "@mui/material";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useNotificationStore } from "@/store/useNotificationStore";
import { usePostModalStore } from "@/store/usePostModalStore";
import { useTranslation } from "@/i18n/useTranslation";

/**
 * Toast thông báo tương tác realtime (thả cảm xúc, bình luận, chia sẻ bài viết)
 * Nằm ở góc dưới cùng bên trái, tự động ẩn sau 6 giây.
 */
export default function NotificationToast() {
  const router = useRouter();
  const activeNotice = useNotificationStore((s) => s.activeNotice);
  const dismissNotice = useNotificationStore((s) => s.dismissNotice);
  const { tr } = useTranslation();

  const handleOpenNotice = () => {
    if (!activeNotice) return;
    const targetPostId =
      (activeNotice.metadata?.postId as string | undefined) ||
      (activeNotice.metadata?.originalPostId as string | undefined) ||
      (activeNotice.metadata?.sharedPostId as string | undefined);

    dismissNotice();
    if (targetPostId) {
      usePostModalStore.getState().openPostModal(targetPostId);
    } else if (activeNotice.link) {
      router.push(activeNotice.link);
    }
  };

  const contentSnippet = activeNotice
    ? activeNotice.content.startsWith(activeNotice.actor.name)
      ? activeNotice.content.slice(activeNotice.actor.name.length).trim()
      : activeNotice.content
    : "";

  const hasTarget = Boolean(
    activeNotice?.metadata?.postId ||
    activeNotice?.metadata?.originalPostId ||
    activeNotice?.metadata?.sharedPostId ||
    activeNotice?.link
  );

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
            hasTarget ? (
              <Button
                color="inherit"
                size="small"
                onClick={handleOpenNotice}
                sx={{ fontWeight: 700, whiteSpace: "nowrap", ml: 1 }}
              >
                {tr("Xem", "View")}
              </Button>
            ) : undefined
          }
          onClick={handleOpenNotice}
          sx={{
            width: "100%",
            maxWidth: 420,
            alignItems: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            borderRadius: "14px",
            bgcolor: "var(--mui-palette-neutral-900)",
            color: "white",
            cursor: hasTarget ? "pointer" : "default",
            "& .MuiAlert-icon": { color: "var(--mui-palette-brand-400)" },
          }}
        >
          <strong>{activeNotice.actor.name}</strong> {contentSnippet}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

