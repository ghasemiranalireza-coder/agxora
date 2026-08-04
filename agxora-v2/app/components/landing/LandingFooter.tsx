import type { JSX } from "react";
import Link from "next/link";

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
          <Link href="/contact-sales">Contact Sales</Link>
          <a href="mailto:hello@agxora.app">Contact</a>
        </nav>
        <p>© 2026 AGXORA</p>
      </div>
    </footer>
  );
}
