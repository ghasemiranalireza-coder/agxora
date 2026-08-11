"use client";

import Link from "next/link";
import type { JSX } from "react";
import { Button, Card } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";

export function SessionExpiredPage(): JSX.Element {
  const t = useT();

  return (
    <Card
      className="mx-auto max-w-lg space-y-4 text-center"
      padding="32px"
      hover={false}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
      >
        Identity & Access
      </p>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("auth.sessionExpired.title")}
      </h1>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("auth.sessionExpired.subtitle")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/login">
          <Button variant="primary" size="sm">
            {t("auth.sessionExpired.signIn")}
          </Button>
        </Link>
        <Link href="/">
          <Button variant="secondary" size="sm">
            {t("common.home")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
