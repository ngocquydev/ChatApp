import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    host: true,
    headers: {
      "Content-Security-Policy":
        "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob: http: https: ws: wss: https://*.challenges.cloudflare.com https://challenges.cloudflare.com https://*.cloudflarecaptcha.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com https://*.challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: blob: https: http:; font-src 'self' data: https: http:;",
    },
  },
  preview: {
    port: 5174,
    host: true,
    headers: {
      "Content-Security-Policy":
        "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' data: blob: http: https: ws: wss: https://*.challenges.cloudflare.com https://challenges.cloudflare.com https://*.cloudflarecaptcha.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com https://*.challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: blob: https: http:; font-src 'self' data: https: http:;",
    },
  },
});

