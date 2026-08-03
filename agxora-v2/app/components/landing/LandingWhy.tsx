"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_WHY } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingWhy(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="lv2-section lv2-why" aria-labelledby="lv2-why-title">
      <div className="lv2-container">
        <motion.div
          className="lv2-section__head"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE_UP}
        >
          <p className="lv2-kicker">Why AGXORA</p>
          <h2 id="lv2-why-title" className="lv2-heading">
            Built for operators who scale
          </h2>
        </motion.div>

        <div className="lv2-why__grid">
          {LANDING_WHY.map((item, index) => (
            <motion.article
              key={item.title}
              className="lv2-why__card"
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
