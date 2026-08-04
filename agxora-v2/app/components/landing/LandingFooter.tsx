import type { JSX } from "react";
import Link from "next/link";
import { COMPANY } from "../../lib/company";

export function LandingFooter(): JSX.Element {
  return (
    <footer className="p31-footer">
      <div className="p31-wrap p31-footer__row">
        <strong className="p31-wordmark">AGXORA</strong>
        <nav aria-label="Footer">
          <Link href="#product">Product</Link>
          <Link href="#platform">Platform</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Start Free</Link>
          <Link href="/demo">Book Demo</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/contact-sales">Contact Sales</Link>
        </nav>
        <p>© 2026 {COMPANY.name}</p>
      </div>
      <div className="p31-wrap p31-footer__legal">
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/imprint">Imprint</Link>
        </nav>
        <p>
          <a href={`mailto:${COMPANY.email.company}`}>{COMPANY.email.company}</a>
          {" · "}
          <a href={`mailto:${COMPANY.email.support}`}>{COMPANY.email.support}</a>
        </p>
      </div>
    </footer>
  );
}
