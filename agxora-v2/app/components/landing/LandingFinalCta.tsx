"use client";

import type { JSX } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE_UP } from "./motion";

export function LandingFinalCta(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section id="start" className="lv2-section lv2-cta" aria-labelledby="lv2-cta-title">
      <div className="lv2-container">
        <motion.div
          className="lv2-cta__panel"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE_UP}
        >
          <h2 id="lv2-cta-title" className="lv2-heading">
            Ready to transform your business?
          </h2>
          <div className="lv2-hero__actions lv2-cta__actions">
            <Link href="/onboarding" className="lv2-btn lv2-btn--primary">
              Start Free
            </Link>
            <a href="mailto:hello@agxora.app" className="lv2-btn lv2-btn--secondary">
              Book Demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
