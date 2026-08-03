"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_TRUST } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingTrust(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="trust"
      className="agx-landing-section"
      aria-labelledby="landing-trust-title"
    >
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Trust</p>
        <h2 id="landing-trust-title" className="agx-landing-title">
          Ready for enterprise scrutiny
        </h2>
        <p className="agx-landing-lead">
          Placeholders for launch partners, compliance programs, and operational
          guarantees — structured for real content as AGXORA goes public.
        </p>

        <div className="agx-landing-trust">
          {LANDING_TRUST.map((item, index) => (
            <motion.article
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...LANDING_FADE_UP, delay: index * 0.04 }}
            >
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
