"use client";

import type { JSX } from "react";
import { LegalPageShell } from "../../components/legal";
import { useT } from "../../lib/i18n";
import { LEGAL_FRAMEWORK_SECTIONS } from "../../lib/legal/framework";

export function LegalFrameworkPage(): JSX.Element {
  const t = useT();

  return (
    <LegalPageShell
      title={t("legal.framework.title")}
      eyebrow={t("legal.framework.eyebrow")}
    >
      <p>{t("legal.framework.reviewNotice")}</p>
      {LEGAL_FRAMEWORK_SECTIONS.map((section) => (
        <section key={section.id}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </section>
      ))}
    </LegalPageShell>
  );
}
