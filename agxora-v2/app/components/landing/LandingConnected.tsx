"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AGStatus } from "../ag/AGStatus";
import { BrandTile } from "../ui/BrandMark";
import { PROVIDER_REGISTRY } from "../../lib/integrations/registry";
import { useLocale } from "../../lib/i18n";
import { LandingCta } from "./LandingCta";
import { LANDING_ENTER, LANDING_FADE, hydrateSafeMotion } from "./motion";

/**
 * Honest public catalog projection from the canonical registry.
 * Never shows connected/healthy/synced — public pages have no tenant session.
 */
export function LandingConnected(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();
  const available = PROVIDER_REGISTRY.filter(
    (entry) => entry.implementationStatus === "available",
  );
  const comingSoon = PROVIDER_REGISTRY.filter(
    (entry) => entry.implementationStatus === "coming_soon",
  );

  return (
    <section
      id="connected"
      className="p31-connected"
      aria-labelledby="p31-connected-title"
    >
      <div className="p31-wrap">
        <motion.div
          className="p31-section__intro"
          {...hydrateSafeMotion(reduceMotion, LANDING_FADE)}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <h2 id="p31-connected-title" className="p31-display">
            {t("landing.connected.title")}
          </h2>
          <p className="p31-lead">{t("landing.connected.lead")}</p>
        </motion.div>

        <div className="p31-connected__grid">
          {available.map((entry, index) => (
            <motion.article
              key={entry.providerId}
              className="p31-connected__card"
              {...hydrateSafeMotion(reduceMotion, {
                ...LANDING_ENTER,
                delay: Math.min(index * 0.04, 0.12),
              })}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <header>
                <BrandTile id={entry.brandMark} />
                <div>
                  <strong>{entry.displayName}</strong>
                  <AGStatus status="available">{t("landing.connected.available")}</AGStatus>
                </div>
              </header>
              <p>{entry.description}</p>
            </motion.article>
          ))}
        </div>

        <div className="p31-connected__soon">
          <p className="p31-connected__soon-lead">{t("landing.connected.comingSoonLead")}</p>
          <ul>
            {comingSoon.map((entry) => (
              <li key={entry.providerId}>
                <BrandTile id={entry.brandMark} size={28} />
                <span>{entry.displayName}</span>
                <AGStatus status="coming_soon">{t("landing.connected.comingSoon")}</AGStatus>
              </li>
            ))}
          </ul>
        </div>

        <div className="p31-connected__cta">
          <LandingCta href="/dashboard/integrations">{t("landing.connected.cta")}</LandingCta>
        </div>
      </div>
    </section>
  );
}
