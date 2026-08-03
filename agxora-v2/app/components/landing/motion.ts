/** Shared Framer Motion easing for landing v2. */
export const LANDING_EASE = [0.22, 1, 0.36, 1] as const;

export const LANDING_FADE_UP = {
  duration: 0.5,
  ease: LANDING_EASE,
} as const;
