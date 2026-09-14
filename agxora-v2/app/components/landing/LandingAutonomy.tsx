"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import {
  LANDING_AGENT_STEPS,
  LANDING_AUTOMATION_KEYS,
} from "./content";
import { LANDING_FADE, hydrateSafeMotion } from "./motion";

export function LandingAutonomy(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <>
      <section id="agents" className="p31-agents" aria-labelledby="p31-agents-title">
        <div className="p31-wrap">
          <motion.div
            className="p31-section__intro"
            {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <h2 id="p31-agents-title" className="p31-display">
              {t("landing.agents.title")}
            </h2>
            <p className="p31-lead">{t("landing.agents.lead")}</p>
          </motion.div>
          <ol className="p31-agents__pipeline">
            {LANDING_AGENT_STEPS.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{t(`landing.agents.${step}`)}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="automation"
        className="p31-automation"
        aria-labelledby="p31-automation-title"
      >
        <div className="p31-wrap">
          <motion.div
            className="p31-section__intro"
            {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <h2 id="p31-automation-title" className="p31-display">
              {t("landing.automation.title")}
            </h2>
            <p className="p31-lead">{t("landing.automation.lead")}</p>
          </motion.div>
          <ul className="p31-cards">
            {LANDING_AUTOMATION_KEYS.map((key) => (
              <li key={key} className="p31-cards__item">
                <h3>{t(`landing.automation.${key}.title`)}</h3>
                <p>{t(`landing.automation.${key}.detail`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
