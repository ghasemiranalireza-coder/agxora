import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";
import { LOOP_STEPS } from "./model";

/** Governed loop. Approval is the gate. The path returns to the next goal. */
export function GovernedExecutionLoop(): JSX.Element {
  const { t } = useLocale();

  return (
    <div className="p31-loop-wrap">
      <ol className="p31-loop" aria-label={t("landing.visuals.loopAria")}>
        {LOOP_STEPS.map((step) => (
          <li
            key={step}
            className={step === "approval" ? "p31-loop__step p31-loop__step--gate" : "p31-loop__step"}
          >
            <span>{t(`landing.visuals.${step}`)}</span>
            {step === "approval" ? (
              <small>{t("landing.visuals.governance")}</small>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="p31-loop__caption">{t("landing.visuals.loopCaption")}</p>
    </div>
  );
}
