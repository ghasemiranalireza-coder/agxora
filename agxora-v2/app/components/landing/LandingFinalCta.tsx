"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LandingCta } from "./LandingCta";
import { LANDING_FADE } from "./motion";

export function LandingFinalCta(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section id="start" className="p31-close" aria-labelledby="p31-close-title">
      <div className="p31-wrap">
        <motion.div
          className="p31-close__panel"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={LANDING_FADE}
        >
          <h2 id="p31-close-title" className="p31-display">
            {t("landing.close.title")}
          </h2>
          <p className="p31-lead">{t("landing.close.lead")}</p>
          <div className="p31-close__actions">
            <LandingCta href="/register">{t("landing.close.ctaStart")}</LandingCta>
            <LandingCta href="/pricing" variant="ghost">
              {t("landing.close.ctaPricing")}
            </LandingCta>
            <LandingCta href="/contact-sales" variant="ghost">
              {t("landing.close.ctaSales")}
            </LandingCta>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
