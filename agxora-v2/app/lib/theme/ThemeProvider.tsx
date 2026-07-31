"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from "react";
import { useIsClient } from "../runtime";
import {
  THEME_STORAGE_KEY,
  THEME_TRANSITION_MS,
  isThemeMode,
  msUntilNextAutoBoundary,
  resolveAppearance,
  tokensFor,
  tokensToCssVars,
  type ThemeAppearance,
  type ThemeMode,
  type ThemeTokens,
} from "./theme";
import { getThemeDayBlend, setThemeVisualState } from "./themeVisualStore";

export interface ThemeContextValue {
  readonly mode: ThemeMode;
  readonly appearance: ThemeAppearance;
  readonly tokens: ThemeTokens;
  readonly setMode: (mode: ThemeMode) => void;
  readonly transitionMs: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** SSR + hydration snapshot — never read window/localStorage/Date here. */
const SSR_MODE: ThemeMode = "auto";
const SSR_APPEARANCE: ThemeAppearance = "night";

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return SSR_MODE;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : SSR_MODE;
  } catch {
    return SSR_MODE;
  }
}

function persistMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const isClient = useIsClient();
  const [modeOverride, setModeOverride] = useState<ThemeMode | null>(null);
  const [autoTick, setAutoTick] = useState(0);
  const appearanceRef = useRef<ThemeAppearance>(SSR_APPEARANCE);
  const blendRaf = useRef<number | null>(null);
  const prevAppearance = useRef<ThemeAppearance>(SSR_APPEARANCE);

  const mode: ThemeMode =
    modeOverride ?? (isClient ? readStoredMode() : SSR_MODE);

  // During SSR/hydration always night. After hydration, resolve from mode + local clock.
  // autoTick re-resolves around day/night boundaries.
  const appearance: ThemeAppearance = useMemo(() => {
    if (!isClient) return SSR_APPEARANCE;
    // Reference autoTick so boundary polls recompute appearance from the current clock.
    const at = autoTick;
    return resolveAppearance(mode, at >= 0 ? new Date() : new Date());
  }, [isClient, mode, autoTick]);

  const animateBlend = useCallback((target: ThemeAppearance) => {
    const to = target === "day" ? 1 : 0;
    const from = getThemeDayBlend();
    const start = performance.now();

    if (blendRaf.current !== null) {
      cancelAnimationFrame(blendRaf.current);
    }

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / THEME_TRANSITION_MS);
      const eased = t * t * (3 - 2 * t);
      const blend = from + (to - from) * eased;
      setThemeVisualState(target, blend);
      if (t < 1) {
        blendRaf.current = requestAnimationFrame(tick);
      } else {
        blendRaf.current = null;
        setThemeVisualState(target, to);
      }
    };

    blendRaf.current = requestAnimationFrame(tick);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    persistMode(next);
    setModeOverride(next);
  }, []);

  // Sync external visual store when appearance changes (no React setState).
  useEffect(() => {
    appearanceRef.current = appearance;
    const shouldAnimate = isClient && prevAppearance.current !== appearance;
    if (!shouldAnimate) {
      setThemeVisualState(appearance, appearance === "day" ? 1 : 0);
    } else {
      animateBlend(appearance);
    }
    prevAppearance.current = appearance;
  }, [appearance, isClient, animateBlend]);

  useEffect(() => {
    if (!isClient || mode !== "auto") return undefined;

    let boundaryTimer: number | undefined;

    const armBoundary = (): void => {
      boundaryTimer = window.setTimeout(() => {
        setAutoTick((value) => value + 1);
        armBoundary();
      }, msUntilNextAutoBoundary());
    };

    armBoundary();
    const pollTimer = window.setInterval(() => {
      setAutoTick((value) => value + 1);
    }, 60_000);

    return () => {
      if (boundaryTimer !== undefined) window.clearTimeout(boundaryTimer);
      window.clearInterval(pollTimer);
    };
  }, [mode, isClient]);

  useEffect(
    () => () => {
      if (blendRaf.current !== null) cancelAnimationFrame(blendRaf.current);
    },
    [],
  );

  const tokens = useMemo(() => tokensFor(appearance), [appearance]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      appearance,
      tokens,
      setMode,
      transitionMs: THEME_TRANSITION_MS,
    }),
    [mode, appearance, tokens, setMode],
  );

  const shellStyle = useMemo<CSSProperties>(
    () => ({
      ...tokensToCssVars(tokens),
      color: tokens.text,
      transition: `color ${THEME_TRANSITION_MS}ms ease`,
    }),
    [tokens],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-agx-theme={mode}
        data-agx-appearance={appearance}
        style={shellStyle}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
