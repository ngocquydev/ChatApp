"use client";

import NextLink from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { Compass } from "lucide-react";
import PostFeed from "@/components/posts/PostFeed";
import { fetchFeed } from "@/services/postsApi";

const PAGE_SIZE = 10;

/** Bảng tin: bài của bạn và bạn bè, đăng bài mới, cuộn vô hạn. Dữ liệu thật từ API /posts/feed. */
function Feed() {
  return (
    <Box
      sx={{
        flex: 1,
        maxWidth: "760px",
        width: "100%",
        p: { xs: 2, sm: 3 },
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          Bảng tin
        </Typography>
        <Button
          component={NextLink}
          href="/explore"
          size="small"
          variant="outlined"
          startIcon={<Compass size={16} aria-hidden />}
          sx={{ display: { xs: "inline-flex", md: "none" }, borderRadius: "10px" }}
        >
          Khám phá bạn bè
        </Button>
      </Box>

      <PostFeed
        loadPage={(after) => fetchFeed({ limit: PAGE_SIZE, after })}
        canCompose
        emptyTitle="Bảng tin còn trống"
        emptyDescription="Hãy đăng bài đầu tiên của bạn, hoặc kết bạn để xem bài viết của bạn bè."
        emptyAction={
          <Button component={NextLink} href="/explore" variant="outlined">
            Khám phá bạn bè
          </Button>
        }
      />
    </Box>
  );
}

export default Feed;
