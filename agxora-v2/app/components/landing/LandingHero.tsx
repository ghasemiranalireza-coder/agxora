"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE } from "./motion";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="p31-globe__skeleton" aria-hidden="true" />,
  },
);

/**
 * Phase 31 hero — one message, one CTA, globe as intelligence centerpiece.
 * No alien. No clutter. Maximum confidence.
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
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...LANDING_FADE, duration: 0.65 }}
        >
          <h1 className="p31-hero__brand">AGXORA</h1>
          <p className="p31-hero__message">
            The enterprise operating system.
          </p>
          <div className="p31-hero__cta">
            <Link href="/onboarding" className="p31-btn p31-btn--primary">
              Start Free
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="p31-hero__globe"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...LANDING_FADE, duration: 0.8, delay: 0.1 }}
        >
          <div className="p31-globe">
            <div className="p31-globe__glow" aria-hidden="true" />
            <div className="p31-globe__ring" aria-hidden="true" />
            <div className="p31-globe__stage">
              <AgxoraGlobe3D variant="hero" />
            </div>
          </div>
          <p className="p31-hero__globe-caption">Global Enterprise Intelligence</p>
        </motion.div>
      </div>
    </section>
  );
}
