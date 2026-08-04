import Link from "next/link";
import type { JSX, ReactNode } from "react";
import { COMPANY } from "../../lib/company";
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
  return (
    <div className="p39-legal">
      <header className="p39-legal__header">
        <Link href="/" className="p39-legal__brand">
          AGXORA
        </Link>
        <nav className="p39-legal__nav" aria-label="Legal navigation">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/imprint">Imprint</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <main className="p39-legal__main">
        {eyebrow ? <p className="p39-legal__eyebrow">{eyebrow}</p> : null}
        <h1 className="p39-legal__title">{title}</h1>
        <p className="p39-legal__updated">Last updated: {COMPANY.lastUpdated}</p>
        <div className="p39-legal__prose">{children}</div>
      </main>

      <footer className="p39-legal__footer">
        <p>© 2026 {COMPANY.name}</p>
        <nav aria-label="Legal footer">
          <Link href="/">Home</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
