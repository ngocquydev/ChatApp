"use client";

import { ReactNode, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme/theme";
import { useLanguageStore } from "@/i18n/useLanguageStore";

interface ProvidersProps {
  children: ReactNode;
}

function LanguageInitializer({ children }: { children: ReactNode }) {
  const hydrateLanguage = useLanguageStore((state) => state.hydrateLanguage);

  useEffect(() => {
    hydrateLanguage();
  }, [hydrateLanguage]);

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
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline enableColorScheme />
        <LanguageInitializer>
          {children}
        </LanguageInitializer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
