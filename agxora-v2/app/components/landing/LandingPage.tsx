"use client";

import type { JSX } from "react";
import { useLocale } from "../../lib/i18n";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingTrust } from "./LandingTrust";
import { LandingPreview } from "./LandingPreview";
import { LandingFeatures } from "./LandingFeatures";
import { LandingFinalCta } from "./LandingFinalCta";
import { LandingFooter } from "./LandingFooter";
import "./landing.css";

/** Public landing — Phase 41.7-C first-impression polish. */
export function LandingPage({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  const { t } = useLocale();

  return (
    <div className={`p31${className ? ` ${className}` : ""}`}>
      <a href="#product" className="p31-skip">
        {t("landing.skipToProduct")}
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
