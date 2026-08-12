"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_TRUST_KEYS } from "./content";
import { LANDING_FADE } from "./motion";

/** Trust strip — honest product signals only (no invented logos). */
export function LandingTrust(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section className="p31-trust" aria-label={t("landing.trust.ariaLabel")}>
      <div className="p31-wrap">
        <motion.p
          className="p31-trust__eyebrow"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          {t("landing.trust.eyebrow")}
        </motion.p>

        <ul className="p31-trust__signals">
          {LANDING_TRUST_KEYS.map((key, i) => (
            <motion.li
              key={key}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                ...LANDING_FADE,
                delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.12),
              }}
            >
              <strong>{t(`landing.trust.signals.${key}.title`)}</strong>
              <span>{t(`landing.trust.signals.${key}.detail`)}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
