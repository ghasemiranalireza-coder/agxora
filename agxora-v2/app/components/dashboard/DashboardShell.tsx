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
            className={`${itemClass} border border-agx-cyan/30 bg-gradient-to-r from-[rgba(58,130,246,0.3)] to-[rgba(30,84,170,0.16)] font-medium text-agx-ink shadow-[0_0_18px_rgba(60,140,255,0.16)]`}
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5ea2ff] to-[#2158b8] text-[12px] font-bold text-white">
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

interface SidebarContentProps {
  readonly withLogo?: boolean;
}

function SidebarContent({ withLogo = false }: SidebarContentProps): JSX.Element {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      {withLogo && (
        <div className="px-1.5">
          <Link href="/">
            <AgxoraLogo />
          </Link>
        </div>
      )}
      <SidebarNav />
      <SidebarFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Topbar — full-width app bar with the logo cell above the sidebar   */
/* ------------------------------------------------------------------ */

interface TopbarProps {
  readonly onMenu: () => void;
  readonly searchRef: React.RefObject<HTMLInputElement | null>;
}

function Topbar({ onMenu, searchRef }: TopbarProps): JSX.Element {
  const iconChip =
    "hidden h-9 w-9 items-center justify-center rounded-xl border border-agx-line bg-[rgba(12,24,48,0.5)] text-agx-dim md:flex";

  return (
    <header className="sticky top-0 z-30 border-b border-agx-line bg-[rgba(7,15,34,0.8)] backdrop-blur-xl">
      <div className="flex items-stretch">
        {/* Logo cell — sits exactly above the sidebar, like the reference */}
        <div className="hidden w-[248px] shrink-0 items-center border-r border-agx-line px-6 lg:flex">
          <Link href="/">
            <AgxoraLogo />
          </Link>
        </div>

        <div className="flex h-16 min-w-0 flex-1 items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Navigation öffnen"
            className="btn-ghost h-10 w-10 shrink-0 p-0 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-agx-line bg-[rgba(8,17,36,0.6)] px-4 py-2 md:max-w-md">
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
              <Icon name="chevronDown" className="h-3 w-3 text-agx-faint" />
            </span>

            <span className="flex items-center gap-2.5 rounded-xl border border-agx-line bg-[rgba(12,24,48,0.5)] px-2.5 py-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5ea2ff] to-[#2158b8] text-[11px] font-bold text-white">
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
              <Icon
                name="chevronDown"
                className="hidden h-3 w-3 text-agx-faint xl:block"
              />
            </span>
          </div>
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
    <section className="glass-panel relative overflow-hidden px-5 py-6 md:px-8 md:py-7">
      {/* Cinematic Earth inside the panel, upper right — like the reference */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-40 hidden h-[520px] w-[520px] opacity-95 sm:block"
      >
        <AgxoraGlobe3D />
      </div>

      <div className="relative">
        <p className="text-[13.5px] text-agx-dim">
          👋 Willkommen zurück, Alireza
        </p>
        <h1 className="mt-2 text-[1.65rem] font-bold tracking-tight text-agx-ink md:text-[2.05rem]">
          Bereit für den nächsten Schritt?
        </h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-agx-dim">
          Sagen Sie AGXORA, was Sie erreichen möchten – der KI Agent übernimmt
          den Rest.
        </p>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="mt-6 flex items-center gap-3 rounded-full border border-agx-line-strong bg-[rgba(6,14,30,0.72)] py-2 pl-5 pr-2 backdrop-blur-md transition-colors focus-within:border-agx-cyan/50"
        >
          <Icon name="search" className="h-4.5 w-4.5 shrink-0 text-agx-faint" />
          <input
            ref={inputRef}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Was möchten Sie heute tun?"
            aria-label="Auftrag an AGXORA"
            className="w-full min-w-0 bg-transparent text-[15px] text-agx-ink outline-none placeholder:text-agx-faint"
          />
          <button
            type="submit"
            aria-label="Auftrag senden"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-agx-cyan/50 bg-gradient-to-br from-[#8fd9ff] to-[#2d8fd9] text-[#03182c] shadow-[0_0_22px_rgba(76,195,255,0.4)] transition-transform hover:-translate-y-px"
          >
            <Icon name="arrowRight" className="h-4.5 w-4.5" strokeWidth={2.4} />
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
              className="cursor-pointer rounded-full border border-agx-line bg-[rgba(10,21,44,0.66)] px-3.5 py-1.5 text-xs text-agx-dim backdrop-blur-md transition-colors hover:border-agx-line-strong hover:text-agx-ink"
            >
              {chip}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11.5px] text-agx-faint">
          Demo – der KI Agent ist in dieser Umgebung noch nicht verbunden.
        </p>
      </div>
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
    <aside className="glass-panel relative flex flex-col overflow-hidden px-5 py-6 md:px-6">
      {/* Soft planetary glow bleeding in from the command center side */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(64, 140, 235, 0.35) 0%, rgba(30, 80, 170, 0.16) 45%, transparent 70%)",
        }}
      />

      <div className="relative flex h-full flex-col">
        <h2 className="text-[19px] font-bold tracking-tight text-agx-ink">
          AGXORA AI
        </h2>
        <p className="mt-1 max-w-[170px] text-[12.5px] leading-snug text-agx-dim">
          Ihr intelligenter Business Partner
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {AI_CAPABILITIES.map((capability) => (
            <li
              key={capability}
              className="flex items-center gap-2.5 text-[13px] text-agx-dim"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
              </span>
              {capability}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onTalk}
            className="btn-gold w-full px-4 py-2.5 text-[13.5px]"
          >
            Mit dem KI Agenten sprechen
            <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>
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
        className={`absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-agx-line bg-[rgba(9,19,40,0.97)] backdrop-blur-2xl transition-transform duration-250 ${open ? "translate-x-0" : "-translate-x-full"}`}
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

      <div className="relative z-[1] flex min-h-screen flex-col">
        {/* Full-width app bar with the logo above the sidebar column */}
        <Topbar onMenu={() => setDrawerOpen(true)} searchRef={searchRef} />

        <div className="flex flex-1 items-stretch">
          {/* Desktop sidebar — starts below the topbar, like the reference */}
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[248px] shrink-0 border-r border-agx-line bg-[rgba(8,17,38,0.6)] backdrop-blur-xl lg:block">
            <SidebarContent />
          </aside>

          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <SidebarContent withLogo />
          </MobileDrawer>

          <main className="relative mx-auto w-full min-w-0 max-w-[1200px] px-4 pb-12 pt-6 md:px-6">
            <div className="relative flex flex-col gap-5">
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
