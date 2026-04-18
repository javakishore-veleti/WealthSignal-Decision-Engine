/**
 * Tailwind config — WealthSignal Customer Portal.
 *
 * Design language: fresh, trustworthy, optimistic — sky blue + emerald
 * + warm gold. Related to the Admin Console (same family) but distinctly
 * customer-friendly rather than enterprise-dense.
 */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        sky: {
          50:  "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",   // primary
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
        },
        emerald: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",   // secondary
          600: "#059669",
          700: "#047857",
          900: "#064E3B",
        },
        gold: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",   // accent
          600: "#D97706",
        },
        coral: {
          400: "#FB7185",
          500: "#F43F5E",
        },
        surface: {
          0:   "#FFFFFF",
          50:  "#F8FCFF",   // very subtle sky-tinted white
          100: "#EEF7FD",
          200: "#DBEAFE",
          300: "#B7D3E9",
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
        soft:    "0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 4px 16px -4px rgba(14, 165, 233, 0.10)",
        panel:   "0 4px 24px -8px rgba(15, 23, 42, 0.10), 0 2px 8px -2px rgba(14, 165, 233, 0.12)",
        popover: "0 20px 60px -20px rgba(12, 74, 110, 0.28)",
        glow:    "0 0 0 1px rgba(14, 165, 233, 0.25), 0 10px 40px -10px rgba(14, 165, 233, 0.45)",
      },
      backgroundImage: {
        "horizon": "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 45%, #10B981 100%)",
        "dawn":    "linear-gradient(135deg, #F59E0B 0%, #F43F5E 55%, #8B5CF6 100%)",
        "dusk":    "linear-gradient(135deg, #6366F1 0%, #0EA5E9 50%, #10B981 100%)",
        "panel-soft":
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(238,247,253,1) 100%)",
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
