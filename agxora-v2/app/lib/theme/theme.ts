/**
 * AGXORA Adaptive Theme — token definitions and pure helpers.
 *
 * Night tokens mirror the approved dashboard look exactly.
 * Day tokens keep the luxury cyber aesthetic with a bright blue sky —
 * never a flat white dashboard.
 */

export type ThemeMode = "auto" | "day" | "night";
export type ThemeAppearance = "day" | "night";

export const THEME_TRANSITION_MS = 800;
export const THEME_STORAGE_KEY = "agxora-theme-mode";

/** Visual tokens consumed by CSS surfaces and WebGL scenes. */
export interface ThemeTokens {
  readonly skyGradient: string;
  readonly skySolid: string;
  readonly sidebarBg: string;
  readonly sidebarBorder: string;
  readonly cardBg: string;
  readonly cardBgFrom: string;
  readonly cardBgTo: string;
  readonly cardBorder: string;
  readonly cardShadow: string;
  readonly panelBg: string;
  readonly panelBorder: string;
  readonly chatBubbleBg: string;
  readonly chatReplyBg: string;
  readonly text: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentGlow: string;
  readonly titleShadow: string;
  readonly inputBg: string;
  readonly inputBorder: string;
  readonly divider: string;
  readonly starOpacity: number;
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
  readonly tone: "day" | "night";
}

/** Approved night look — keep unchanged. */
export const NIGHT_TOKENS: ThemeTokens = {
  skyGradient:
    "radial-gradient(circle at center, #0b1836 0%, #060d1c 45%, #02060d 100%)",
  skySolid: "#02060d",
  sidebarBg: "rgba(255,255,255,0.03)",
  sidebarBorder: "rgba(34,211,238,0.25)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBgFrom: "rgba(255,255,255,0.06)",
  cardBgTo: "rgba(255,255,255,0.02)",
  cardBorder: "rgba(255,255,255,0.08)",
  cardShadow: "0 8px 32px rgba(0,0,0,0.25)",
  panelBg: "rgba(255,255,255,0.04)",
  panelBorder: "rgba(34,211,238,0.3)",
  chatBubbleBg: "rgba(255,255,255,0.05)",
  chatReplyBg: "rgba(34,211,238,0.08)",
  text: "#ffffff",
  textMuted: "#cbd5e1",
  accent: "#22d3ee",
  accentGlow: "rgba(34,211,238,0.5)",
  titleShadow: "0 0 40px rgba(34,211,238,0.5)",
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(34,211,238,0.3)",
  divider: "rgba(255,255,255,0.08)",
  starOpacity: 1,
  bloomIntensity: 0.34,
  bloomIntensityCompact: 0.24,
  sunIntensity: 2.9,
  fillIntensity: 0.32,
  ambientIntensity: 0.07,
  exposure: 1.12,
  vignetteDarkness: 0.72,
  globeBg: "#01030a",
  globeFrameBg:
    "radial-gradient(circle at 50% 45%, #071226 0%, #01030a 70%)",
  globeBorder: "rgba(34, 211, 238, 0.18)",
  atmosphereTint: "#6fb0e8",
  atmosphereGain: 0.8,
  tone: "night",
};

/**
 * Premium daylight — bright blue sky, soft sun, glass still reads as
 * luxury cyber (not a white SaaS dashboard).
 */
export const DAY_TOKENS: ThemeTokens = {
  skyGradient:
    "radial-gradient(circle at 50% 18%, #9fd4f7 0%, #5aa5eb 28%, #2f7ec8 58%, #163f7a 100%)",
  skySolid: "#2f7ec8",
  sidebarBg: "rgba(255,255,255,0.14)",
  sidebarBorder: "rgba(14,116,180,0.35)",
  cardBg: "rgba(255,255,255,0.18)",
  cardBgFrom: "rgba(255,255,255,0.22)",
  cardBgTo: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.28)",
  cardShadow: "0 10px 36px rgba(15,60,110,0.18)",
  panelBg: "rgba(255,255,255,0.16)",
  panelBorder: "rgba(14,116,180,0.35)",
  chatBubbleBg: "rgba(255,255,255,0.22)",
  chatReplyBg: "rgba(14,116,180,0.14)",
  text: "#071428",
  textMuted: "#334155",
  accent: "#0369a1",
  accentGlow: "rgba(3,105,161,0.35)",
  titleShadow: "0 0 28px rgba(56,189,248,0.35)",
  inputBg: "rgba(255,255,255,0.28)",
  inputBorder: "rgba(14,116,180,0.4)",
  divider: "rgba(15,60,110,0.12)",
  starOpacity: 0.03,
  bloomIntensity: 0.12,
  bloomIntensityCompact: 0.08,
  sunIntensity: 3.6,
  fillIntensity: 0.55,
  ambientIntensity: 0.28,
  exposure: 1.28,
  vignetteDarkness: 0.28,
  globeBg: "#7eb8e8",
  globeFrameBg:
    "radial-gradient(circle at 50% 35%, #a8d8f5 0%, #4a9ad4 55%, #1e5a96 100%)",
  globeBorder: "rgba(14, 116, 180, 0.28)",
  atmosphereTint: "#c8e7ff",
  atmosphereGain: 1.05,
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
    "--agx-card-bg": tokens.cardBg,
    "--agx-card-bg-from": tokens.cardBgFrom,
    "--agx-card-bg-to": tokens.cardBgTo,
    "--agx-card-border": tokens.cardBorder,
    "--agx-card-shadow": tokens.cardShadow,
    "--agx-panel-bg": tokens.panelBg,
    "--agx-panel-border": tokens.panelBorder,
    "--agx-chat-bubble-bg": tokens.chatBubbleBg,
    "--agx-chat-reply-bg": tokens.chatReplyBg,
    "--agx-text": tokens.text,
    "--agx-text-muted": tokens.textMuted,
    "--agx-accent": tokens.accent,
    "--agx-accent-glow": tokens.accentGlow,
    "--agx-title-shadow": tokens.titleShadow,
    "--agx-input-bg": tokens.inputBg,
    "--agx-input-border": tokens.inputBorder,
    "--agx-divider": tokens.divider,
    "--agx-globe-frame-bg": tokens.globeFrameBg,
    "--agx-globe-border": tokens.globeBorder,
    "--agx-theme-transition": `${THEME_TRANSITION_MS}ms`,
  };
}
