"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FEATURES } from "./content";
import { LANDING_FADE } from "./motion";

/** Large visual bands — one idea per section. Not a card grid. */
export function LandingFeatures(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="platform"
      className="p31-features"
      aria-label="Platform capabilities"
    >
      {LANDING_FEATURES.map((feature, index) => {
        const reverse = index % 2 === 1;
        return (
          <article
            key={feature.id}
            className={`p31-band${reverse ? " p31-band--reverse" : ""}`}
          >
            <div className="p31-wrap p31-band__grid">
              <motion.div
                className="p31-band__copy"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={LANDING_FADE}
              >
                <p className="p31-band__index">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="p31-display">{feature.title}</h2>
                <p className="p31-band__statement">{feature.statement}</p>
                <p className="p31-lead">{feature.detail}</p>
              </motion.div>

              <motion.div
                className={`p31-band__visual p31-band__visual--${feature.id}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...LANDING_FADE, duration: 0.6 }}
                aria-hidden="true"
              >
                <div className="p31-band__panel">
                  <span />
                  <span />
                  <span />
                </div>
              </motion.div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
