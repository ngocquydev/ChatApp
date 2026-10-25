"use client";

import { Alert, Button, Box } from "@mui/material";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useAuthStore } from "@/store/useAuthStore";
import ProfileTimeline from "./ProfileTimeline";

/** Tab "Bài viết" trong trang hồ sơ của chính mình. */
export default function MyPostsTab() {
  const { user } = useAuthStore();
  const userId = (user?._id || user?.id) as string | undefined;

  if (!userId) return null;
  return <MyPostsTabContent key={userId} userId={userId} />;
}

function MyPostsTabContent({ userId }: { userId: string }) {
  const { profile, status, error, reload } = usePublicProfile(userId);
  return (
    <Box>
      {status === "error" && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <ProfileTimeline userId={userId} isOwner profile={profile} currentUserId={userId} />
    </Box>
  );
}
