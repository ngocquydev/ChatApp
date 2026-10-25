"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isCheckingAuth, isAuthenticated, router]);

  if (isCheckingAuth) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "var(--mui-palette-neutral-50)",
          gap: 2,
        }}
      >
        <CircularProgress size={42} thickness={4} sx={{ color: "var(--mui-palette-brand-600)" }} />
        <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
          Đang xác thực phiên làm việc...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
