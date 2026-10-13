"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme/theme";
import { useAuthStore } from "@/store/useAuthStore";

interface ProvidersProps {
  children: ReactNode;
}

function AuthInitializer({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkAuth?.().catch(() => {
        // Ignored unauthenticated error on boot
      });
    }
  }, [checkAuth]);

  return <>{children}</>;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthInitializer>{children}</AuthInitializer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
