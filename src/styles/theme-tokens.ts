/**
 * Centralized theme color tokens for server-rendered SVG assets (e.g. /badge/:owner/:repo.svg).
 * All hex literals reside strictly within src/styles/ theme files.
 */
export const THEME_TOKENS = {
  lavenderLab: {
    bg: '#F4F1FA',
    surface: '#FFFFFF',
    surface2: '#EFEAF7',
    border: '#DCD4EC',
    text: '#2B2438',
    text2: '#6B637E',
    accent: '#7C5CFC',
    healthy: '#0B7A4B',
    caution: '#9A6700',
    risky: '#C22736',
    neutral: '#6B637E',
  },
  cosmicVoid: {
    bg: '#0A0912',
    surface: '#131022',
    surface2: '#1B1730',
    border: '#2C2547',
    text: '#EDE9F8',
    text2: '#A79FC0',
    accent: '#A78BFA',
    healthy: '#4ADE80',
    caution: '#FBBF24',
    risky: '#F87171',
    neutral: '#A79FC0',
  },
} as const;
