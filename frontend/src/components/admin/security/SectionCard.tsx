"use client";

import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

interface SectionCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Khung thẻ dùng chung cho các khối của trung tâm bảo mật (tiêu đề h2 + mô tả + nội dung) */
export default function SectionCard({ id, icon, title, description, action, children }: SectionCardProps) {
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={`${id}-title`}
      sx={{ borderRadius: "16px", p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ color: "primary.main", display: "flex", pt: 0.25 }} aria-hidden>
          {icon}
        </Box>
        {/* flex-basis 180px: màn hẹp thì phần action (chip trạng thái) tự xuống dòng thay vì bóp tiêu đề */}
        <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
          <Typography id={`${id}-title`} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

