import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { INTELLIGENCE_STEPS } from "./model";

/** Context → understanding → plan → approval → verified result. No metrics. */
export function BusinessIntelligenceVisual(): JSX.Element {
  const { t } = useLocale();

  return (
    <ol className="p31-intel" aria-label={t("landing.visuals.intelligenceAria")}>
      {INTELLIGENCE_STEPS.map((step, index) => (
        <li
          key={step.id}
          className={`p31-intel__step${step.id === "approval" ? " p31-intel__step--gate" : ""}`}
        >
          <span className="p31-intel__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <strong>
              {step.title === "agxora"
                ? t("landing.network.agxora")
                : t(`landing.visuals.${step.title}`)}
            </strong>
            <p>{t(`landing.visuals.${step.detail}`)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
