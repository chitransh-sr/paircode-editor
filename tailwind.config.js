/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Color scheme using CSS variables (supports light/dark mode)
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",
        "card-foreground": "var(--color-card-foreground)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        destructive: "var(--color-destructive)",
        "destructive-foreground": "var(--color-destructive-foreground)",
        popover: "var(--color-popover)",
        "popover-foreground": "var(--color-popover-foreground)",
        ring: "var(--color-ring)",
        // Legacy aliases for backward compatibility
        primary: "var(--color-accent)",
        secondary: "var(--color-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-ibm-plex)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Premium transition timings from UI/UX Pro Max
      transitionDelay: {
        75: "75ms",
        150: "150ms",
        300: "300ms",
      },
      transitionDuration: {
        150: "150ms",
        300: "300ms",
        450: "450ms",
      },
      // Premium effects
      boxShadow: {
        premium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "premium-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "premium-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "inner-glow": "inset 0 0 10px rgb(34 197 94 / 0.1)",
      },
      animation: {
        stagger: "stagger 400ms ease-out forwards",
      },
      keyframes: {
        stagger: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
