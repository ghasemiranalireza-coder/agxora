"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX, ReactNode } from "react";
import { useLocale } from "../../../lib/i18n";
import "./finance.css";

const LINKS = [
  { href: "/dashboard/finance", key: "finance.core.nav.overview", exact: true },
  { href: "/dashboard/finance/delivery-notes", key: "finance.core.nav.deliveryNotes" },
  { href: "/dashboard/finance/invoices", key: "finance.core.nav.invoices" },
  { href: "/dashboard/settings/finance", key: "finance.core.nav.documents" },
] as const;

export function FinanceShell({
  children,
  titleKey,
  subtitleKey,
}: {
  readonly children: ReactNode;
  readonly titleKey?: string;
  readonly subtitleKey?: string;
}): JSX.Element {
  const { t } = useLocale();
  const pathname = usePathname();

  return (
    <div className="agx-ui-module-page agx-page-enter agx-finance-core">
      <header className="space-y-3">
        <p className="agx-ui-section-title">{t("finance.core.brand")}</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          {t(titleKey ?? "finance.core.title")}
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t(subtitleKey ?? "finance.core.subtitle")}
        </p>
        <p
          role="note"
          className="max-w-2xl rounded-xl border px-3 py-2 text-xs leading-relaxed"
          style={{
            borderColor: "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
            background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
            color: "var(--agx-text, #f8fafc)",
          }}
        >
          {t("finance.core.honesty")}
        </p>
        <nav className="agx-finance-nav" aria-label={t("finance.core.nav.label")}>
          {LINKS.map((link) => {
            const exact = "exact" in link && link.exact;
            const current = exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
