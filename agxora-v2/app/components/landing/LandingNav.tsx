"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { LANDING_NAV } from "./content";

export function LandingNav(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav className="agx-landing-nav" aria-label="Primary">
        <Link href="/" className="agx-landing-nav__brand">
          AGXORA
        </Link>

        <div
          id="landing-nav-links"
          className={`agx-landing-nav__links${open ? " is-open" : ""}`}
        >
          {LANDING_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/onboarding" className="agx-landing-nav__cta">
            Start Free
          </Link>
          <button
            type="button"
            className="agx-landing-nav__menu"
            aria-expanded={open}
            aria-controls="landing-nav-links"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </nav>
    </header>
  );
}
