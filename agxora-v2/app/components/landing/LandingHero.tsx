"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="agx-landing-hero__globe-skeleton" aria-hidden="true" />
    ),
  },
);

/**
 * v1.0 hero — globe as centerpiece, alien as cinematic intelligence in shadow.
 * Copy remains SSR-visible; entrance uses CSS only.
 */
export function LandingHero(): JSX.Element {
  return (
    <section className="agx-landing-hero" aria-label="AGXORA hero">
      <div className="agx-landing-hero__stage" aria-hidden="true">
        <div className="agx-landing-hero__vignette" />
        <div className="agx-landing-hero__alien" />
        <div className="agx-landing-hero__alien-rim" />
        <div className="agx-landing-hero__alien-eye" />
        <div className="agx-landing-hero__globe-wrap">
          <div className="agx-landing-hero__globe-aura" />
          <div className="agx-landing-hero__globe">
            <AgxoraGlobe3D variant="hero" />
          </div>
          <div className="agx-landing-hero__globe-reflection" />
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
