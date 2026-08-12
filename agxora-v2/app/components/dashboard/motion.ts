/**
 * Dashboard motion tokens — small, consistent motion language for the command center.
 * Aligns with UI.motion / enterprise.css; use for Framer and inline transition strings.
 */

export const DASHBOARD_EASE = [0.22, 1, 0.36, 1] as const;

export const DASHBOARD_EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

/** ~120–180ms — hover, focus, micro feedback */
export const MOTION_MICRO_S = 0.16;

/** ~180–260ms — cards, panels, content */
export const MOTION_STANDARD_S = 0.24;

/** ~260–360ms — hero, larger entrances */
export const MOTION_LARGE_S = 0.32;

export const MOTION_MS = {
  micro: 160,
  standard: 220,
  large: 320,
} as const;

export function framerTransition(
  duration = MOTION_STANDARD_S,
): { readonly duration: number; readonly ease: typeof DASHBOARD_EASE } {
  return { duration, ease: DASHBOARD_EASE };
}

/** CSS transition for interactive dashboard surfaces (not theme color sweeps). */
export function interactionTransition(...properties: readonly string[]): string {
  return properties
    .map((prop) => `${prop} ${MOTION_MS.standard}ms ${DASHBOARD_EASE_CSS}`)
    .join(", ");
}
