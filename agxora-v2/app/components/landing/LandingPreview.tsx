"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE_UP } from "./motion";

/** Full-width product preview reflecting real AGXORA surfaces. */
export function LandingPreview(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="product"
      className="lv2-section lv2-preview"
      aria-labelledby="lv2-preview-title"
    >
      <div className="lv2-container">
        <motion.div
          className="lv2-preview__intro"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={LANDING_FADE_UP}
        >
          <p className="lv2-kicker">Product</p>
          <h2 id="lv2-preview-title" className="lv2-heading">
            See the platform
          </h2>
        </motion.div>

        <motion.div
          className="lv2-preview__frame"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ ...LANDING_FADE_UP, duration: 0.6 }}
        >
          <div className="lv2-preview__chrome" aria-hidden="true">
            <span />
            <span />
            <span />
            <em>agxora.app / dashboard</em>
          </div>
          <div className="lv2-preview__body">
            <aside className="lv2-preview__rail">
              <p>AGXORA</p>
              <ul>
                <li data-active="true">Command Center</li>
                <li>AI</li>
                <li>Automation</li>
                <li>Analytics</li>
                <li>Integrations</li>
              </ul>
            </aside>
            <div className="lv2-preview__main">
              <header>
                <h3>Command Center</h3>
                <p>Live operational context across your business.</p>
              </header>
              <div className="lv2-preview__panels">
                <article>
                  <strong>Pipeline</strong>
                  <span>Healthy</span>
                </article>
                <article>
                  <strong>Agents</strong>
                  <span>Active</span>
                </article>
                <article>
                  <strong>Workflows</strong>
                  <span>Running</span>
                </article>
                <article>
                  <strong>Insights</strong>
                  <span>Updated</span>
                </article>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
