import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pantone 18-4020 TCX "Captain's Blue" — dusty steel blue
        primary: {
          50: "#f2f6f8",
          100: "#e3ebf1",
          200: "#c2d0d9",
          300: "#b3c5d5",
          400: "#87a0b8",
          500: "#5d7993",
          600: "#415b78",
          700: "#364b62",
          800: "#2c3c4f",
          900: "#223045",
          950: "#151f2e",
        },
        // Neutral charcoal scale (overrides Tailwind's blue-tinted "slate").
        // Dark surfaces follow the recommended #121212 → #1A1A1D → #27272A
        // elevation hierarchy used by Linear / Vercel / modern dark UIs.
        slate: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e6e6e7",
          300: "#d3d3d5",
          400: "#a1a1a6",
          500: "#73737a",
          600: "#52525a",
          700: "#3f3f45",
          800: "#27272a",
          900: "#1a1a1d",
          950: "#121214",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        pulse2: "pulse2 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
