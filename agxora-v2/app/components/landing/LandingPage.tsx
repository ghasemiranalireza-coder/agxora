"use client";

import type { JSX } from "react";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingTrust } from "./LandingTrust";
import { LandingPreview } from "./LandingPreview";
import { LandingFeatures } from "./LandingFeatures";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import "./landing.css";

/** Phase 31 — world-class public landing. Application untouched. */
export function LandingPage({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <div className={`p31${className ? ` ${className}` : ""}`}>
      <a href="#product" className="p31-skip">
        Skip to product
      </a>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingTrust />
        <LandingPreview />
        <LandingFeatures />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
