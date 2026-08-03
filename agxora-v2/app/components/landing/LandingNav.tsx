"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { LANDING_NAV } from "./content";

export function LandingNav(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <header className="lv2-header">
      <nav className="lv2-nav" aria-label="Primary">
        <Link href="/" className="lv2-logo">
          AGXORA
        </Link>

        <div
          id="lv2-nav-links"
          className={`lv2-nav__links${open ? " is-open" : ""}`}
        >
          {LANDING_NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </div>

        <div className="lv2-nav__actions">
          <Link href="/onboarding" className="lv2-btn lv2-btn--primary lv2-btn--sm">
            Start Free
          </Link>
          <button
            type="button"
            className="lv2-nav__menu"
            aria-expanded={open}
            aria-controls="lv2-nav-links"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </nav>
    </header>
  );
}
