import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f8fafc",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontWeight: 800,
          color: "#2563eb",
          fontSize: { xs: "3.5rem", md: "5rem" },
        }}
      >
        404
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        Trang không tồn tại
      </Typography>
      <Typography variant="body1" sx={{ color: "#64748b", maxWidth: 460 }}>
        Địa chỉ bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang đường
        dẫn khác.
      </Typography>
      <Link href="/" style={{ textDecoration: "none" }}>
        <Button
          variant="contained"
          sx={{
            mt: 2,
            borderRadius: "10px",
            px: 3,
            py: 1.2,
            bgcolor: "#2563eb",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Về trang chủ
        </Button>
      </Link>
    </Box>
  );
}
