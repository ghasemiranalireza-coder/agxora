"use client";

import type { JSX } from "react";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingTrust } from "./LandingTrust";
import { LandingPreview } from "./LandingPreview";
import { LandingPillars } from "./LandingPillars";
import { LandingWhy } from "./LandingWhy";
import { LandingSecurity } from "./LandingSecurity";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import "./landing.css";

/** Public marketing homepage — Landing v2 blueprint. */
export function LandingPage({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <div className={`lv2${className ? ` ${className}` : ""}`}>
      <a href="#product" className="lv2-skip">
        Skip to product
      </a>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingTrust />
        <LandingPreview />
        <LandingPillars />
        <LandingWhy />
        <LandingSecurity />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
