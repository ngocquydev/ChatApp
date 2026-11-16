import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "**/.next/**",
      "dist/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Design-system contract (.agents/skills/chatapp-design-system):
  // TOÀN BỘ src KHÔNG được hard-code màu hex (dark mode phụ thuộc vào token) — dùng theme token / v.* từ "@/theme/tokens".
  // Ngoại lệ: nơi định nghĩa token (theme/**) và logo thương hiệu bên thứ ba (SocialIcons).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**", "src/components/common/SocialIcons.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Không hard-code màu hex. Dùng theme token (vd. \"text.secondary\") hoặc v.* từ \"@/theme/tokens\" (hỗ trợ dark mode).",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Không hard-code màu hex trong template string. Dùng theme token hoặc v.* từ \"@/theme/tokens\".",
        },
      ],
    },
  },
];

export default eslintConfig;

