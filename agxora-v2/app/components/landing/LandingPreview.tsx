"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "../../lib/i18n";
import { LANDING_PREVIEW_MODULES } from "./content";
import { LANDING_ENTER, LANDING_FADE } from "./motion";

/** Illustrative product preview — clearly labeled, no fabricated live metrics. */
export function LandingPreview(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();

  return (
    <section
      id="product"
      className="p31-product"
      aria-labelledby="p31-product-title"
    >
      <div className="p31-wrap p31-wrap--wide">
        <motion.div
          className="p31-product__intro"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={LANDING_FADE}
        >
          <h2 id="p31-product-title" className="p31-display">
            {t("landing.product.title")}
          </h2>
          <p className="p31-lead">{t("landing.product.lead")}</p>
        </motion.div>

        <motion.div
          className="p31-product__bezel p31-product__bezel--xl"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={LANDING_ENTER}
        >
          <div className="p31-product__frame">
            <div className="p31-product__chrome" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>{t("landing.product.chromePath")}</span>
            </div>
            <div className="p31-product__canvas">
              <aside className="p31-product__rail" aria-label={t("landing.product.railAria")}>
                <div className="p31-product__rail-brand">
                  {t("landing.product.railBrand")}
                </div>
                <ul>
                  <li data-on="true">{t("landing.product.navCommand")}</li>
                  <li>{t("landing.product.navAi")}</li>
                  <li>{t("landing.product.navAutomation")}</li>
                  <li>{t("landing.product.navAnalytics")}</li>
                  <li>{t("landing.product.navIntegrations")}</li>
                </ul>
              </aside>
              <div className="p31-product__stage">
                <header className="p31-product__stage-head">
                  <h3>{t("landing.product.stageTitle")}</h3>
                  <span className="p31-product__badge">
                    {t("landing.product.stageBadge")}
                  </span>
                </header>
                <div className="p31-product__metrics">
                  {LANDING_PREVIEW_MODULES.map((key) => (
                    <article key={key}>
                      <em>{t(`landing.product.${key}`)}</em>
                    </article>
                  ))}
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
