"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LandingCta } from "./LandingCta";
import { LANDING_ENTER, hydrateSafeMotion } from "./motion";
import { LANDING_GLOBE_TAGS, LANDING_HERO_CHIPS } from "./content";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="p31-globe__skeleton" aria-hidden="true" />,
  },
);

/**
 * First viewport — brand, OS positioning, CTAs, signature globe.
 */
export function LandingHero(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section className="p31-hero" aria-labelledby="p31-hero-headline">
      <div className="p31-hero__atmosphere" aria-hidden="true">
        <div className="p31-hero__wash" />
        <div className="p31-hero__beam" />
      </div>

      <div className="p31-hero__shell">
        <motion.div
          className="p31-hero__copy"
          {...hydrateSafeMotion(reduceMotion, LANDING_ENTER)}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="p31-hero__brandmark" aria-label={t("landing.hero.brand")}>
            {t("landing.hero.brand")}
          </p>
          <h1 id="p31-hero-headline" className="p31-hero__headline">
            {t("landing.hero.headlineBefore")}
            <span className="p31-hero__highlight">{t("landing.hero.headlineHighlight")}</span>
            {t("landing.hero.headlineAfter")}
          </h1>
          <p className="p31-hero__subtitle">{t("landing.hero.subtitle")}</p>
          <div className="p31-hero__cta">
            <LandingCta href="/register">{t("landing.hero.ctaStart")}</LandingCta>
            <LandingCta href="#product" variant="ghost">
              {t("landing.hero.ctaExplore")}
            </LandingCta>
          </div>
          <ul className="p31-hero__chips">
            {LANDING_HERO_CHIPS.map((key) => (
              <li key={key}>{t(`landing.hero.chips.${key}`)}</li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          aria-label={t("landing.hero.globeAria")}
          role="img"
          {...hydrateSafeMotion(reduceMotion, {
            ...LANDING_ENTER,
            delay: 0.05,
          })}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="p31-globe">
            <div className="p31-globe__glow" aria-hidden="true" />
            <div className="p31-globe__ring" aria-hidden="true" />
            <div className="p31-globe__ring p31-globe__ring--outer" aria-hidden="true" />
            <div className="p31-globe__reflection" aria-hidden="true" />
            <div className="p31-globe__stage">
              <AgxoraGlobe3D variant="hero" />
            </div>
            <ul className="p31-globe__tags">
              {LANDING_GLOBE_TAGS.map((tag) => (
                <li key={tag} className={`p31-globe-tag p31-globe-tag--${tag}`}>
                  <span className="p31-globe-tag__dot" aria-hidden="true" />
                  {t(`landing.hero.tags.${tag}`)}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
      <p className="p31-hero__scroll">{t("landing.hero.scrollHint")}</p>
    </section>
  );
}
