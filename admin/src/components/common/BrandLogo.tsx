import { Link } from "react-router-dom";
import { Box } from "@mui/material";
import logoImg from "@/assets/logo/Logo.png";

interface BrandLogoProps {
  iconOnly?: boolean;
  href?: string;
  size?: number | "small" | "medium" | "large";
}

export default function BrandLogo({ href = "/", size = 40 }: BrandLogoProps) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "small"
      ? 32
      : size === "large"
      ? 56
      : 40;

  const content = (
    <Box
      aria-label="Logo"
      sx={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: `${Math.round(pixelSize * 0.28)}px`,
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
      <img
        src={logoImg}
        alt="Logo"
        width={pixelSize}
        height={pixelSize}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </Box>
  );

  if (!href) return content;

  return (
    <Link
      to={href}
      aria-label="Về trang chủ"
      style={{ color: "inherit", textDecoration: "none", display: "inline-flex", borderRadius: 12 }}
    >
      {content}
    </Link>
  );
}
