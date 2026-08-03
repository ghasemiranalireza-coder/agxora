import type { JSX } from "react";
import Link from "next/link";

export function LandingFooter(): JSX.Element {
  return (
    <footer className="agx-landing-footer">
      <div className="agx-landing-footer__brand">
        <strong>AGXORA</strong>
        <span>Enterprise AI Operating System</span>
      </div>
      <nav aria-label="Footer">
        <Link href="/login">Sign in</Link>
        <Link href="/onboarding">Start free</Link>
        <a href="#platform">Platform</a>
        <a href="#trust">Trust</a>
        <a href="mailto:hello@agxora.app">Contact</a>
      </nav>
      <p className="agx-landing-footer__copy">© 2026 AGXORA. All rights reserved.</p>
    </footer>
  );
}
