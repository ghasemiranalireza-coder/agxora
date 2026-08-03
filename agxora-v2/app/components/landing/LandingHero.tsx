"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE_UP } from "./motion";

const AgxoraGlobe3D = dynamic(
  () => import("../AgxoraGlobe3D").then((m) => m.default),
  {
    ssr: false,
    loading: () => <div className="lv2-hero__globe-skeleton" aria-hidden="true" />,
  },
);

/** Blueprint hero — clean copy + globe centerpiece. No alien. */
export function LandingHero(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="lv2-hero" aria-label="AGXORA hero">
      <div className="lv2-hero__bg" aria-hidden="true">
        <div className="lv2-hero__glow" />
        <div className="lv2-hero__grid" />
      </div>

      <div className="lv2-hero__layout">
        <motion.div
          className="lv2-hero__copy"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...LANDING_FADE_UP, duration: 0.55 }}
        >
          <p className="lv2-logo lv2-hero__brand">AGXORA</p>
          <h1 className="lv2-hero__headline">Enterprise Intelligence Platform</h1>
          <p className="lv2-hero__subtitle">
            Run your business with AI, Automation and Analytics
            <br />
            inside one intelligent platform.
          </p>
          <div className="lv2-hero__actions">
            <Link href="/onboarding" className="lv2-btn lv2-btn--primary">
              Start Free
            </Link>
            <a href="#start" className="lv2-btn lv2-btn--secondary">
              Book Demo
            </a>
          </div>
        </motion.div>

        <motion.div
          className="lv2-hero__globe"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...LANDING_FADE_UP, duration: 0.7, delay: 0.08 }}
          aria-hidden="true"
        >
          <div className="lv2-hero__globe-aura" />
          <AgxoraGlobe3D variant="hero" />
        </motion.div>
      </div>
    </section>
  );
}
