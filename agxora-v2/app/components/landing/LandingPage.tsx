"use client";

import type { JSX } from "react";
import { LandingAtmosphere } from "./LandingAtmosphere";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingMetrics } from "./LandingMetrics";
import { LandingValueProps } from "./LandingValueProps";
import { LandingFeatureGrid } from "./LandingFeatureGrid";
import { LandingPreview } from "./LandingPreview";
import { LandingTrust } from "./LandingTrust";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import "./landing.css";

export function LandingPage({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <div className={`agx-landing${className ? ` ${className}` : ""}`}>
      <a href="#platform" className="agx-landing-skip">
        Skip to platform
      </a>
      <LandingAtmosphere />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingMetrics />
        <LandingValueProps />
        <LandingPreview />
        <LandingFeatureGrid />
        <LandingTrust />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
