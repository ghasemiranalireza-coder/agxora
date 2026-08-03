import type { JSX } from "react";

/** Sparse ambient points — quieter than Phase 30. */
const PARTICLES = [
  { top: "16%", left: "12%", delay: "0s" },
  { top: "28%", left: "78%", delay: "2.4s" },
  { top: "62%", left: "18%", delay: "1.2s" },
  { top: "74%", left: "68%", delay: "3.1s" },
] as const;

/** Subtle depth — gradients, noise, soft vignette, sparse particles. */
export function LandingAtmosphere(): JSX.Element {
  return (
    <div className="agx-landing-atmosphere" aria-hidden="true">
      <div className="agx-landing-atmosphere__gradient" />
      <div className="agx-landing-atmosphere__noise" />
      <div className="agx-landing-atmosphere__vignette" />
      <div className="agx-landing-atmosphere__particles">
        {PARTICLES.map((p) => (
          <span
            key={`${p.top}-${p.left}`}
            className="agx-landing-atmosphere__particle"
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}
      </div>
    </div>
  );
}
