"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_SECURITY_KEYS, LANDING_USE_CASE_KEYS } from "./content";
import { LANDING_FADE, hydrateSafeMotion } from "./motion";

export function LandingControl(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <>
      <section id="control" className="p31-control" aria-labelledby="p31-control-title">
        <div className="p31-wrap">
          <motion.div
            className="p31-section__intro"
            {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <h2 id="p31-control-title" className="p31-display">
              {t("landing.security.title")}
            </h2>
            <p className="p31-lead">{t("landing.security.lead")}</p>
          </motion.div>
          <ul className="p31-cards">
            {LANDING_SECURITY_KEYS.map((key) => (
              <li key={key} className="p31-cards__item">
                <h3>{t(`landing.security.${key}.title`)}</h3>
                <p>{t(`landing.security.${key}.detail`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="use-cases"
        className="p31-usecases"
        aria-labelledby="p31-usecases-title"
      >
        <div className="p31-wrap">
          <motion.div
            className="p31-section__intro"
            {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <h2 id="p31-usecases-title" className="p31-display">
              {t("landing.useCases.title")}
            </h2>
            <p className="p31-lead">{t("landing.useCases.lead")}</p>
          </motion.div>
          <ul className="p31-usecases__list">
            {LANDING_USE_CASE_KEYS.map((key) => (
              <li key={key}>{t(`landing.useCases.${key}`)}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
