/**
 * AGXORA Adaptive Theme — token definitions and pure helpers.
 *
 * Night tokens preserve the approved cinematic dashboard.
 * Day tokens use a pearl / ice / silver enterprise palette with
 * layered atmospheric depth — never a flat blue overlay.
 */

export type ThemeMode = "auto" | "day" | "night";
export type ThemeAppearance = "day" | "night";

export const THEME_TRANSITION_MS = 820;
export const THEME_STORAGE_KEY = "agxora-theme-mode";

/** Visual tokens consumed by CSS surfaces and WebGL scenes. */
export interface ThemeTokens {
  readonly skyGradient: string;
  readonly skySolid: string;
  readonly sidebarBg: string;
  readonly sidebarBorder: string;
  readonly sidebarShadow: string;
  readonly sidebarBlur: string;
  readonly cardBg: string;
  readonly cardBgFrom: string;
  readonly cardBgTo: string;
  readonly cardBorder: string;
  readonly cardShadow: string;
  readonly cardShadowHover: string;
  readonly cardBlur: string;
  readonly panelBg: string;
  readonly panelBorder: string;
  readonly panelShadow: string;
  readonly chatBubbleBg: string;
  readonly chatReplyBg: string;
  readonly text: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentGlow: string;
  readonly titleShadow: string;
  readonly inputBg: string;
  readonly inputBorder: string;
  readonly divider: string;
  readonly navHoverBg: string;
  readonly navActiveBg: string;
  readonly navActiveGlow: string;
  readonly starOpacity: number;
  readonly particleOpacity: number;
  readonly bloomIntensity: number;
  readonly bloomIntensityCompact: number;
  readonly sunIntensity: number;
  readonly fillIntensity: number;
  readonly ambientIntensity: number;
  readonly exposure: number;
  readonly vignetteDarkness: number;
  readonly globeBg: string;
  readonly globeFrameBg: string;
  readonly globeBorder: string;
  readonly atmosphereTint: string;
  readonly atmosphereGain: number;
  readonly cloudOpacity: number;
  readonly surfaceClearcoat: number;
  readonly emissiveIntensity: number;
  readonly tone: "day" | "night";
}

/** Approved night look — cinematic space, preserved. */
export const NIGHT_TOKENS: ThemeTokens = {
  skyGradient:
    "radial-gradient(circle at 50% 42%, #0d1a3a 0%, #081226 42%, #040910 72%, #02060d 100%)",
  skySolid: "#02060d",
  sidebarBg:
    "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
  sidebarBorder: "rgba(34,211,238,0.22)",
  sidebarShadow: "8px 0 40px rgba(0,0,0,0.35)",
  sidebarBlur: "blur(28px) saturate(140%)",
  cardBg: "rgba(255,255,255,0.045)",
  cardBgFrom: "rgba(255,255,255,0.07)",
  cardBgTo: "rgba(255,255,255,0.02)",
  cardBorder: "rgba(255,255,255,0.1)",
  cardShadow:
    "0 10px 40px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)",
  cardShadowHover:
    "0 18px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.1)",
  cardBlur: "blur(22px) saturate(150%)",
  panelBg: "rgba(255,255,255,0.045)",
  panelBorder: "rgba(34,211,238,0.28)",
  panelShadow:
    "0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)",
  chatBubbleBg: "rgba(255,255,255,0.055)",
  chatReplyBg: "rgba(34,211,238,0.1)",
  text: "#f4f8fb",
  textMuted: "#a8b6c7",
  accent: "#22d3ee",
  accentSoft: "rgba(34,211,238,0.14)",
  accentGlow: "rgba(34,211,238,0.45)",
  titleShadow: "0 0 42px rgba(34,211,238,0.45)",
  inputBg: "rgba(255,255,255,0.055)",
  inputBorder: "rgba(34,211,238,0.28)",
  divider: "rgba(255,255,255,0.08)",
  navHoverBg: "rgba(255,255,255,0.05)",
  navActiveBg: "rgba(34,211,238,0.12)",
  navActiveGlow: "0 0 24px rgba(34,211,238,0.18)",
  starOpacity: 1,
  particleOpacity: 0,
  bloomIntensity: 0.34,
  bloomIntensityCompact: 0.24,
  sunIntensity: 2.9,
  fillIntensity: 0.32,
  ambientIntensity: 0.07,
  exposure: 1.12,
  vignetteDarkness: 0.72,
  globeBg: "#01030a",
  globeFrameBg:
    "radial-gradient(circle at 50% 42%, #0a1630 0%, #050c18 55%, #01030a 100%)",
  globeBorder: "rgba(34, 211, 238, 0.2)",
  atmosphereTint: "#6fb0e8",
  atmosphereGain: 0.8,
  cloudOpacity: 0.5,
  surfaceClearcoat: 0.42,
  emissiveIntensity: 0.22,
  tone: "night",
};

/**
 * Premium daylight — pearl / ice / silver atmosphere with soft sun,
 * layered depth, VisionOS-grade glass. Not a flat blue wash.
 */
export const DAY_TOKENS: ThemeTokens = {
  skyGradient: [
    "radial-gradient(ellipse 120% 70% at 72% 8%, rgba(255,252,248,0.95) 0%, rgba(255,252,248,0) 42%)",
    "radial-gradient(ellipse 90% 55% at 50% 100%, rgba(186,208,224,0.55) 0%, rgba(186,208,224,0) 55%)",
    "radial-gradient(circle at 50% 38%, rgba(236,244,250,0.9) 0%, rgba(214,228,240,0.55) 38%, rgba(190,210,226,0.35) 68%, rgba(168,190,210,0.2) 100%)",
    "linear-gradient(180deg, #eef4f8 0%, #e2ecf3 28%, #d5e3ee 62%, #c4d4e4 100%)",
  ].join(", "),
  skySolid: "#d8e6f0",
  sidebarBg:
    "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(248,252,255,0.38) 100%)",
  sidebarBorder: "rgba(255,255,255,0.62)",
  sidebarShadow:
    "8px 0 48px rgba(120,145,170,0.14), inset -1px 0 0 rgba(255,255,255,0.55)",
  sidebarBlur: "blur(40px) saturate(160%)",
  cardBg: "rgba(255,255,255,0.42)",
  cardBgFrom: "rgba(255,255,255,0.62)",
  cardBgTo: "rgba(255,255,255,0.28)",
  cardBorder: "rgba(255,255,255,0.7)",
  cardShadow:
    "0 14px 44px rgba(110,140,170,0.16), 0 2px 8px rgba(110,140,170,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
  cardShadowHover:
    "0 22px 60px rgba(110,140,170,0.22), 0 4px 14px rgba(110,140,170,0.1), inset 0 1px 0 rgba(255,255,255,0.95)",
  cardBlur: "blur(28px) saturate(170%)",
  panelBg: "rgba(255,255,255,0.48)",
  panelBorder: "rgba(255,255,255,0.68)",
  panelShadow:
    "0 16px 48px rgba(110,140,170,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
  chatBubbleBg: "rgba(255,255,255,0.55)",
  chatReplyBg: "rgba(210,228,240,0.55)",
  text: "#1c2430",
  textMuted: "#5a6a7a",
  accent: "#3d7a96",
  accentSoft: "rgba(61,122,150,0.1)",
  accentGlow: "rgba(90,160,190,0.28)",
  titleShadow: "0 2px 24px rgba(255,255,255,0.55), 0 0 40px rgba(150,190,215,0.25)",
  inputBg: "rgba(255,255,255,0.62)",
  inputBorder: "rgba(170,195,215,0.55)",
  divider: "rgba(90,120,150,0.12)",
  navHoverBg: "rgba(255,255,255,0.45)",
  navActiveBg: "rgba(210,230,242,0.7)",
  navActiveGlow: "0 0 28px rgba(150,190,215,0.28)",
  starOpacity: 0,
  particleOpacity: 0.35,
  bloomIntensity: 0.16,
  bloomIntensityCompact: 0.1,
  sunIntensity: 3.85,
  fillIntensity: 0.62,
  ambientIntensity: 0.34,
  exposure: 1.22,
  vignetteDarkness: 0.18,
  globeBg: "#d5e4ef",
  globeFrameBg: [
    "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(255,252,248,0.75) 0%, rgba(255,252,248,0) 50%)",
    "radial-gradient(circle at 50% 45%, #e8f1f7 0%, #cfdfea 48%, #b7cddd 100%)",
  ].join(", "),
  globeBorder: "rgba(255,255,255,0.55)",
  atmosphereTint: "#dcecf8",
  atmosphereGain: 1.15,
  cloudOpacity: 0.62,
  surfaceClearcoat: 0.58,
  emissiveIntensity: 0.06,
  tone: "day",
};

export function tokensFor(appearance: ThemeAppearance): ThemeTokens {
  return appearance === "day" ? DAY_TOKENS : NIGHT_TOKENS;
}

/** 06:00–18:00 → day, otherwise night (local time). */
export function appearanceFromLocalTime(date: Date = new Date()): ThemeAppearance {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function resolveAppearance(
  mode: ThemeMode,
  date: Date = new Date(),
): ThemeAppearance {
  if (mode === "day") return "day";
  if (mode === "night") return "night";
  return appearanceFromLocalTime(date);
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "auto" || value === "day" || value === "night";
}

/** Milliseconds until the next Auto day/night boundary. */
export function msUntilNextAutoBoundary(date: Date = new Date()): number {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMilliseconds(0);

  const hour = date.getHours();
  if (hour >= 6 && hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else if (hour < 6) {
    next.setHours(6, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }

  return Math.max(1000, next.getTime() - date.getTime());
}

/** CSS custom properties for smooth DOM transitions. */
export function tokensToCssVars(
  tokens: ThemeTokens,
): Record<string, string> {
  return {
    "--agx-sky-gradient": tokens.skyGradient,
    "--agx-sky-solid": tokens.skySolid,
    "--agx-sidebar-bg": tokens.sidebarBg,
    "--agx-sidebar-border": tokens.sidebarBorder,
    "--agx-sidebar-shadow": tokens.sidebarShadow,
    "--agx-sidebar-blur": tokens.sidebarBlur,
    "--agx-card-bg": tokens.cardBg,
    "--agx-card-bg-from": tokens.cardBgFrom,
    "--agx-card-bg-to": tokens.cardBgTo,
    "--agx-card-border": tokens.cardBorder,
    "--agx-card-shadow": tokens.cardShadow,
    "--agx-card-shadow-hover": tokens.cardShadowHover,
    "--agx-card-blur": tokens.cardBlur,
    "--agx-panel-bg": tokens.panelBg,
    "--agx-panel-border": tokens.panelBorder,
    "--agx-panel-shadow": tokens.panelShadow,
    "--agx-chat-bubble-bg": tokens.chatBubbleBg,
    "--agx-chat-reply-bg": tokens.chatReplyBg,
    "--agx-text": tokens.text,
    "--agx-text-muted": tokens.textMuted,
    "--agx-accent": tokens.accent,
    "--agx-accent-soft": tokens.accentSoft,
    "--agx-accent-glow": tokens.accentGlow,
    "--agx-title-shadow": tokens.titleShadow,
    "--agx-input-bg": tokens.inputBg,
    "--agx-input-border": tokens.inputBorder,
    "--agx-divider": tokens.divider,
    "--agx-nav-hover-bg": tokens.navHoverBg,
    "--agx-nav-active-bg": tokens.navActiveBg,
    "--agx-nav-active-glow": tokens.navActiveGlow,
    "--agx-globe-frame-bg": tokens.globeFrameBg,
    "--agx-globe-border": tokens.globeBorder,
    "--agx-theme-transition": `${THEME_TRANSITION_MS}ms`,
  };
}
