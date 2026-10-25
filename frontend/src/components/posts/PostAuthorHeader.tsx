"use client";

import NextLink from "next/link";
import type { ReactNode } from "react";
import { Box, Link, Tooltip, Typography } from "@mui/material";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import type { PostAuthor, PostPrivacy } from "@/services/postsApi";
import { formatFullDateTime, formatRelativeTime } from "@/utils/formatTime";
import { PrivacyLabel } from "./PrivacyPicker";

/** Hồ sơ của chính mình ở /profile, của người khác ở /profile/<id>. */
export function profileHref(userId: string, currentUserId?: string) {
  return userId === currentUserId ? "/profile" : `/profile/${userId}`;
}

interface PostAuthorHeaderProps {
  author: PostAuthor;
  currentUserId?: string;
  createdAt?: string;
  privacy?: PostPrivacy;
  size?: number;
  /** Phần tử đặt bên phải (menu ⋯) */
  action?: ReactNode;
}

export default function PostAuthorHeader({
  author,
  currentUserId,
  createdAt,
  privacy,
  size = 40,
  action,
}: PostAuthorHeaderProps) {
  const href = profileHref(author._id, currentUserId);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Link component={NextLink} href={href} aria-label={`Xem trang cá nhân của ${author.name}`} underline="none" sx={{ display: "flex" }}>
        <PresenceAvatar name={author.name} src={author.avatar} size={size} hidePresence />
      </Link>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Link
          component={NextLink}
          href={href}
          color="text.primary"
          underline="hover"
          variant="subtitle2"
          noWrap
          sx={{ fontWeight: 700, display: "block" }}
        >
          {author.name}
        </Link>
        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {createdAt && (
            <Tooltip title={formatFullDateTime(createdAt)}>
              <time dateTime={createdAt}>{formatRelativeTime(createdAt)}</time>
            </Tooltip>
          )}
          {privacy && (
            <>
              <span aria-hidden>·</span>
              <PrivacyLabel privacy={privacy} />
            </>
          )}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}
