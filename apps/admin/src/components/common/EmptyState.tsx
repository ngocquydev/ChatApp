"use client";

import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Thu gọn padding khi đặt trong panel hẹp. */
  compact?: boolean;
}

/** Trạng thái rỗng thống nhất: icon + tiêu đề + mô tả + hành động chính. */
export default function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        py: compact ? 4 : 8,
        px: 3,
        gap: 1,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          bgcolor: "action.selected",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 0.5,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
    </Box>
  );
}
