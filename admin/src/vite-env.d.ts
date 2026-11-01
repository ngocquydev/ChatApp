/// <reference types="vite/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_SITE_KEY?: string;
  readonly NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly NEXT_PUBLIC_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
