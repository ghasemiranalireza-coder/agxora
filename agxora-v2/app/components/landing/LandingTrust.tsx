"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_TRUST_LOGOS } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingTrust(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="lv2-section lv2-trust" aria-label="Trusted by">
      <div className="lv2-container">
        <motion.p
          className="lv2-trust__label"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={LANDING_FADE_UP}
        >
          Trusted by Modern Businesses
        </motion.p>
        <ul className="lv2-trust__logos">
          {LANDING_TRUST_LOGOS.map((name, index) => (
            <motion.li
              key={name}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...LANDING_FADE_UP, delay: index * 0.04 }}
            >
              {name}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
