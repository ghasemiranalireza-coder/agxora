"use client";

import type { JSX } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE } from "./motion";

export function LandingFinalCta(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section id="start" className="p31-close" aria-labelledby="p31-close-title">
      <div className="p31-wrap">
        <motion.div
          className="p31-close__panel"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          <h2 id="p31-close-title" className="p31-display">
            Start operating.
          </h2>
          <p className="p31-lead">Create a workspace in minutes.</p>
          <div className="p31-close__actions">
            <Link href="/onboarding" className="p31-btn p31-btn--primary">
              Start Free
            </Link>
            <Link href="/login" className="p31-btn p31-btn--ghost">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
