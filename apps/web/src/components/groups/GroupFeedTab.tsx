"use client";

import { useCallback } from "react";
import { Box, Button } from "@mui/material";
import { Compass } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { fetchGroupsFeed } from "@/services/postsApi";
import PostFeed from "@/components/posts/PostFeed";

interface GroupFeedTabProps {
  onDiscoverClick: () => void;
}

export default function GroupFeedTab({ onDiscoverClick }: GroupFeedTabProps) {
  const { t } = useTranslation();

  const loadFeed = useCallback(async (after: string | null) => {
    return fetchGroupsFeed({ after: after ?? undefined });
  }, []);

  return (
    <Box sx={{ maxWidth: 680, mx: "auto" }}>
      <PostFeed
        loadPage={loadFeed}
        canCompose={false}
        emptyTitle={t("groups.feedEmptyTitle")}
        emptyDescription={t("groups.feedEmptyDesc")}
        emptyAction={
          <Button
            variant="contained"
            startIcon={<Compass size={18} />}
            onClick={onDiscoverClick}
            sx={{ borderRadius: "12px", fontWeight: 700, mt: 1 }}
          >
            {t("groups.discoverTab")}
          </Button>
        }
      />
    </Box>
  );
}

