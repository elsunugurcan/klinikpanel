import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { ink: "rgb(11 11 11 / <alpha-value>)", ink2: "rgb(82 81 78 / <alpha-value>)", muted: "rgb(137 135 129 / <alpha-value>)", line: "#e1e0d9", plane: "#f9f9f7", surface: "#fcfcfb", brand: "rgb(42 120 214 / <alpha-value>)", brandDeep: "rgb(28 92 171 / <alpha-value>)", good: "#0ca30c", warn: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
    fontFamily: { sans: ["var(--font-poppins)", "system-ui", "sans-serif"] },
    boxShadow: { card: "0 1px 2px rgba(11,11,11,.04), 0 12px 32px -24px rgba(11,11,11,.25)" },
  } },
  plugins: [],
};
export default config;
