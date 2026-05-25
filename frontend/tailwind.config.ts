import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sf)", "system-ui", "sans-serif"],
        display: ["var(--font-clash)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        nova: {
          50: "#f0f0ff",
          100: "#e5e3ff",
          200: "#ccc7ff",
          300: "#b09bff",
          400: "#9066ff",
          500: "#7c3aed",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
        glass: {
          white: "rgba(255,255,255,0.08)",
          border: "rgba(255,255,255,0.12)",
          hover: "rgba(255,255,255,0.15)",
        }
      },
      backgroundImage: {
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
        "nova-gradient": "linear-gradient(135deg, #7c3aed 0%, #1e40af 50%, #0f172a 100%)",
        "hero-gradient": "linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.1) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-in": "slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer": "shimmer 2s infinite",
        "glow-pulse": "glowPulse 3s infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": {opacity: "0", transform: "translateY(20px)"},
          "100%": {opacity: "1", transform: "translateY(0)"},
        },
        fadeIn: {
          "0%": {opacity: "0"},
          "100%": {opacity: "1"},
        },
        slideIn: {
          "0%": {opacity: "0", transform: "translateX(-20px)"},
          "100%": {opacity: "1", transform: "translateX(0)"},
        },
        shimmer: {
          "0%": {backgroundPosition: "-200% 0"},
          "100%": {backgroundPosition: "200% 0"},
        },
        glowPulse: {
          "0%, 100%": {opacity: "0.6"},
          "50%": {opacity: "1"},
        },
        float: {
          "0%, 100%": {transform: "translateY(0)"},
          "50%": {transform: "translateY(-10px)"},
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        "glass-hover": "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
        nova: "0 0 40px rgba(124,58,237,0.4)",
        "nova-lg": "0 0 80px rgba(124,58,237,0.3)",
        cinematic: "0 25px 60px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
}

export default config
