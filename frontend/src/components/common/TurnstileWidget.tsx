"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Box, Typography } from "@mui/material";

export interface TurnstileRef {
  reset: () => void;
  remove: () => void;
  getResponse: () => string;
}

export interface TurnstileWidgetProps {
  onSuccess?: (token: string) => void;
  onError?: (err: unknown) => void;
  onExpire?: () => void;
  siteKey?: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (err: unknown) => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
  }
}

/**
 * Cloudflare Turnstile Widget Component
 * Tự động tải script Cloudflare Turnstile và render widget xác thực người dùng.
 */
const TurnstileWidget = forwardRef<TurnstileRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    {
      onSuccess,
      onError,
      onExpire,
      siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        process.env.NEXT_PUBLIC_SITE_KEY ||
        process.env.VITE_TURNSTILE_SITE_KEY ||
        process.env.VITE_SITE_KEY ||
        "0x4AAAAAAFUR2RRMbBht62MJ",
      action = "login",
      theme = "light",
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const cleanSiteKey = (siteKey || "").trim();

    // Lưu trữ callback trong ref để tránh re-render / recreate widget khi component cha re-render
    const callbacksRef = useRef({ onSuccess, onError, onExpire });
    useEffect(() => {
      callbacksRef.current = { onSuccess, onError, onExpire };
    });

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      remove: () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      },
      getResponse: () => {
        if (widgetIdRef.current !== null && window.turnstile) {
          return window.turnstile.getResponse(widgetIdRef.current);
        }
        return "";
      },
    }));

    useEffect(() => {
      if (!cleanSiteKey) {
        console.warn("Chưa cấu hình Turnstile Site Key.");
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Nếu widget đã được render và còn tồn tại thì không render đè
        if (widgetIdRef.current !== null) {
          return;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: cleanSiteKey,
            action: action,
            theme: theme,
            callback: (token: string) => {
              if (isMounted) {
                callbacksRef.current.onSuccess?.(token);
              }
            },
            "expired-callback": () => {
              if (isMounted) {
                callbacksRef.current.onExpire?.();
              }
            },
            "error-callback": (err: unknown) => {
              if (isMounted) {
                callbacksRef.current.onError?.(err);
              }
            },
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error("Lỗi khi render Cloudflare Turnstile:", err);
        }
      };

      const SCRIPT_ID = "cf-turnstile-script";
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

      const handleScriptLoad = () => {
        if (window.turnstile) {
          renderWidget();
        }
      };

      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = handleScriptLoad;
        document.head.appendChild(script);
      } else if (window.turnstile) {
        renderWidget();
      } else {
        script.addEventListener("load", handleScriptLoad);
      }

      return () => {
        isMounted = false;
        if (script) {
          script.removeEventListener("load", handleScriptLoad);
        }
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Bỏ qua lỗi khi widget đã bị huỷ
          }
          widgetIdRef.current = null;
        }
      };
    }, [cleanSiteKey, action, theme]);

    if (!cleanSiteKey) {
      return (
        <Box sx={{ my: 1.5, p: 1, border: "1px dashed #cbd5e1", borderRadius: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Vui lòng thêm NEXT_PUBLIC_TURNSTILE_SITE_KEY trong file .env để kích hoạt Turnstile.
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          my: 2,
          display: "flex",
          justifyContent: "center",
          minHeight: 65,
        }}
      >
        <div ref={containerRef} />
      </Box>
    );
  }
);

export default TurnstileWidget;
