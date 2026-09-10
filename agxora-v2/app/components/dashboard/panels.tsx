import Link from "next/link";
import type { JSX } from "react";
import { Icon, type IconName } from "../ui/icons";

/* ------------------------------------------------------------------ */
/*  KPI row — no fabricated metrics, honest empty states               */
/* ------------------------------------------------------------------ */

interface KpiItem {
  readonly icon: IconName;
  readonly title: string;
  readonly empty: string;
  readonly hint: string;
}

const KPI_ITEMS: readonly KpiItem[] = [
  {
    icon: "euro",
    title: "Gesamtumsatz",
    empty: "Noch keine Umsatzdaten",
    hint: "Verbinden Sie Ihre Finanzquellen",
  },
  {
    icon: "users",
    title: "Aktive Kunden",
    empty: "Noch keine Kunden erfasst",
    hint: "Legen Sie Ihren ersten Kunden an",
  },
  {
    icon: "megaphone",
    title: "Laufende Kampagnen",
    empty: "Keine laufenden Kampagnen",
    hint: "Starten Sie Ihre erste Kampagne",
  },
  {
    icon: "clock",
    title: "Zeitersparnis",
    empty: "Noch keine Daten",
    hint: "Richten Sie Automatisierungen ein",
  },
];

function KpiBaseline(): JSX.Element {
  return (
    <svg
      viewBox="0 0 120 24"
      className="mt-3 h-6 w-full text-agx-faint/60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 18 H120"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="3 5"
        fill="none"
      />
    </svg>
  );
}

export function KpiRow(): JSX.Element {
  return (
    <section aria-label="Kennzahlen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_ITEMS.map((item) => (
        <article key={item.title} className="glass-panel px-5 py-4.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[12.5px] font-medium text-agx-dim">
              {item.title}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-agx-cyan/20 bg-agx-cyan/10 text-agx-cyan-soft">
              <Icon name={item.icon} className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-[26px] font-semibold leading-none text-agx-ink/70">
            –
          </p>
          <p className="mt-2.5 text-[12px] text-agx-dim">{item.empty}</p>
          <p className="mt-0.5 text-[11px] text-agx-faint">{item.hint}</p>
          <KpiBaseline />
        </article>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Lower grid — activities / integrations / next steps                */
/* ------------------------------------------------------------------ */

interface IntegrationItem {
  readonly label: string;
  readonly mark: string;
  readonly tileClass: string;
}

const INTEGRATIONS: readonly IntegrationItem[] = [
  { label: "Gmail", mark: "G", tileClass: "bg-red-400/15 text-red-300" },
  { label: "YouTube", mark: "Y", tileClass: "bg-rose-400/15 text-rose-300" },
  { label: "LinkedIn", mark: "in", tileClass: "bg-sky-400/15 text-sky-300" },
  { label: "Amazon", mark: "a", tileClass: "bg-amber-400/15 text-amber-300" },
];

const NEXT_STEPS: readonly string[] = [
  "Kampagne für neue Kunden erstellen",
  "Integrationen verbinden",
  "Automatisierung einrichten",
  "Zielgruppe analysieren",
];

function PanelHeader({
  title,
  sub,
}: {
  readonly title: string;
  readonly sub?: string;
}): JSX.Element {
  return (
    <header className="mb-4">
      <h2 className="text-[14.5px] font-semibold text-agx-ink">{title}</h2>
      {sub !== undefined && (
        <p className="mt-0.5 text-[11.5px] text-agx-faint">{sub}</p>
      )}
    </header>
  );
}

export function LowerPanels(): JSX.Element {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {/* Letzte Aktivitäten — honest empty state */}
      <article className="glass-panel flex flex-col px-5 py-5">
        <PanelHeader title="Letzte Aktivitäten" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-agx-line bg-[rgba(12,24,48,0.5)] text-agx-faint">
            <Icon name="activity" className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-medium text-agx-dim">
            Noch keine Aktivitäten
          </p>
          <p className="max-w-[220px] text-[11.5px] leading-relaxed text-agx-faint">
            Ihre Aktionen erscheinen hier, sobald Sie loslegen.
          </p>
        </div>
      </article>

      {/* Integrationen — real state: nothing is connected yet */}
      <article className="glass-panel px-5 py-5">
        <PanelHeader
          title="Integrationen"
          sub="Verbinden Sie Ihre Tools mit AGXORA."
        />
        <ul className="flex flex-col gap-2.5">
          {INTEGRATIONS.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-agx-line bg-[rgba(8,17,36,0.45)] px-3.5 py-2.5"
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold ${item.tileClass}`}
                >
                  {item.mark}
                </span>
                <span className="text-[13px] font-medium text-agx-ink">
                  {item.label}
                </span>
              </span>
              <span className="rounded-full border border-agx-line px-2.5 py-1 text-[10.5px] text-agx-faint">
                Nicht verbunden
              </span>
            </li>
          ))}
        </ul>
      </article>

      {/* Nächste Schritte — suggestions, nothing pretends to be done */}
      <article className="glass-panel px-5 py-5">
        <PanelHeader title="Ihre nächsten Schritte" />
        <ul className="flex flex-col gap-1.5">
          {NEXT_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-[13px] text-agx-dim"
            >
              <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-agx-cyan/45" />
              {step}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Automation section — AI core visual + growth panel                 */
/* ------------------------------------------------------------------ */

/** Reference-style AI robot — glossy helmet, cyan visor eyes, gold swirl.
    Pure inline SVG/CSS, no image assets. */
function AiRobot(): JSX.Element {
  return (
    <div aria-hidden="true" className="relative h-44 w-44 shrink-0">
      {/* Warm ambient glow */}
      <div
        className="absolute -inset-6 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 58%, rgba(242, 178, 62, 0.3) 0%, rgba(242, 178, 62, 0.08) 48%, transparent 72%)",
        }}
      />
      {/* Gold spark particles */}
      <span className="absolute left-[6%] top-[30%] h-1.5 w-1.5 rounded-full bg-agx-gold-soft shadow-[0_0_8px_rgba(255,213,122,0.9)]" />
      <span className="absolute right-[4%] top-[52%] h-2 w-2 rounded-full bg-agx-gold shadow-[0_0_10px_rgba(242,178,62,0.9)]" />
      <span className="absolute bottom-[14%] left-[16%] h-1 w-1 rounded-full bg-agx-gold-soft shadow-[0_0_6px_rgba(255,213,122,0.9)]" />

      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <radialGradient id="agxHelmet" cx="36%" cy="26%" r="85%">
            <stop offset="0%" stopColor="#f5f9ff" />
            <stop offset="42%" stopColor="#c7d4e7" />
            <stop offset="74%" stopColor="#8b9db8" />
            <stop offset="100%" stopColor="#54657f" />
          </radialGradient>
          <linearGradient id="agxVisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#182742" />
            <stop offset="100%" stopColor="#050b18" />
          </linearGradient>
          <linearGradient id="agxGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe3a3" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffd57a" />
            <stop offset="70%" stopColor="#e8a52e" />
            <stop offset="100%" stopColor="#e8a52e" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="agxEye" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e6f8ff" />
            <stop offset="45%" stopColor="#4cc3ff" />
            <stop offset="100%" stopColor="#4cc3ff" stopOpacity="0" />
          </radialGradient>
          <filter id="agxSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="agxGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Gold orbit — upper arc behind the head */}
        <g transform="rotate(-14 120 128)">
          <path
            d="M 18 132 A 102 42 0 0 1 222 132"
            fill="none"
            stroke="url(#agxGold)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#agxGlow)"
            opacity="0.75"
          />
          <path
            d="M 18 132 A 102 42 0 0 1 222 132"
            fill="none"
            stroke="url(#agxGold)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>

        {/* Ear pods */}
        <rect x="30" y="102" width="15" height="44" rx="7" fill="#3c4c66" />
        <rect x="195" y="102" width="15" height="44" rx="7" fill="#2e3c52" />

        {/* Helmet */}
        <ellipse
          cx="120"
          cy="122"
          rx="80"
          ry="76"
          fill="url(#agxHelmet)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
        />
        {/* Helmet top highlight */}
        <ellipse
          cx="96"
          cy="72"
          rx="42"
          ry="20"
          fill="#ffffff"
          opacity="0.3"
          filter="url(#agxSoft)"
        />

        {/* Visor */}
        <rect
          x="60"
          y="88"
          width="120"
          height="86"
          rx="42"
          fill="url(#agxVisor)"
          stroke="rgba(76,195,255,0.28)"
          strokeWidth="1.2"
        />
        {/* Visor inner reflection */}
        <path
          d="M 74 104 Q 120 92 166 104"
          fill="none"
          stroke="rgba(140,190,255,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Eyes */}
        <ellipse cx="97" cy="132" rx="17" ry="11" fill="url(#agxEye)" filter="url(#agxGlow)" />
        <ellipse cx="143" cy="132" rx="17" ry="11" fill="url(#agxEye)" filter="url(#agxGlow)" />
        <ellipse cx="97" cy="132" rx="10" ry="6" fill="#dff6ff" />
        <ellipse cx="143" cy="132" rx="10" ry="6" fill="#dff6ff" />

        {/* Chin light */}
        <circle cx="120" cy="188" r="5" fill="#f2b23e" filter="url(#agxSoft)" />

        {/* Gold orbit — lower arc in front of the head */}
        <g transform="rotate(-14 120 128)">
          <path
            d="M 222 132 A 102 42 0 0 1 18 132"
            fill="none"
            stroke="url(#agxGold)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#agxGlow)"
            opacity="0.85"
          />
          <path
            d="M 222 132 A 102 42 0 0 1 18 132"
            fill="none"
            stroke="url(#agxGold)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

/** Decorative growth bars — no axes, no numbers, no fabricated data. */
function GrowthIllustration(): JSX.Element {
  const bars = [26, 38, 32, 48, 44, 60, 56, 74, 70, 88];
  return (
    <svg
      viewBox="0 0 200 100"
      className="mt-5 h-28 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="agx-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(242,178,62,0.15)" />
          <stop offset="100%" stopColor="rgba(255,213,122,0.85)" />
        </linearGradient>
      </defs>
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 20 + 4}
          y={100 - height}
          width={12}
          height={height}
          rx={3}
          fill="url(#agx-bar)"
        />
      ))}
    </svg>
  );
}

interface AutomationSectionProps {
  readonly onAutomate: () => void;
}

export function AutomationSection({
  onAutomate,
}: AutomationSectionProps): JSX.Element {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
      <article className="glass-panel flex flex-col items-center gap-6 px-6 py-7 sm:flex-row sm:gap-8 md:px-8">
        <AiRobot />
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-agx-ink md:text-xl">
            Automatisieren Sie Ihr Business
            <br className="hidden md:block" /> mit AGXORA AI
          </h2>
          <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-agx-dim">
            Lassen Sie die KI Ihre wiederkehrenden Aufgaben übernehmen, während
            Sie sich auf das Wesentliche konzentrieren.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={onAutomate}
              className="btn-gold px-5 py-2.5 text-[13.5px]"
            >
              Jetzt automatisieren
            </button>
            <Link href="/" className="btn-ghost px-4 py-2.5 text-[13.5px]">
              <Icon name="play" className="h-3.5 w-3.5" />
              Mehr erfahren
            </Link>
          </div>
        </div>
      </article>

      <article className="glass-panel px-6 py-7">
        <h2 className="text-lg font-semibold tracking-tight text-agx-ink">
          Wachstum beginnt mit einer Idee.
        </h2>
        <p className="mt-1.5 text-[13.5px] text-agx-dim">
          AGXORA macht den Rest.
        </p>
        <GrowthIllustration />
      </article>
    </section>
  );
}
