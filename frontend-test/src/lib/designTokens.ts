// Design Tokens extracted from Stitch prototype
// Color Palette
export const colors = {
  // Primary Colors
  primary: "#19e62b",
  primaryHover: "#14b822",
  primaryLight: "#10b981", // Alternative primary from profile view

  // Backgrounds
  backgroundLight: "#ffffff",
  backgroundDark: "#050805",

  // Surfaces
  surfaceLight: "#f8f9fa",
  surfaceDark: "#0f1410",
  surfaceHighlight: "#1E293B",

  // Borders
  borderLight: "#e2e8f0",
  borderDark: "#1f2920",

  // Text
  textMainLight: "#0f172a",
  textMainDark: "#f0fdf2",
  textSubLight: "#64748b",
  textSubDark: "#869088",

  // Accents
  accent: "#d97706",
  accentLight: "#fbbf24",
};

// Typography
export const typography = {
  fontFamily: {
    display: '"Inter", "DM Sans", sans-serif',
    body: '"Inter", sans-serif',
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  "0": "0",
  "1": "0.25rem", // 4px
  "2": "0.5rem", // 8px
  "3": "0.75rem", // 12px
  "4": "1rem", // 16px
  "5": "1.25rem", // 20px
  "6": "1.5rem", // 24px
  "8": "2rem", // 32px
  "10": "2.5rem", // 40px
  "12": "3rem", // 48px
};

// Border Radius
export const borderRadius = {
  default: "0.25rem",
  lg: "0.5rem",
  xl: "1rem",
  "2xl": "1.5rem", // 24px - most common in Stitch
  "3xl": "2rem",
  full: "9999px",
};

// Box Shadows
export const boxShadow = {
  soft: "0 4px 30px -4px rgba(0, 0, 0, 0.05)",
  glow: "0 0 25px rgba(25, 230, 43, 0.15)",
  innerGlow: "inset 0 0 20px rgba(25, 230, 43, 0.05)",
  card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
};

// Transitions
export const transitions = {
  default: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  fast: "all 0.15s ease-in-out",
  smooth: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
};
