import type { JSX } from "react";

const PARTICLES = [
  { top: "12%", left: "8%", delay: "0s" },
  { top: "22%", left: "28%", delay: "1.4s" },
  { top: "18%", left: "72%", delay: "2.1s" },
  { top: "40%", left: "88%", delay: "0.6s" },
  { top: "58%", left: "14%", delay: "2.8s" },
  { top: "68%", left: "46%", delay: "1.1s" },
  { top: "76%", left: "78%", delay: "3.2s" },
  { top: "34%", left: "54%", delay: "0.3s" },
] as const;

/** Subtle depth layer — gradients, noise, light particles. */
export function LandingAtmosphere(): JSX.Element {
  return (
    <div className="agx-landing-atmosphere" aria-hidden="true">
      <div className="agx-landing-atmosphere__gradient" />
      <div className="agx-landing-atmosphere__noise" />
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
