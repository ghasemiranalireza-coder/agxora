"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_STATS, LANDING_TRUST_LOGOS } from "./content";
import { LANDING_FADE } from "./motion";

export function LandingTrust(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="p31-trust" aria-label="Trust">
      <div className="p31-wrap">
        <motion.p
          className="p31-trust__eyebrow"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          Trusted by modern businesses
        </motion.p>

        <ul className="p31-trust__logos">
          {LANDING_TRUST_LOGOS.map((name, i) => (
            <motion.li
              key={name}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...LANDING_FADE, delay: i * 0.04 }}
            >
              {name}
            </motion.li>
          ))}
        </ul>

        <div className="p31-trust__stats">
          {LANDING_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="p31-trust__stat"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...LANDING_FADE, delay: 0.08 + i * 0.05 }}
            >
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
