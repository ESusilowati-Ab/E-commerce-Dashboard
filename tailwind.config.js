/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neutral / slate base
        bg: {
          base: "#0a0b0f",
          panel: "#111319",
          card: "#161922",
          hover: "#1c2030",
          input: "#0d0f14",
        },
        border: {
          subtle: "#232733",
          DEFAULT: "#2a2f3d",
          strong: "#3a4154",
        },
        // Primary — teal/cyan (analytics, data)
        primary: {
          50: "#ecfdf7",
          100: "#d1faec",
          200: "#a7f3d8",
          300: "#6ee7b7",
          400: "#34d39e",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        // Accent — amber (AI / highlights)
        accent: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Secondary — sky blue
        secondary: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.25)",
        card: "0 4px 24px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(16,185,129,0.25)",
        "glow-accent": "0 0 24px rgba(245,158,11,0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [],
};
