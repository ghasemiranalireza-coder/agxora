"use client";

import Link from "next/link";
import type { JSX } from "react";
import type { AccessErrorCode } from "../../lib/identity";
import { Card, Button } from "../ui";
import { isTranslationKey, useT } from "../../lib/i18n";

export function AccessState({
  code,
  detail,
}: {
  readonly code: AccessErrorCode;
  readonly detail?: string;
}): JSX.Element {
  const t = useT();
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center" padding="32px" hover={false}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
      >
        {t("iam.access.eyebrow")}
      </p>
      <h1 className="text-2xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {t(`iam.access.${code}.title`)}
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {detail && isTranslationKey(detail)
          ? t(detail)
          : t(`iam.access.${code}.description`)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/login">
          <Button variant="primary" size="sm">
            {t("iam.access.signIn")}
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            {t("iam.access.backToDashboard")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
