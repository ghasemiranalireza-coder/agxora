"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_PILLARS } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingPillars(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="pillars"
      className="lv2-section"
      aria-labelledby="lv2-pillars-title"
    >
      <div className="lv2-container">
        <motion.div
          className="lv2-section__head"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE_UP}
        >
          <p className="lv2-kicker">Platform</p>
          <h2 id="lv2-pillars-title" className="lv2-heading">
            Four enterprise pillars
          </h2>
        </motion.div>

        <div className="lv2-pillars">
          {LANDING_PILLARS.map((item, index) => (
            <motion.article
              key={item.title}
              className="lv2-pillar"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...LANDING_FADE_UP, delay: index * 0.05 }}
            >
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
