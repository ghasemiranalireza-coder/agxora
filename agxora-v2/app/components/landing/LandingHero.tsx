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
 * RC-1 Hero — brand identity for the first screen.
 * Hierarchy: Headline → Globe → CTA → Supporting text.
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
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...LANDING_FADE, duration: 0.65 }}
        >
          <p className="p31-hero__brandmark">AGXORA</p>
          <h1 className="p31-hero__headline">
            The enterprise operating system.
          </h1>
          <p className="p31-hero__subtitle">
            Run your business with AI, automation, and analytics
            <br />
            inside one intelligent platform.
          </p>
          <div className="p31-hero__cta">
            <LandingCta href="/onboarding">Start Free</LandingCta>
            <LandingCta href="mailto:hello@agxora.app" variant="ghost">
              Book Demo
            </LandingCta>
          </div>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...LANDING_FADE, duration: 0.85, delay: 0.08 }}
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
