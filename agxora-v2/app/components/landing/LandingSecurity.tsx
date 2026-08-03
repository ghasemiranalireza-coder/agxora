"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_SECURITY } from "./content";
import { LANDING_FADE_UP } from "./motion";

export function LandingSecurity(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="security"
      className="lv2-section lv2-security"
      aria-labelledby="lv2-security-title"
    >
      <div className="lv2-container">
        <motion.div
          className="lv2-section__head"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE_UP}
        >
          <p className="lv2-kicker">Trust</p>
          <h2 id="lv2-security-title" className="lv2-heading">
            Security. Compliance. Privacy.
          </h2>
        </motion.div>

        <div className="lv2-security__grid">
          {LANDING_SECURITY.map((item, index) => (
            <motion.article
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
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
