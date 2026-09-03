import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        raised: "var(--bg-surface-raised)",
        ink: "var(--text-primary)",
        muted: "var(--text-muted)",
        faint: "var(--text-faint)",
        pink: "var(--accent-pink)",
        violet: "var(--accent-violet)",
        mint: "var(--accent-mint)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        pixel: ["var(--font-pixel)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px var(--accent-pink-glow)",
        "glow-mint": "0 0 20px rgba(57, 255, 192, 0.28)",
        "glow-violet": "0 0 20px rgba(139, 92, 246, 0.28)",
      },
      borderRadius: {
        chip: "10px",
        panel: "18px",
        nest: "28px",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-2%, 1%)" },
        },
      },
      animation: {
        breathe: "breathe 2.8s ease-in-out infinite",
        grain: "grain 8s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
