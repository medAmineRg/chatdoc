import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Smartly.ai brand palette (derived from the test PDF: navy header + blue headings)
        brand: {
          navy: "#16244A",
          blue: "#2B5CA8",
          "blue-soft": "#EAF0FA",
        },
        ink: "#1A2233",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};

export default config;
