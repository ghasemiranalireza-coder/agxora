import type { JSX } from "react";
import { useLocale } from "../../../lib/i18n";

/** Separate product surfaces before they share one workspace. */
export function FragmentedWorkVisual(): JSX.Element {
  const { t } = useLocale();
  const surfaces = ["moduleCustomers", "moduleFinance", "moduleDocuments"] as const;

  return (
    <figure className="p31-split">
      <figcaption>{t("landing.visuals.separateSurfaces")}</figcaption>
      <ul aria-label={t("landing.visuals.fragmentedAria")}>
        {surfaces.map((key) => (
          <li key={key}>{t(`landing.product.${key}`)}</li>
        ))}
      </ul>
    </figure>
  );
}
