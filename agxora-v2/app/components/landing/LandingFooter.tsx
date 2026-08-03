import type { JSX } from "react";
import Link from "next/link";
import { LANDING_FOOTER } from "./content";

export function LandingFooter(): JSX.Element {
  return (
    <footer className="lv2-footer">
      <div className="lv2-container lv2-footer__grid">
        <div className="lv2-footer__brand">
          <strong className="lv2-logo">AGXORA</strong>
          <p>Enterprise Intelligence Platform</p>
        </div>

        <div>
          <h3>Product</h3>
          <ul>
            {LANDING_FOOTER.product.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Company</h3>
          <ul>
            {LANDING_FOOTER.company.map((item) => (
              <li key={item.label}>
                {item.href.startsWith("mailto:") ? (
                  <a href={item.href}>{item.label}</a>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Legal</h3>
          <ul>
            {LANDING_FOOTER.legal.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="lv2-container lv2-footer__bottom">
        <p>© 2026 AGXORA. All rights reserved.</p>
      </div>
    </footer>
  );
}
