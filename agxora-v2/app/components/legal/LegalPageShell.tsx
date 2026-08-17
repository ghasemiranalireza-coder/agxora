"use client";

import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { COMPANY } from "../../lib/company";
import { useT } from "../../lib/i18n";
import "./legal.css";

export function LegalPageShell({
  title,
  eyebrow,
  children,
}: {
  readonly title: string;
  readonly eyebrow?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const t = useT();

  return (
    <div className="p39-legal">
      <header className="p39-legal__header">
        <Link href="/" className="p39-legal__brand">
          {t("legal.shell.brand")}
        </Link>
        <nav className="p39-legal__nav" aria-label={t("legal.shell.navLabel")}>
          <Link href="/privacy">{t("legal.shell.nav.privacy")}</Link>
          <Link href="/terms">{t("legal.shell.nav.terms")}</Link>
          <Link href="/cookies">{t("legal.shell.nav.cookies")}</Link>
          <Link href="/imprint">{t("legal.shell.nav.imprint")}</Link>
          <Link href="/contact">{t("legal.shell.nav.contact")}</Link>
        </nav>
      </header>

      <main className="p39-legal__main">
        {eyebrow ? <p className="p39-legal__eyebrow">{eyebrow}</p> : null}
        <h1 className="p39-legal__title">{title}</h1>
        <p className="p39-legal__updated">
          {t("legal.shell.lastUpdated", { date: COMPANY.lastUpdated })}
        </p>
        <div className="p39-legal__prose">{children}</div>
      </main>

      <footer className="p39-legal__footer">
        <p>{t("legal.shell.footerCopyright", { company: COMPANY.name })}</p>
        <nav aria-label={t("legal.shell.footerNavLabel")}>
          <Link href="/">{t("legal.shell.footer.home")}</Link>
          <Link href="/pricing">{t("legal.shell.footer.pricing")}</Link>
          <Link href="/contact">{t("legal.shell.footer.contact")}</Link>
        </nav>
      </footer>
    </div>
  );
}
