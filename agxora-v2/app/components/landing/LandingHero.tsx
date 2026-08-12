"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LandingCta } from "./LandingCta";
import { LANDING_ENTER } from "./motion";

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
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={LANDING_ENTER}
        >
          <p className="p31-hero__brandmark" aria-label={t("landing.hero.brand")}>
            {t("landing.hero.brand")}
          </p>
          <h1 id="p31-hero-headline" className="p31-hero__headline">
            {t("landing.hero.headline")}
          </h1>
          <p className="p31-hero__subtitle">{t("landing.hero.subtitle")}</p>
          <div className="p31-hero__cta">
            <LandingCta href="/register">{t("landing.hero.ctaStart")}</LandingCta>
            <LandingCta href="#product" variant="ghost">
              {t("landing.hero.ctaExplore")}
            </LandingCta>
          </div>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          aria-label={t("landing.hero.globeAria")}
          role="img"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.992 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...LANDING_ENTER, delay: reduceMotion ? 0 : 0.05 }}
        >
          <div className="p31-globe">
            <div className="p31-globe__glow" aria-hidden="true" />
            <div className="p31-globe__ring" aria-hidden="true" />
            <div className="p31-globe__reflection" aria-hidden="true" />
            <div className="p31-globe__stage">
              <AgxoraGlobe3D variant="hero" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
