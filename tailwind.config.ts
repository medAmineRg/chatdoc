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
      backgroundImage: {
        // Gradients built only from the brand palette.
        "brand-gradient": "linear-gradient(135deg, #16244A 0%, #2B5CA8 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #2B5CA8 0%, #EAF0FA 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
