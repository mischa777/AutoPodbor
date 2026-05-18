import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a2e",
        orbit: "#0f3460",
        mist: "#f0f1f5",
        muted: "#7a8599"
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 18px 55px rgba(15, 52, 96, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
