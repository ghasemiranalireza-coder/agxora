"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FEATURES } from "./content";
import { LANDING_EASE } from "./motion";

export function LandingFeatureGrid(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className="agx-landing-section"
      aria-labelledby="landing-features-title"
    >
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Product</p>
        <h2 id="landing-features-title" className="agx-landing-title">
          A coherent feature surface
        </h2>
        <p className="agx-landing-lead">
          Showcase of real AGXORA capabilities already shipping in the platform —
          no fictional modules.
        </p>

        <div className="agx-landing-features">
          {LANDING_FEATURES.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="agx-landing-feature"
              tabIndex={0}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.45, delay: index * 0.04, ease: LANDING_EASE }}
            >
              <span className="agx-landing-feature__mark" aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
