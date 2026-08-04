"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_TRUST_SIGNALS } from "./content";
import { LANDING_FADE } from "./motion";

/** Trust strip — generic indicators only (no invented logos). */
export function LandingTrust(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="p31-trust" aria-label="Trust indicators">
      <div className="p31-wrap">
        <motion.p
          className="p31-trust__eyebrow"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          Why teams choose AGXORA
        </motion.p>

        <ul className="p31-trust__signals">
          {LANDING_TRUST_SIGNALS.map((item, i) => (
            <motion.li
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...LANDING_FADE, delay: i * 0.04 }}
            >
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
