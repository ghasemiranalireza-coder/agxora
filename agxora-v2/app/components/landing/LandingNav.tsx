"use client";

import {
  useCallback,
  useEffect,
  useState,
  type JSX,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDING_NAV } from "./content";
import { LandingCta } from "./LandingCta";

export function LandingNav(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hash, setHash] = useState("");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncHash = (): void => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const isActive = (href: string): boolean => {
    if (href.startsWith("/")) return pathname === href;
    if (href.startsWith("#")) return hash === href;
    return false;
  };

  return (
    <header className={`p31-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <nav className="p31-nav" aria-label="Primary">
        <Link href="/" className="p31-wordmark" onClick={close}>
          AGXORA
        </Link>

        <div
          id="p31-nav-links"
          className={`p31-nav__links${open ? " is-open" : ""}`}
        >
          {LANDING_NAV.map((item) => {
            const active = isActive(item.href);
            const className = active ? "is-active" : undefined;
            if (item.href.startsWith("/")) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={className}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <a
                key={item.href}
                href={item.href}
                className={className}
                aria-current={active ? "true" : undefined}
                onClick={(event) => {
                  close();
                  if (pathname !== "/") return;
                  const id = item.href.slice(1);
                  const el = document.getElementById(id);
                  if (!el) return;
                  event.preventDefault();
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", item.href);
                  setHash(item.href);
                }}
              >
                {item.label}
              </a>
            );
          })}
          <Link href="/login" onClick={close}>
            Sign in
          </Link>
          <div className="p31-nav__mobile-cta">
            <LandingCta href="/register" size="sm">
              Start Free
            </LandingCta>
          </div>
        </div>

        <div className="p31-nav__end">
          <LandingCta href="/register" size="sm" className="p31-nav__desktop-cta">
            Start Free
          </LandingCta>
          <button
            type="button"
            className="p31-nav__menu"
            aria-expanded={open}
            aria-controls="p31-nav-links"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      {open ? (
        <button
          type="button"
          className="p31-nav__backdrop"
          aria-label="Close menu"
          onClick={close}
        />
      ) : null}
    </header>
  );
}
