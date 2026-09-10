"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import AgxoraGlobe3D from "../AgxoraGlobe3D";
import StarfieldBackground from "../StarfieldBackground";
import { AgxoraLogo } from "../site/AgxoraLogo";
import { Icon, type IconName } from "../ui/icons";
import { AutomationSection, KpiRow, LowerPanels } from "./panels";

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

interface SidebarItem {
  readonly icon: IconName;
  readonly label: string;
  /** Only real routes become links; the rest stay inactive until built. */
  readonly href?: string;
}

const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { icon: "home", label: "Dashboard", href: "/dashboard" },
  { icon: "bot", label: "KI Agent" },
  { icon: "users", label: "Kunden" },
  { icon: "megaphone", label: "Kampagnen" },
  { icon: "calendar", label: "Content Kalender" },
  { icon: "chart", label: "Analysen" },
  { icon: "zap", label: "Automatisierungen" },
  { icon: "plug", label: "Integrationen" },
  { icon: "store", label: "Marketplace" },
];

function SidebarNav(): JSX.Element {
  const itemClass =
    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px]";

  return (
    <nav aria-label="Dashboard-Navigation" className="flex flex-col gap-1">
      {SIDEBAR_ITEMS.map((item) =>
        item.href !== undefined ? (
          <Link
            key={item.label}
            href={item.href}
            aria-current="page"
            className={`${itemClass} border border-agx-cyan/25 bg-agx-cyan/10 font-medium text-agx-ink`}
          >
            <Icon name={item.icon} className="h-4 w-4 text-agx-cyan-soft" />
            {item.label}
          </Link>
        ) : (
          <span
            key={item.label}
            className={`${itemClass} cursor-default text-agx-dim`}
          >
            <Icon name={item.icon} className="h-4 w-4 text-agx-faint" />
            {item.label}
          </span>
        ),
      )}

      <div className="my-3 border-t border-agx-line" />

      <span className={`${itemClass} cursor-default text-agx-dim`}>
        <Icon name="settings" className="h-4 w-4 text-agx-faint" />
        Einstellungen
      </span>
    </nav>
  );
}

function SidebarFooter(): JSX.Element {
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-agx-line pt-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd57a] to-[#d98f1f] text-[12px] font-bold text-[#221302]">
        AG
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-agx-ink">
          AGXORA Workspace
        </span>
        <span className="block text-[11.5px] text-agx-faint">
          Demo-Arbeitsbereich
        </span>
      </span>
    </div>
  );
}

function SidebarContent(): JSX.Element {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="px-1.5">
        <Link href="/">
          <AgxoraLogo />
        </Link>
      </div>
      <SidebarNav />
      <SidebarFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Topbar                                                             */
/* ------------------------------------------------------------------ */

interface TopbarProps {
  readonly onMenu: () => void;
  readonly searchRef: React.RefObject<HTMLInputElement | null>;
}

function Topbar({ onMenu, searchRef }: TopbarProps): JSX.Element {
  const iconChip =
    "hidden h-9 w-9 items-center justify-center rounded-xl border border-agx-line bg-[rgba(12,24,48,0.5)] text-agx-dim md:flex";

  return (
    <header className="sticky top-0 z-30 border-b border-agx-line bg-[rgba(4,10,24,0.78)] backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Navigation öffnen"
          className="btn-ghost h-10 w-10 shrink-0 p-0 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-agx-line bg-[rgba(8,17,36,0.6)] px-3.5 py-2 md:max-w-md">
          <Icon name="search" className="h-4 w-4 shrink-0 text-agx-faint" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Suchen… (Strg + K)"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-agx-ink outline-none placeholder:text-agx-faint"
          />
        </label>

        <div className="ml-auto flex items-center gap-2.5">
          <span className={iconChip} aria-hidden="true">
            <Icon name="grid" className="h-4 w-4" />
          </span>
          <span className={iconChip} aria-hidden="true">
            <Icon name="bell" className="h-4 w-4" />
          </span>
          <span className={iconChip} aria-hidden="true">
            <Icon name="moon" className="h-4 w-4" />
          </span>

          <span className="glass-chip hidden items-center gap-2 px-3 py-1.5 text-xs text-agx-dim sm:inline-flex">
            <Icon name="globe" className="h-3.5 w-3.5" />
            Deutsch
          </span>

          <span className="flex items-center gap-2.5 rounded-xl border border-agx-line bg-[rgba(12,24,48,0.5)] px-2.5 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#ffd57a] to-[#d98f1f] text-[11px] font-bold text-[#221302]">
              AG
            </span>
            <span className="hidden xl:block">
              <span className="block text-[12.5px] font-semibold leading-tight text-agx-ink">
                Alireza Ghasemi
              </span>
              <span className="block text-[10.5px] leading-tight text-agx-faint">
                Demo-Workspace
              </span>
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Command center + AI panel                                          */
/* ------------------------------------------------------------------ */

const COMMAND_CHIPS: readonly string[] = [
  "Kampagne erstellen",
  "Kunden analysieren",
  "Bericht generieren",
  "Automatisierung einrichten",
];

interface CommandCenterProps {
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
}

function CommandCenter({ inputRef }: CommandCenterProps): JSX.Element {
  const [command, setCommand] = useState("");

  return (
    <section className="glass-panel px-5 py-6 md:px-7">
      <p className="text-[13.5px] text-agx-dim">👋 Willkommen zurück</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-agx-ink md:text-[1.85rem]">
        Bereit für den nächsten Schritt?
      </h1>
      <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-agx-dim">
        Sagen Sie AGXORA, was Sie erreichen möchten – der KI Agent übernimmt
        den Rest.
      </p>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mt-5 flex items-center gap-2.5 rounded-2xl border border-agx-line-strong bg-[rgba(5,12,26,0.66)] py-2 pl-4 pr-2 transition-colors focus-within:border-agx-cyan/50"
      >
        <Icon name="sparkles" className="h-4.5 w-4.5 shrink-0 text-agx-gold-soft" />
        <input
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Was möchten Sie heute tun?"
          aria-label="Auftrag an AGXORA"
          className="w-full min-w-0 bg-transparent text-[14.5px] text-agx-ink outline-none placeholder:text-agx-faint"
        />
        <button
          type="submit"
          aria-label="Auftrag senden"
          className="btn-gold h-9 w-9 shrink-0 !rounded-xl !p-0"
        >
          <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {COMMAND_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setCommand(chip);
              inputRef.current?.focus();
            }}
            className="cursor-pointer rounded-full border border-agx-line bg-[rgba(12,24,48,0.5)] px-3.5 py-1.5 text-xs text-agx-dim transition-colors hover:border-agx-line-strong hover:text-agx-ink"
          >
            {chip}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[11.5px] text-agx-faint">
        Demo – der KI Agent ist in dieser Umgebung noch nicht verbunden.
      </p>
    </section>
  );
}

const AI_CAPABILITIES: readonly string[] = [
  "Versteht Ihre Ziele",
  "Plant die nächsten Schritte",
  "Setzt Aufgaben um",
  "Liefert messbare Ergebnisse",
];

interface AiPanelProps {
  readonly onTalk: () => void;
}

function AiPanel({ onTalk }: AiPanelProps): JSX.Element {
  return (
    <aside className="glass-panel flex flex-col px-5 py-6 md:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-agx-gold/35 bg-agx-gold/12 text-agx-gold-soft">
          <Icon name="bot" className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-agx-ink">
            AGXORA AI
          </span>
          <span className="block text-xs text-agx-faint">
            Ihr intelligenter Business Partner
          </span>
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {AI_CAPABILITIES.map((capability) => (
          <li
            key={capability}
            className="flex items-center gap-2.5 text-[13px] text-agx-dim"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-agx-cyan/15 text-agx-cyan-soft">
              <Icon name="check" className="h-3 w-3" strokeWidth={2.4} />
            </span>
            {capability}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onTalk}
        className="btn-gold mt-6 w-full px-4 py-2.5 text-[13.5px]"
      >
        Mit dem KI Agenten sprechen
      </button>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-agx-line bg-[rgba(6,13,29,0.97)] backdrop-blur-2xl transition-transform duration-250 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Navigation schließen"
          className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-agx-dim"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DashboardShell(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const commandRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const focusCommand = useCallback(() => {
    commandRef.current?.focus();
    commandRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Real Strg/Cmd+K shortcut for the topbar search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen">
      <StarfieldBackground />

      <div className="relative z-[1] flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-agx-line bg-[rgba(5,12,26,0.72)] backdrop-blur-xl lg:block">
          <SidebarContent />
        </aside>

        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <SidebarContent />
        </MobileDrawer>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setDrawerOpen(true)} searchRef={searchRef} />

          <main className="relative mx-auto w-full max-w-[1200px] px-4 pb-12 pt-6 md:px-6">
            {/* Cinematic globe backdrop, top-right behind the panels */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-14 z-0 hidden h-[460px] w-[460px] opacity-90 lg:block"
            >
              <AgxoraGlobe3D />
            </div>

            <div className="relative z-[1] flex flex-col gap-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
                <CommandCenter inputRef={commandRef} />
                <AiPanel onTalk={focusCommand} />
              </div>

              <KpiRow />
              <LowerPanels />
              <AutomationSection onAutomate={focusCommand} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
