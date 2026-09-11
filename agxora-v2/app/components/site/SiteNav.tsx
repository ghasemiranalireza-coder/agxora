"use client";

import Link from "next/link";
import { useState, type JSX } from "react";
import { Icon } from "../ui/icons";
import { AgxoraLogo } from "./AgxoraLogo";

/**
 * Landing navigation. Every item is a real destination — sections that
 * exist on this page get anchors, real routes get links. Items without a
 * destination (Preise, Vertrieb, Ressourcen) are omitted until their
 * pages ship, instead of rendering dead-looking disabled entries.
 */

interface NavItem {
  readonly label: string;
  readonly href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  // Root-relative anchors so the section links also work from other
  // pages (legal placeholders) that render this nav.
  { label: "Produkt", href: "/#produkt" },
  { label: "Plattform", href: "/#plattform" },
  { label: "Kontakt", href: "/kontakt" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          onClick={onNavigate}
          className="nav-link"
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

function LanguageChip(): JSX.Element {
  return (
    <span className="glass-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs text-agx-dim">
      <Icon name="globe" className="h-3.5 w-3.5" />
      Deutsch
      <Icon name="chevronDown" className="h-3 w-3 text-agx-faint" />
    </span>
  );
}

export function SiteNav(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
      <header className="sticky top-0 z-40 border-b border-agx-line bg-[rgba(7,15,34,0.72)] backdrop-blur-xl">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5 md:px-8"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <AgxoraLogo />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <NavLinks />
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageChip />
          <Link href="/login" className="nav-link px-2">
            Anmelden
          </Link>
          <Link href="/login" className="btn-gold px-4 py-2 text-sm">
            Kostenlos starten
            <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          className="btn-ghost h-10 w-10 p-0 lg:hidden"
        >
          <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
        </button>
      </nav>

      {open && (
        <div className="border-t border-agx-line bg-[rgba(4,10,24,0.94)] px-5 pb-6 pt-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-4">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <LanguageChip />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn-ghost px-4 py-2.5 text-sm"
            >
              Anmelden
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn-gold px-4 py-2.5 text-sm"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
