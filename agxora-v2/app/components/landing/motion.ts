/**
 * Landing motion — aligned with Phase 41.7-B dashboard motion language.
 */

export const LANDING_EASE = [0.22, 1, 0.36, 1] as const;

export const LANDING_EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

/** ~160ms — micro feedback */
export const MOTION_MICRO_S = 0.16;

/** ~220ms — cards, panels, in-view fades */
export const MOTION_STANDARD_S = 0.22;

/** ~320ms — hero / larger entrances */
export const MOTION_LARGE_S = 0.32;

export const LANDING_FADE = {
  duration: MOTION_STANDARD_S,
  ease: LANDING_EASE,
} as const;

export const LANDING_ENTER = {
  duration: MOTION_LARGE_S,
  ease: LANDING_EASE,
} as const;

/**
 * Hydration-safe motion props. `useReducedMotion()` is `null` on the server and
 * a boolean on the client — branching `initial` on that value mismatches German
 * (and every other) locale HTML. Always start from the settled visual state.
 */
export function hydrateSafeMotion(
  reduceMotion: boolean | null,
  transition: {
    readonly duration: number;
    readonly ease: readonly [number, number, number, number];
    readonly delay?: number;
  },
): {
  readonly initial: false;
  readonly transition: {
    duration: number;
    ease: [number, number, number, number];
    delay?: number;
  };
} {
  const ease: [number, number, number, number] = [
    transition.ease[0],
    transition.ease[1],
    transition.ease[2],
    transition.ease[3],
  ];
  return {
    initial: false,
    transition:
      reduceMotion === true
        ? { duration: 0, delay: 0, ease }
        : {
            duration: transition.duration,
            delay: transition.delay,
            ease,
          },
  };
}
