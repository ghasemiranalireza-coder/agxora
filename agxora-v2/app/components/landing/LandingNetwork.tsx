"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_FADE, hydrateSafeMotion } from "./motion";
import { BusinessSystemDiagram } from "./visuals/BusinessSystemDiagram";

/** Business → AGXORA → workforce → systems. Statuses are conceptual, not a tenant. */
export function LandingNetwork(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section className="p31-network" aria-labelledby="p31-network-title">
      <div className="p31-wrap">
        <motion.div
          className="p31-section__intro"
          {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <h2 id="p31-network-title" className="p31-display">
            {t("landing.network.title")}
          </h2>
          <p className="p31-lead">{t("landing.network.lead")}</p>
        </motion.div>

        <motion.div
          className="p31-network__stage"
          {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <BusinessSystemDiagram />
        </motion.div>
      </div>
    </section>
  );
}
