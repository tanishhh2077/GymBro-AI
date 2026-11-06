/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Existing utilities share the appearance palette defined in index.css.
        white: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent-rgb) / <alpha-value>)',
        'chart-right': 'rgb(var(--chart-right-rgb) / <alpha-value>)',
        slate: {
          200: 'rgb(var(--body-rgb) / <alpha-value>)',
          300: 'rgb(var(--secondary-rgb) / <alpha-value>)',
          400: 'rgb(var(--muted-rgb) / <alpha-value>)',
          500: 'rgb(var(--subtle-rgb) / <alpha-value>)',
        },
        pink: {
          300: 'rgb(var(--pink-text-rgb) / <alpha-value>)',
          400: 'rgb(var(--pink-rgb) / <alpha-value>)',
        },
        emerald: { 300: 'rgb(var(--gradient-middle-rgb) / <alpha-value>)' },
        ink: {
          950: 'rgb(var(--ink-950-rgb) / <alpha-value>)',
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          850: 'rgb(var(--ink-850-rgb) / <alpha-value>)',
          800: 'rgb(var(--ink-800-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--ink-600-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          50: "#ecfdf3",
          100: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
          200: "#a6f4c5",
          300: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
          400: 'rgb(var(--accent-rgb) / <alpha-value>)',
          500: "#22c55e",
          600: "#16a34a",
        },
        electric: {
          DEFAULT: 'rgb(var(--electric-rgb) / <alpha-value>)',
          400: 'rgb(var(--electric-rgb) / <alpha-value>)',
          500: "#0ea5e9",
        },
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(74,222,128,0.15), 0 8px 40px -12px rgba(74,222,128,0.35)",
        "glow-blue":
          "0 0 0 1px rgba(56,189,248,0.15), 0 8px 40px -12px rgba(56,189,248,0.35)",
        card: 'var(--shadow-card)',
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
