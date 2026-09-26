import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { SURFACE_PATH } from "./model";
import { StatusMark } from "./StatusMark";

/** Conceptual miniature of one AGXORA workspace. Illustrative, not a live tenant. */
export function OperatingSurfaceVisual(): JSX.Element {
  const { t } = useLocale();

  return (
    <figure className="p31-os">
      <figcaption className="sr-only">{t("landing.visuals.surfaceAria")}</figcaption>
      <header className="p31-os__bar">
        <strong>{t("landing.product.railBrand")}</strong>
        <StatusMark tone="workspace">{t("landing.product.stageBadge")}</StatusMark>
      </header>
      <div className="p31-os__body">
        <ul className="p31-os__rail" aria-label={t("landing.product.railAria")}>
          <li data-on="true">{t("landing.visuals.crm")}</li>
          <li>{t("landing.visuals.finance")}</li>
          <li>{t("landing.visuals.agentsNav")}</li>
          <li>{t("landing.visuals.settings")}</li>
        </ul>
        <div className="p31-os__main">
          <p className="p31-os__kicker">{t("landing.visuals.businessContext")}</p>
          <p className="p31-os__context">{t("landing.visuals.customerHistoryGoal")}</p>
          <article className="p31-os__work">
            <header>
              <strong>{t("landing.visuals.customerCommunication")}</strong>
              <StatusMark tone="live">{t("landing.visuals.statusLive")}</StatusMark>
            </header>
            <ol className="p31-os__path">
              {SURFACE_PATH.map((step) => (
                <li key={step} data-gate={step === "approval" ? "true" : undefined}>
                  {t(`landing.visuals.${step}`)}
                </li>
              ))}
            </ol>
          </article>
          <article className="p31-os__work p31-os__work--future">
            <header>
              <strong>{t("landing.visuals.marketing")}</strong>
              <StatusMark tone="direction">{t("landing.visuals.statusDirection")}</StatusMark>
            </header>
            <p>{t("landing.visuals.marketingNote")}</p>
          </article>
        </div>
      </div>
    </figure>
  );
}
