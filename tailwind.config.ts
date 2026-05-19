import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)"
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
          light: "var(--color-secondary-light)"
        },
        accent: "var(--color-accent)",
        mauve: "var(--color-mauve)",
        lilac: "var(--color-lilac)",
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          hover: "var(--color-sidebar-hover)"
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          inverse: "var(--color-text-inverse)"
        },
        border: "var(--color-border)",
        success: {
          DEFAULT: "var(--color-success)",
          light: "color-mix(in srgb, var(--color-success) 12%, white)"
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "color-mix(in srgb, var(--color-warning) 14%, white)"
        },
        error: {
          DEFAULT: "var(--color-error)",
          light: "color-mix(in srgb, var(--color-error) 10%, white)"
        },
        info: "var(--color-info)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      boxShadow: {
        soft: "0 20px 70px rgba(45, 45, 45, 0.10)",
        glow: "0 18px 55px rgba(222, 112, 191, 0.24)",
        blueglow: "0 18px 55px rgba(54, 163, 218, 0.20)"
      }
    }
  },
  plugins: []
};

export default config;
