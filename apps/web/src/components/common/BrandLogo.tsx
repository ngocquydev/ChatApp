"use client";

import Link from "next/link";
import Image from "next/image";
import { Box } from "@mui/material";
import logoImg from "@/assets/logo/Logo.png";

interface BrandLogoProps {
  iconOnly?: boolean;
  href?: string;
  size?: number;
}
export default function BrandLogo({ href = "/", size = 40 }: BrandLogoProps) {
  const content = (
    <Box
      aria-label="Logo"
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "common.white",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
        flexShrink: 0,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "scale(1.04)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.22)",
        },
      }}
    >
      <Image
        src={logoImg}
        alt="Logo"
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
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="Về trang chủ"
      style={{
        color: "inherit",
        textDecoration: "none",
        display: "inline-flex",
        borderRadius: 12,
      }}
    >
      {content}
    </Link>
  );
}
