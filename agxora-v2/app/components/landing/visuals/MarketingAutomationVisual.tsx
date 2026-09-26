import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { MARKETING_STEPS } from "./model";
import { StatusMark } from "./StatusMark";

/** Future marketing path. Explicitly not a live workforce. */
export function MarketingAutomationVisual(): JSX.Element {
  const { t } = useLocale();

  return (
    <figure className="p31-mkt">
      <figcaption className="p31-mkt__head">
        <strong>{t("landing.visuals.marketingTitle")}</strong>
        <StatusMark tone="direction">{t("landing.visuals.statusDirection")}</StatusMark>
      </figcaption>
      <p className="p31-mkt__note">{t("landing.visuals.marketingNote")}</p>
      <ol className="p31-mkt__path" aria-label={t("landing.visuals.marketingAria")}>
        {MARKETING_STEPS.map((step) => (
          <li key={step} data-gate={step === "approval" ? "true" : undefined}>
            {t(`landing.visuals.${step}`)}
          </li>
        ))}
      </ol>
    </figure>
  );
}
