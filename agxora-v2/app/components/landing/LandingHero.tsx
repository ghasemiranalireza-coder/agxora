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
 * Phase 32 executive hero — headline first, CTA second, globe recessed.
 */
export function LandingHero(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="p31-hero" aria-label="AGXORA">
      <div className="p31-hero__atmosphere" aria-hidden="true">
        <div className="p31-hero__wash" />
        <div className="p31-hero__beam" />
      </div>

      <div className="p31-hero__shell">
        <motion.div
          className="p31-hero__copy"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...LANDING_FADE, duration: 0.6 }}
        >
          <p className="p31-hero__brandmark">AGXORA</p>
          <h1 className="p31-hero__headline">
            The enterprise operating system.
          </h1>
          <div className="p31-hero__cta">
            <LandingCta href="/onboarding">Start Free</LandingCta>
          </div>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...LANDING_FADE, duration: 0.9, delay: 0.15 }}
        >
          <div className="p31-globe">
            <div className="p31-globe__glow" />
            <div className="p31-globe__stage">
              <AgxoraGlobe3D variant="hero" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
