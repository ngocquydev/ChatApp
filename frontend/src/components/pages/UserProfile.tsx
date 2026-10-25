"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Container, Skeleton, Snackbar } from "@mui/material";
import { UserX } from "lucide-react";
import AuthGuard from "@/components/common/AuthGuard";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import ProfileTimeline from "@/components/posts/ProfileTimeline";
import UserProfileHeader from "@/components/posts/UserProfileHeader";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { APP_BAR_HEIGHT } from "@/theme/tokens";

type Toast = { message: string; severity: "success" | "error" | "info" } | null;

function UserProfileContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { user: me } = useAuthStore();
  const myId = (me?._id || me?.id) as string | undefined;
  const { profile, status, error, notFound, reload, refresh } = usePublicProfile(userId);
  const { sendFriendRequest, cancelRequest, respondToRequest, unfriend } = useFriendStore();
  const notice = useFriendStore((s) => s.notice);
  const { startConversationWithUser } = useChatStore();

  const [pending, setPending] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // Hồ sơ của chính mình nằm ở /profile (có đầy đủ chỉnh sửa)
  useEffect(() => {
    if (myId && myId === userId) router.replace("/profile");
  }, [myId, userId, router]);

  // Người đang xem vừa chấp nhận / gửi lời mời cho mình → cập nhật nút quan hệ ngay
  const noticeUserId = notice?.userId;
  const noticeId = notice?.id;
  useEffect(() => {
    if (noticeId && noticeUserId === userId) void refresh();
  }, [noticeId, noticeUserId, userId, refresh]);

  const runAction = async (action: () => Promise<{ success: boolean; message: string }>) => {
    setPending(true);
    try {
      const result = await action();
      setToast({ message: result.message, severity: result.success ? "success" : "error" });
      if (result.success) await refresh();
    } finally {
      setPending(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    await startConversationWithUser({
      _id: profile.user._id,
      name: profile.user.name,
      email: "",
      avatar: profile.user.avatar,
    });
    router.push("/chat");
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pt: `${APP_BAR_HEIGHT + 16}px`, pb: 6 }}>
      <Container maxWidth="lg" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {status === "loading" && (
          <Box aria-busy="true" aria-label="Đang tải trang cá nhân">
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: "16px" }} />
          </Box>
        )}

        {status === "error" && (
          <Box sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <EmptyState
              icon={<UserX size={26} />}
              title={notFound ? "Không tìm thấy người dùng" : "Không tải được trang cá nhân"}
              description={error}
              action={
                notFound ? (
                  <Button variant="contained" onClick={() => router.push("/")}>
                    Về bảng tin
                  </Button>
                ) : (
                  <Button variant="contained" onClick={reload}>
                    Thử lại
                  </Button>
                )
              }
            />
          </Box>
        )}

        {status === "ready" && profile && (
          <>
            <UserProfileHeader
              profile={profile}
              pending={pending}
              onSendRequest={() => void runAction(() => sendFriendRequest(userId))}
              onCancelRequest={() =>
                void runAction(() => cancelRequest(profile.requestId ?? ""))
              }
              onRespond={(action) =>
                void runAction(() => respondToRequest(profile.requestId ?? "", action))
              }
              onUnfriend={() => setConfirmUnfriend(true)}
              onMessage={() => void handleMessage()}
            />
            <ProfileTimeline userId={userId} isOwner={false} profile={profile} currentUserId={myId} />
          </>
        )}
      </Container>

      <ConfirmDialog
        open={confirmUnfriend}
        title="Hủy kết bạn?"
        description={
          <>
            Bạn sẽ không còn là bạn bè với <strong>{profile?.user.name}</strong>. Bạn sẽ không thấy bài viết dành cho bạn bè của họ nữa.
          </>
        }
        confirmLabel="Hủy kết bạn"
        cancelLabel="Giữ kết bạn"
        pending={pending}
        onClose={() => setConfirmUnfriend(false)}
        onConfirm={() => {
          setConfirmUnfriend(false);
          void runAction(() => unfriend(userId));
        }}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** Trang hồ sơ của một người dùng khác: thông tin, quan hệ bạn bè và dòng thời gian (theo quyền riêng tư). */
export default function UserProfile({ userId }: { userId: string }) {
  return (
    <AuthGuard>
      {/* key: đổi người dùng thì dựng lại toàn bộ trạng thái (bài viết, ảnh, hồ sơ) */}
      <UserProfileContent key={userId} userId={userId} />
    </AuthGuard>
  );
}
