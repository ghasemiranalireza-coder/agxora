"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { LandingCta } from "./LandingCta";
import { LANDING_FADE } from "./motion";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="p31-globe__skeleton" aria-hidden="true" />,
  },
);

/**
 * Phase 33 hero — conversion-first value proposition.
 * What / who / why in under five seconds.
 */
export function LandingHero(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="p31-hero" aria-labelledby="p31-hero-headline">
      <div className="p31-hero__atmosphere" aria-hidden="true">
        <div className="p31-hero__wash" />
        <div className="p31-hero__beam" />
      </div>

      <div className="p31-hero__shell">
        <motion.div
          className="p31-hero__copy"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...LANDING_FADE, duration: 0.6 }}
        >
          <p className="p31-hero__brandmark" aria-label="AGXORA">
            AGXORA
          </p>
          <h1 id="p31-hero-headline" className="p31-hero__headline">
            The AI platform that runs your business.
          </h1>
          <p className="p31-hero__subtitle">
            For founders, operators, and enterprise teams who need AI,
            automation, and analytics in one system.
          </p>
          <div className="p31-hero__cta">
            <LandingCta href="/register">Start Free</LandingCta>
            <LandingCta href="/pricing" variant="ghost">
              View Pricing
            </LandingCta>
          </div>
          <p className="p31-hero__next">
            <a href="/contact-sales">Contact sales</a>
            <span aria-hidden="true"> · </span>
            <a href="/demo">Book a demo</a>
          </p>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          aria-label="Global enterprise intelligence visualization"
          role="img"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...LANDING_FADE, duration: 0.8, delay: 0.06 }}
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
