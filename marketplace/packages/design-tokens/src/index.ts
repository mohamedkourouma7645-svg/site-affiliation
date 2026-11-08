/**
 * Design tokens – single source for web (CSS variables) and mobile (React Native).
 * Identity: "basil & tomato" – fresh green as primary, warm tomato as accent,
 * cream surfaces that make food photography and 3D renders stand out.
 */
export const color = {
  basil900: "#0E3B2A",
  basil700: "#1F6F50", // primary – white text contrast 6.1:1
  basil500: "#2E9A6E",
  basil100: "#E3F2EA",
  tomato600: "#C7361D", // accent for text/buttons – white text contrast 5.3:1
  tomato500: "#E5482D", // decorative accent only
  tomato100: "#FDE7E2",
  cream50: "#FFFCF8",
  cream100: "#FFF6EC",
  sand200: "#EDE3D6",
  ink900: "#1B1B18", // body text
  ink600: "#55524B", // secondary text – contrast 7.4:1 on cream50
  ink400: "#8A857B", // borders / disabled
  white: "#FFFFFF",
  success: "#1F7A3D",
  warning: "#9A6300",
  danger: "#B42318",
} as const;

export const semantic = {
  bg: color.cream50,
  surface: color.white,
  surfaceMuted: color.cream100,
  border: color.sand200,
  text: color.ink900,
  textMuted: color.ink600,
  primary: color.basil700,
  primaryHover: color.basil900,
  onPrimary: color.white,
  accent: color.tomato600,
  onAccent: color.white,
  focus: color.basil500,
  sponsored: color.warning,
} as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export const font = {
  family: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, "2xl": 28, "3xl": 36 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;
export const shadow = {
  card: "0 1px 2px rgba(27,27,24,.06), 0 4px 16px rgba(27,27,24,.06)",
  raised: "0 8px 32px rgba(27,27,24,.12)",
} as const;
export const motion = { fast: "120ms", base: "200ms", slow: "320ms", easing: "cubic-bezier(.2,.8,.2,1)" } as const;
/** Minimum touch target (WCAG 2.2 AA 2.5.8 requires 24px; we use 44px). */
export const touchTarget = 44;

/** WCAG relative luminance contrast ratio. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
