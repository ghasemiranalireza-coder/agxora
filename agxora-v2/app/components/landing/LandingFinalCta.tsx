"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingCta } from "./LandingCta";
import { LANDING_FADE } from "./motion";

export function LandingFinalCta(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section id="start" className="p31-close" aria-labelledby="p31-close-title">
      <div className="p31-wrap">
        <motion.div
          className="p31-close__panel"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          <h2 id="p31-close-title" className="p31-display">
            Start free. Scale when ready.
          </h2>
          <p className="p31-lead">Create a workspace in minutes — no credit card.</p>
          <div className="p31-close__actions">
            <LandingCta href="/onboarding">Start Free</LandingCta>
            <LandingCta
              href="mailto:hello@agxora.app?subject=Book%20a%20demo"
              variant="ghost"
            >
              Book Demo
            </LandingCta>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
