import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        navy: {
          900: "#0b1329",
          800: "#131f42",
          700: "#1e2e5c",
        },
        slate: {
          850: "#15202e",
          950: "#090d16",
        },
        quantix: {
          canvas: "#EBEBF0",
          obsidian: "#101114",
          cardSlate: "#484B53",
          cardOnyx: "#16171B",
          coral: "#FF4D6D",
          coralHover: "#FA3B5E",
          coralGlow: "rgba(255, 77, 109, 0.25)",
          mint: "#22C55E",
          mintLight: "#34D399",
          textDark: "#111216",
          textMuted: "#686C78",
          textCardMuted: "#9FA3AF",
        },
      },
      borderRadius: {
        'island': '28px',
        'card': '20px',
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
