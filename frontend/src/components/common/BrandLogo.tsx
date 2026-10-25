"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";
import { colors } from "@/theme/tokens";

interface BrandLogoProps {
  /** Ẩn chữ, chỉ hiển thị biểu tượng (dùng cho sidebar thu gọn). */
  iconOnly?: boolean;
  /** Đường dẫn khi bấm vào logo. Bỏ trống để render không có link. */
  href?: string;
  size?: number;
}

/** Logo thương hiệu duy nhất của ứng dụng — KHÔNG dùng icon Android/monospace nữa. */
export default function BrandLogo({ iconOnly = false, href = "/", size = 36 }: BrandLogoProps) {
  const content = (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.3)}px`,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 6px 14px -4px ${colors.brand[600]}99`,
          flexShrink: 0,
        }}
      >
        <Sparkles size={Math.round(size * 0.55)} color="currentColor" />
      </Box>
      {!iconOnly && (
        <Typography
          component="span"
          sx={{ fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.02em", color: "inherit" }}
        >
          ChatApp
        </Typography>
      )}
    </Box>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="ChatApp — về trang chủ"
      style={{ color: "inherit", textDecoration: "none", display: "inline-flex", borderRadius: 12 }}
    >
      {content}
    </Link>
  );
}
