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

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : "auto";
  } catch {
    return "auto";
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
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [appearance, setAppearance] = useState<ThemeAppearance>(() =>
    resolveAppearance(readStoredMode()),
  );
  const [hydrated] = useState(() => typeof window !== "undefined");
  const appearanceRef = useRef<ThemeAppearance>(
    typeof window === "undefined" ? "night" : resolveAppearance(readStoredMode()),
  );
  const blendRaf = useRef<number | null>(null);
  const didInitVisual = useRef(false);

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

  const applyAppearance = useCallback(
    (next: ThemeAppearance, animate: boolean) => {
      appearanceRef.current = next;
      setAppearance(next);
      if (!animate) {
        setThemeVisualState(next, next === "day" ? 1 : 0);
        return;
      }
      animateBlend(next);
    },
    [animateBlend],
  );

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      persistMode(next);
      const resolved = resolveAppearance(next);
      applyAppearance(resolved, hydrated);
    },
    [applyAppearance, hydrated],
  );

  useEffect(() => {
    if (didInitVisual.current) return;
    didInitVisual.current = true;
    setThemeVisualState(appearance, appearance === "day" ? 1 : 0);
  }, [appearance]);

  useEffect(() => {
    if (!hydrated || mode !== "auto") return undefined;

    let boundaryTimer: number | undefined;

    const sync = (): void => {
      const next = resolveAppearance("auto");
      if (appearanceRef.current === next) return;
      applyAppearance(next, true);
    };

    const armBoundary = (): void => {
      boundaryTimer = window.setTimeout(() => {
        sync();
        armBoundary();
      }, msUntilNextAutoBoundary());
    };

    armBoundary();
    const pollTimer = window.setInterval(sync, 60_000);

    return () => {
      if (boundaryTimer !== undefined) window.clearTimeout(boundaryTimer);
      window.clearInterval(pollTimer);
    };
  }, [mode, hydrated, applyAppearance]);

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
