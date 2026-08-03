"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE } from "./motion";

/** Large product surface — the software sells itself. */
export function LandingPreview(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="product"
      className="p31-product"
      aria-labelledby="p31-product-title"
    >
      <div className="p31-wrap">
        <motion.div
          className="p31-product__intro"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={LANDING_FADE}
        >
          <h2 id="p31-product-title" className="p31-display">
            One operating surface.
          </h2>
          <p className="p31-lead">
            Command, intelligence, and execution — unified.
          </p>
        </motion.div>

        <motion.div
          className="p31-product__frame"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ ...LANDING_FADE, duration: 0.65 }}
        >
          <div className="p31-product__chrome" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>agxora.app</span>
          </div>
          <div className="p31-product__canvas">
            <aside className="p31-product__rail" aria-hidden="true">
              <div className="p31-product__rail-brand">AGXORA</div>
              <ul>
                <li data-on="true">Command</li>
                <li>AI</li>
                <li>Automation</li>
                <li>Analytics</li>
                <li>Integrations</li>
              </ul>
            </aside>
            <div className="p31-product__stage">
              <header className="p31-product__stage-head">
                <h3>Command Center</h3>
                <span>Live</span>
              </header>
              <div className="p31-product__metrics">
                <article>
                  <em>Revenue pulse</em>
                  <strong>+12.4%</strong>
                </article>
                <article>
                  <em>Active agents</em>
                  <strong>28</strong>
                </article>
                <article>
                  <em>Workflows</em>
                  <strong>146</strong>
                </article>
              </div>
              <div className="p31-product__chart" aria-hidden="true">
                <span style={{ height: "42%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "47%" }} />
                <span style={{ height: "72%" }} />
                <span style={{ height: "64%" }} />
                <span style={{ height: "86%" }} />
                <span style={{ height: "78%" }} />
                <span style={{ height: "94%" }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
