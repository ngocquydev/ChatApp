import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Box, Typography } from "@mui/material";

/**
 * Cloudflare Turnstile Widget Component
 * Tự động tải script Cloudflare Turnstile và render widget xác thực người dùng.
 */
const TurnstileWidget = forwardRef(function TurnstileWidget(
  {
    onSuccess,
    onError,
    onExpire,
    siteKey = import.meta.env.VITE_SITE_KEY ||
      import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY,
    theme = "light",
  },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const cleanSiteKey = (siteKey || "").trim();

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
    remove: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    },
  }));

  useEffect(() => {
    if (!cleanSiteKey) {
      console.warn("Chưa cấu hình VITE_SITE_KEY cho Cloudflare Turnstile.");
      return;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Xóa widget cũ nếu đã từng render
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: cleanSiteKey,
          theme: theme,
          callback: (token) => {
            if (isMounted && onSuccess) {
              onSuccess(token);
            }
          },
          "expired-callback": () => {
            if (isMounted && onExpire) {
              onExpire();
            }
          },
          "error-callback": (err) => {
            if (isMounted && onError) {
              onError(err);
            }
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.error("Lỗi khi render Cloudflare Turnstile:", err);
      }
    };

    // Kiểm tra xem script Turnstile đã được load vào trang chưa
    const SCRIPT_ID = "cf-turnstile-script";
    let script = document.getElementById(SCRIPT_ID);

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile) {
          renderWidget();
        }
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener("load", renderWidget);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [cleanSiteKey, theme]);

  if (!cleanSiteKey) {
    return (
      <Box sx={{ my: 1.5, p: 1, border: "1px dashed #cbd5e1", borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Vui lòng thêm VITE_SITE_KEY trong file .env để kích hoạt Turnstile.
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
});

export default TurnstileWidget;
