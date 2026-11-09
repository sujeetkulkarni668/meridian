import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0E14",
        foreground: "#EDEDED",
        card: {
          DEFAULT: "#121721",
          foreground: "#EDEDED",
          border: "#1E2638",
        },
        popover: {
          DEFAULT: "#121721",
          foreground: "#EDEDED",
        },
        primary: {
          DEFAULT: "#00E5FF", // Electric Blue / Cyan
          foreground: "#05080E",
          hover: "#33EBFF",
          subtle: "rgba(0, 229, 255, 0.12)",
        },
        secondary: {
          DEFAULT: "#1E2638",
          foreground: "#C5D0E6",
          hover: "#28344D",
        },
        muted: {
          DEFAULT: "#171F2F",
          foreground: "#8E9EB5",
        },
        accent: {
          DEFAULT: "#00E5FF",
          foreground: "#05080E",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981", // Restrained institutional green
          foreground: "#FFFFFF",
          subtle: "rgba(16, 185, 129, 0.12)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
          subtle: "rgba(245, 158, 11, 0.12)",
        },
        border: "#1E2638",
        input: "#1A2234",
        ring: "#00E5FF",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Cascadia Code", "monospace"],
      },
      boxShadow: {
        'glow-primary': '0 0 24px -4px rgba(0, 229, 255, 0.25)',
        'glow-success': '0 0 24px -4px rgba(16, 185, 129, 0.25)',
        'card-dark': '0 4px 20px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
