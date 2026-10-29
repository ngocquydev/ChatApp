"use client";

import { Box, Typography } from "@mui/material";
import { EyeOff } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { isSharedPostAvailable, type PostView } from "@/services/postsApi";
import PostAuthorHeader from "./PostAuthorHeader";
import PostImages from "./PostImages";

interface SharedPostEmbedProps {
  shared: PostView["sharedPost"];
  currentUserId?: string;
}

/** Khung bài gốc nằm trong bài chia sẻ lại. */
export default function SharedPostEmbed({ shared, currentUserId }: SharedPostEmbedProps) {
  const { tr } = useTranslation();
  if (!shared) return null;

  if (!isSharedPostAvailable(shared)) {
    return (
      <Box
        role="note"
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box aria-hidden sx={{ color: "text.secondary", display: "flex" }}>
          <EyeOff size={20} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {tr("Nội dung này hiện không khả dụng", "This content is currently unavailable")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tr("Bài viết gốc đã bị xóa hoặc bạn không có quyền xem.", "The original post was deleted or you don't have permission to view it.")}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 1.75, sm: 2 } }}>
        <PostAuthorHeader
          author={shared.author}
          currentUserId={currentUserId}
          createdAt={shared.createdAt}
          privacy={shared.privacy}
          size={36}
        />
        {shared.content && (
          <Typography
            variant="body2"
            sx={{
              mt: 1.25,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              color: "text.primary",
              lineHeight: 1.55,
            }}
          >
            {shared.content}
          </Typography>
        )}
      </Box>
      <PostImages images={shared.images} altPrefix={shared.author.name} />
    </Box>
  );
}
