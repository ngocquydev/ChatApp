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
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;

