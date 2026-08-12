"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_STORY } from "./content";
import { LANDING_ENTER, LANDING_FADE } from "./motion";

/** Product story bands — one idea per section, not a feature dump. */
export function LandingFeatures(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section
      id="platform"
      className="p31-features"
      aria-label={t("landing.platform.ariaLabel")}
    >
      {LANDING_STORY.map((feature, index) => {
        const reverse = index % 2 === 1;
        return (
          <article
            key={feature.id}
            className={`p31-band${reverse ? " p31-band--reverse" : ""}`}
          >
            <div className="p31-wrap p31-band__grid">
              <motion.div
                className="p31-band__copy"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={LANDING_FADE}
              >
                <p className="p31-band__index">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="p31-display">
                  {t(`landing.platform.story.${feature.id}.title`)}
                </h2>
                <p className="p31-band__statement">
                  {t(`landing.platform.story.${feature.id}.statement`)}
                </p>
                <p className="p31-lead">
                  {t(`landing.platform.story.${feature.id}.detail`)}
                </p>
              </motion.div>

              <motion.div
                className={`p31-band__visual p31-band__visual--${feature.visual}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.992 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={LANDING_ENTER}
                aria-hidden="true"
              >
                <div className="p31-band__panel">
                  <span />
                  <span />
                  <span />
                </div>
              </motion.div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
