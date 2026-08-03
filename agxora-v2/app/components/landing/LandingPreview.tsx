"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_FADE_UP } from "./motion";

/** Stylized preview of AGXORA command surfaces — reflective of real modules. */
export function LandingPreview(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <section className="agx-landing-section" aria-labelledby="landing-preview-title">
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Inside AGXORA</p>
        <h2 id="landing-preview-title" className="agx-landing-title">
          Application preview
        </h2>
        <p className="agx-landing-lead">
          A faithful composition of the command center vocabulary already in product —
          workspaces, agents, automation, and intelligence.
        </p>

        <motion.div
          className="agx-landing-preview"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ ...LANDING_FADE_UP, duration: 0.5 }}
        >
          <div className="agx-landing-preview__chrome" aria-hidden="true">
            <span className="agx-landing-preview__dot" />
            <span className="agx-landing-preview__dot" />
            <span className="agx-landing-preview__dot" />
            <span>agxora.app / dashboard</span>
          </div>
          <div className="agx-landing-preview__body">
            <aside className="agx-landing-preview__rail" aria-label="Preview navigation">
              <p>Navigate</p>
              <ul>
                <li data-active="true">Command Center</li>
                <li>AI Agents</li>
                <li>Automation</li>
                <li>Intelligence</li>
                <li>Integrations</li>
              </ul>
            </aside>
            <div className="agx-landing-preview__main">
              <h3>Command Center</h3>
              <p>
                Live operational context across CRM, projects, finance, and AI —
                the same surfaces available after you sign in.
              </p>
              <div className="agx-landing-preview__tiles">
                <div className="agx-landing-preview__tile">
                  <strong>Agents</strong>
                  <span>Governed runtime</span>
                </div>
                <div className="agx-landing-preview__tile">
                  <strong>Workflows</strong>
                  <span>Durable automation</span>
                </div>
                <div className="agx-landing-preview__tile">
                  <strong>Intelligence</strong>
                  <span>Enterprise insights</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
