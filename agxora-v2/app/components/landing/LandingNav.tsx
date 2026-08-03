"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { LANDING_NAV } from "./content";

export function LandingNav(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <header className="p31-header">
      <nav className="p31-nav" aria-label="Primary">
        <Link href="/" className="p31-wordmark">
          AGXORA
        </Link>

        <div
          id="p31-nav-links"
          className={`p31-nav__links${open ? " is-open" : ""}`}
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

        <div className="p31-nav__end">
          <Link href="/onboarding" className="p31-btn p31-btn--primary p31-btn--sm">
            Start Free
          </Link>
          <button
            type="button"
            className="p31-nav__menu"
            aria-expanded={open}
            aria-controls="p31-nav-links"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </nav>
    </header>
  );
}
