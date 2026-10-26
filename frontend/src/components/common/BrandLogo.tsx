"use client";

import Link from "next/link";
import Image from "next/image";
import { Box, Typography } from "@mui/material";
import logoImg from "@/assets/logo/Logo.png";

interface BrandLogoProps {
  /** Ẩn chữ, chỉ hiển thị biểu tượng (dùng cho sidebar thu gọn). */
  iconOnly?: boolean;
  /** Đường dẫn khi bấm vào logo. Bỏ trống để render không có link. */
  href?: string;
  size?: number;
}

/** Logo thương hiệu duy nhất của ứng dụng — sử dụng assets/logo/Logo.png. */
export default function BrandLogo({ iconOnly = false, href = "/", size = 36 }: BrandLogoProps) {
  const content = (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.28)}px`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "common.white",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
          flexShrink: 0,
        }}
      >
        <Image
          src={logoImg}
          alt="ChatApp Logo"
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          priority
        />
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
