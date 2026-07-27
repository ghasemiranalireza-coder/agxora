"use client";

/**
 * Module-level visual blend for WebGL consumers.
 * Updated by ThemeProvider during cinematic transitions so R3F scenes
 * can lerp in useFrame without React re-renders every frame.
 */

import type { ThemeAppearance, ThemeTokens } from "./theme";
import { DAY_TOKENS, NIGHT_TOKENS } from "./theme";

type Listener = () => void;

let dayBlend = 0; // 0 = night, 1 = day
let appearance: ThemeAppearance = "night";
const listeners = new Set<Listener>();

export function getThemeDayBlend(): number {
  return dayBlend;
}

export function getThemeAppearance(): ThemeAppearance {
  return appearance;
}

export function getBlendedTokens(): {
  readonly night: ThemeTokens;
  readonly day: ThemeTokens;
  readonly blend: number;
} {
  return { night: NIGHT_TOKENS, day: DAY_TOKENS, blend: dayBlend };
}

export function setThemeVisualState(
  nextAppearance: ThemeAppearance,
  blend: number,
): void {
  appearance = nextAppearance;
  dayBlend = Math.min(1, Math.max(0, blend));
  listeners.forEach((listener) => listener());
}

export function subscribeThemeVisual(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
