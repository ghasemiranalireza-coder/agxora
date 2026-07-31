"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.14), transparent 62%)",
        }}
      />
    ),
  },
);

/**
 * Hero copy stays SSR-visible (no opacity-0 motion initial) so brand/CTAs
 * never disappear if client JS is delayed. Entrance uses CSS animation.
 */
export function LandingHero(): JSX.Element {
  return (
    <section className="agx-landing-hero" aria-label="AGXORA hero">
      <div className="agx-landing-hero__stage" aria-hidden="true">
        <div className="agx-landing-hero__alien" />
        <div className="agx-landing-hero__alien-glow" />
        <div className="agx-landing-hero__globe">
          <AgxoraGlobe3D variant="hero" />
        </div>
      </div>

      <div className="agx-landing-hero__copy">
        <h1 className="agx-landing-hero__brand">AGXORA</h1>
        <h2 className="agx-landing-hero__headline">
          Enterprise AI operating system for modern companies
        </h2>
        <p className="agx-landing-hero__support">
          Unify intelligence, automation, and governance in one secure platform
          built for operators who ship.
        </p>
        <div className="agx-landing-hero__actions">
          <Link href="/onboarding" className="agx-landing-btn agx-landing-btn--primary">
            Start Free
          </Link>
          <Link href="/login" className="agx-landing-btn agx-landing-btn--secondary">
            Explore Platform
          </Link>
          <a href="#trust" className="agx-landing-btn agx-landing-btn--ghost">
            Request Demo
          </a>
        </div>
      </div>
    </section>
  );
}
