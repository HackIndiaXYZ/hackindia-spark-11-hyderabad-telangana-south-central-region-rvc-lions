/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary accent — orange
        primary: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea6c10",
          700: "#c2550d",
          800: "#9a420a",
          900: "#7c3409",
        },
        // Secondary accent — teal
        secondary: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        // Keep legacy tokens for backward compat
        ink: {
          950: "#0B1B24",
          900: "#0F2733",
          800: "#153444",
          700: "#1C4356",
        },
        signal: {
          teal:  "#14b8a6",
          amber: "#E8A33D",
          coral: "#E1573E",
          mist:  "#EAF3F3",
        },
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea6c10",
        },
      },
      fontFamily: {
        sans:    ["'Poppins'", "system-ui", "sans-serif"],
        display: ["'Poppins'", "system-ui", "sans-serif"],
        body:    ["'Poppins'", "system-ui", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        card:          "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover":  "0 4px 12px rgba(0,0,0,0.10), 0 12px 32px rgba(0,0,0,0.10)",
        "orange":      "0 4px 24px rgba(249,115,22,0.30)",
        "teal":        "0 4px 24px rgba(20,184,166,0.25)",
        glass:         "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
        glow:          "0 0 20px rgba(249,115,22,0.35)",
        "shadow-glow": "0 0 20px rgba(249,115,22,0.35)",
        "inner-glow":  "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(16px)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "scale-up": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)"  },
          "50%":     { transform: "translateY(-12px)" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(0.95)", opacity: "1" },
          "50%":  { transform: "scale(1.05)", opacity: "0.7" },
          "100%": { transform: "scale(0.95)", opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.4s ease-out",
        "fade-in":    "fade-in 0.3s ease-out",
        "slide-in":   "slide-in 0.25s ease-out",
        "scale-up":   "scale-up 0.2s ease-out",
        "float":      "float 4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s ease-in-out infinite",
        "spin-slow":  "spin-slow 8s linear infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
