"use client";

import {
  useCallback,
  useEffect,
  useState,
  type JSX,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher, useLocale } from "../../lib/i18n";
import { LANDING_NAV } from "./content";
import { LandingCta } from "./LandingCta";

export function LandingNav(): JSX.Element {
  const pathname = usePathname();
  const { t } = useLocale();
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

  const scrollToHash = (href: string): void => {
    if (pathname !== "/") return;
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", href);
    setHash(href);
  };

  return (
    <header className={`p31-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <nav className="p31-nav" aria-label={t("landing.nav.ariaPrimary")}>
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
            const label = t(item.messageKey);
            if (item.href.startsWith("/")) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={className}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {label}
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
                  event.preventDefault();
                  scrollToHash(item.href);
                }}
              >
                {label}
              </a>
            );
          })}
          <Link href="/login" onClick={close}>
            {t("landing.nav.signIn")}
          </Link>
          <div className="p31-nav__mobile-cta">
            <LandingCta href="/register" size="sm">
              {t("landing.nav.startFree")}
            </LandingCta>
          </div>
        </div>

        <div className="p31-nav__end">
          <div className="p31-lang">
            <LanguageSwitcher id="landing-language" className="p31-lang__control" />
          </div>
          <LandingCta href="/register" size="sm" className="p31-nav__desktop-cta">
            {t("landing.nav.startFree")}
          </LandingCta>
          <button
            type="button"
            className="p31-nav__menu"
            aria-expanded={open}
            aria-controls="p31-nav-links"
            aria-label={open ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")}
          </button>
        </div>
      </nav>
      {open ? (
        <button
          type="button"
          className="p31-nav__backdrop"
          aria-label={t("landing.nav.closeMenu")}
          onClick={close}
        />
      ) : null}
    </header>
  );
}
