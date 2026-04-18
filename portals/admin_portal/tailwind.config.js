/**
 * Tailwind config — WealthSignal Admin Portal.
 *
 * Design language: vibrant, confident, premium fintech — deliberately the
 * opposite of academic grey. Sapphire + cyan + amber palette, bold gradients
 * for hero surfaces, glass morphism for cards.
 */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────────────
        brand: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",   // primary
          700: "#4338CA",
          800: "#3730A3",   // primary dark
          900: "#312E81",
          950: "#1E1B4B",
        },
        accent: {
          50:  "#ECFEFF",
          100: "#CFFAFE",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",   // secondary cyan
          600: "#0891B2",
          700: "#0E7490",
          900: "#164E63",
        },
        gold: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",   // highlight amber
          600: "#D97706",
          700: "#B45309",
        },
        emerald: {
          500: "#10B981",
          600: "#059669",
        },
        coral: {
          500: "#F97316",
          600: "#EA580C",
        },
        rose: {
          500: "#EF4444",
          600: "#DC2626",
        },
        // ── Surface (soft, never grey) ─────────────────────────────────────
        surface: {
          0:   "#FFFFFF",
          50:  "#FAFBFF",   // very subtle bluish white
          100: "#F4F6FB",
          200: "#E6E9F4",
          300: "#CDD3E5",
        },
        ink: {
          50:  "#F1F5F9",
          100: "#CBD5E1",
          300: "#94A3B8",
          500: "#64748B",
          700: "#334155",
          900: "#0F172A",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft:    "0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 4px 16px -4px rgba(79, 70, 229, 0.08)",
        panel:   "0 4px 24px -8px rgba(15, 23, 42, 0.12), 0 2px 8px -2px rgba(99, 102, 241, 0.10)",
        popover: "0 20px 60px -20px rgba(30, 27, 75, 0.28)",
        glow:    "0 0 0 1px rgba(99, 102, 241, 0.25), 0 10px 40px -10px rgba(99, 102, 241, 0.45)",
      },
      backgroundImage: {
        "aurora":  "linear-gradient(135deg, #4F46E5 0%, #7C3AED 40%, #06B6D4 100%)",
        "sunrise": "linear-gradient(135deg, #F59E0B 0%, #F97316 55%, #EC4899 100%)",
        "ocean":   "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #10B981 100%)",
        "panel-soft":
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(244,246,251,1) 100%)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      transitionDuration: {
        250: "250ms",
        400: "400ms",
      },
    },
  },
  plugins: [],
};
