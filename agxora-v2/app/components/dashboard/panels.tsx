import Link from "next/link";
import type { JSX } from "react";
import { Icon, type IconName } from "../ui/icons";

/* ------------------------------------------------------------------ */
/*  KPI row — no fabricated metrics, honest empty states               */
/* ------------------------------------------------------------------ */

interface KpiItem {
  readonly icon: IconName;
  readonly title: string;
  readonly hint: string;
  readonly tileClass: string;
}

const KPI_ITEMS: readonly KpiItem[] = [
  {
    icon: "euro",
    title: "Gesamtumsatz",
    hint: "Verbinden Sie Ihre Finanzquellen",
    tileClass:
      "border-agx-gold/35 bg-agx-gold/12 text-agx-gold-soft shadow-[0_0_16px_rgba(242,178,62,0.14)]",
  },
  {
    icon: "users",
    title: "Aktive Kunden",
    hint: "Legen Sie Ihren ersten Kunden an",
    tileClass:
      "border-agx-cyan/25 bg-agx-cyan/10 text-agx-cyan-soft shadow-[0_0_16px_rgba(76,195,255,0.12)]",
  },
  {
    icon: "megaphone",
    title: "Laufende Kampagnen",
    hint: "Starten Sie Ihre erste Kampagne",
    tileClass:
      "border-agx-blue/30 bg-agx-blue/12 text-[#9dc2ff] shadow-[0_0_16px_rgba(59,130,246,0.14)]",
  },
  {
    icon: "clock",
    title: "Zeitersparnis",
    hint: "Richten Sie Automatisierungen ein",
    tileClass:
      "border-agx-gold/35 bg-agx-gold/12 text-agx-gold-soft shadow-[0_0_16px_rgba(242,178,62,0.14)]",
  },
];

export function KpiRow(): JSX.Element {
  return (
    <section aria-label="Kennzahlen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_ITEMS.map((item) => (
        <article key={item.title} className="glass-panel px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-body-sm font-medium text-agx-dim">
              {item.title}
            </span>
            <span className={`icon-tile h-10 w-10 border ${item.tileClass}`}>
              <Icon name={item.icon} className="h-4.5 w-4.5" />
            </span>
          </div>
          {/* Deliberate empty state — data is unavailable, nothing failed. */}
          <p className="mt-2 flex items-center gap-3">
            <span className="text-kpi font-bold text-agx-dim">—</span>
            <span className="badge badge-neutral uppercase tracking-[0.1em]">
              Noch keine Daten
            </span>
          </p>
          <p className="mt-3.5 text-caption leading-snug text-agx-dim">
            {item.hint}
          </p>
        </article>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Lower grid — activities / integrations / next steps                */
/* ------------------------------------------------------------------ */

/* Simplified monochrome brand glyphs — visual identification only, no
   claim about connection state (every row says "Nicht verbunden"). */
function GmailMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m2.5 7.5 8 6a2.4 2.4 0 0 0 3 0l8-6" />
    </svg>
  );
}

function YouTubeMark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29.3 29.3 0 0 0 2 12a29.3 29.3 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29.3 29.3 0 0 0 22 12a29.3 29.3 0 0 0-.4-4.8z"
        opacity="0.4"
      />
      <path d="M10 15.2V8.8L15.6 12z" />
    </svg>
  );
}

function LinkedInMark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M6.94 8.9H4.1V20h2.84zM5.52 3.8a1.66 1.66 0 1 0 0 3.32 1.66 1.66 0 0 0 0-3.32z" />
      <path d="M13 8.9h-2.72V20h2.83v-5.85c0-1.55.78-2.5 2.12-2.5 1.32 0 1.98.93 1.98 2.5V20H20v-6.66c0-2.94-1.57-4.34-3.76-4.34A3.6 3.6 0 0 0 13 10.66z" />
    </svg>
  );
}

function AmazonMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {/* Simplified lowercase a */}
      <circle cx="11" cy="9.5" r="3.4" />
      <path d="M14.4 6.4v6.5" />
      {/* Signature smile arrow */}
      <path d="M4.5 15.6c4.3 3.2 10.8 3.2 14.6.3" />
      <path d="m19.6 13.7.4 2.5-2.5-.5" />
    </svg>
  );
}

interface IntegrationItem {
  readonly label: string;
  readonly mark: JSX.Element;
  readonly tileClass: string;
}

const INTEGRATIONS: readonly IntegrationItem[] = [
  { label: "Gmail", mark: <GmailMark />, tileClass: "bg-red-400/15 text-red-300" },
  { label: "YouTube", mark: <YouTubeMark />, tileClass: "bg-rose-400/15 text-rose-300" },
  { label: "LinkedIn", mark: <LinkedInMark />, tileClass: "bg-sky-400/15 text-sky-300" },
  { label: "Amazon", mark: <AmazonMark />, tileClass: "bg-amber-400/15 text-amber-300" },
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
      <h2 className="text-body font-semibold text-agx-ink">{title}</h2>
      {sub !== undefined && (
        <p className="mt-0.5 text-caption text-agx-dim">{sub}</p>
      )}
    </header>
  );
}

export function LowerPanels(): JSX.Element {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1.1fr)_minmax(0,0.88fr)]">
      {/* Letzte Aktivitäten — honest empty state */}
      <article className="glass-panel flex flex-col px-5 py-5">
        <PanelHeader title="Letzte Aktivitäten" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-agx-line bg-[rgba(12,24,48,0.5)] text-agx-faint">
            <Icon name="activity" className="h-5 w-5" />
          </span>
          <p className="text-body-sm font-medium text-agx-dim">
            Noch keine Aktivitäten
          </p>
          <p className="max-w-[220px] text-caption leading-relaxed text-agx-dim">
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
                  className={`icon-tile h-8 w-8 rounded-agx-sm ${item.tileClass}`}
                >
                  {item.mark}
                </span>
                <span className="text-body-sm font-medium text-agx-ink">
                  {item.label}
                </span>
              </span>
              <span className="badge badge-neutral">Nicht verbunden</span>
            </li>
          ))}
        </ul>
      </article>

      {/* Nächste Schritte — a numbered sequence, deliberately
          non-interactive (no radio/checkbox affordance). */}
      <article className="glass-panel px-5 py-5">
        <PanelHeader title="Ihre nächsten Schritte" />
        <ol className="flex flex-col gap-1.5">
          {NEXT_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-body-sm text-agx-dim"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-agx-line bg-[rgba(12,24,48,0.55)] text-[11px] font-semibold text-agx-cyan-soft"
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Automation section — AI core visual + growth panel                 */
/* ------------------------------------------------------------------ */

/** Reference-style AI robot — glossy white segmented shell, dark visor
    with camera-lens eyes, side ear pod, dark space vignette, warm gold
    light swirls with glowing particles. Pure inline SVG/CSS, no assets. */
function AiRobot(): JSX.Element {
  return (
    <div aria-hidden="true" className="relative h-52 w-52 shrink-0 sm:h-60 sm:w-60">
      {/* Dark circular space vignette behind the head, like the reference */}
      <div
        className="absolute -inset-4 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(4, 10, 24, 0.85) 0%, rgba(6, 14, 30, 0.55) 52%, transparent 74%)",
        }}
      />
      {/* Warm gold back-light behind the upper-right of the head */}
      <div
        className="absolute -inset-5 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 66% 34%, rgba(255, 209, 128, 0.46) 0%, rgba(242, 178, 62, 0.16) 42%, transparent 68%)," +
            "radial-gradient(circle at 30% 76%, rgba(60, 120, 220, 0.2) 0%, transparent 55%)",
        }}
      />

      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <radialGradient id="agxShell" cx="34%" cy="22%" r="90%">
            <stop offset="0%" stopColor="#f3f7fd" />
            <stop offset="30%" stopColor="#e6edf7" />
            <stop offset="56%" stopColor="#bcc9da" />
            <stop offset="78%" stopColor="#8798b0" />
            <stop offset="100%" stopColor="#566884" />
          </radialGradient>
          <radialGradient id="agxVisor" cx="42%" cy="30%" r="92%">
            <stop offset="0%" stopColor="#1a2a48" />
            <stop offset="45%" stopColor="#0c1830" />
            <stop offset="100%" stopColor="#040a18" />
          </radialGradient>
          <radialGradient id="agxLens" cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#3d6799" />
            <stop offset="45%" stopColor="#1c3356" />
            <stop offset="100%" stopColor="#081527" />
          </radialGradient>
          <linearGradient id="agxGoldWire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffd57a" stopOpacity="0" />
            <stop offset="35%" stopColor="#ffd57a" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#e8a52e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e8a52e" stopOpacity="0" />
          </linearGradient>
          <filter id="agxSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id="agxGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
        </defs>

        {/* Gold light swirls behind the head — prominent, like the reference */}
        <g opacity="0.9">
          <ellipse cx="120" cy="126" rx="112" ry="52" fill="none" stroke="url(#agxGoldWire)" strokeWidth="2.2" transform="rotate(-16 120 126)" />
          <ellipse cx="120" cy="128" rx="104" ry="66" fill="none" stroke="url(#agxGoldWire)" strokeWidth="1.4" opacity="0.7" transform="rotate(9 120 128)" />
          <ellipse cx="120" cy="124" rx="116" ry="42" fill="none" stroke="url(#agxGoldWire)" strokeWidth="1.1" opacity="0.55" transform="rotate(-32 120 124)" />
          <path d="M 186 24 Q 238 78 218 152" fill="none" stroke="url(#agxGoldWire)" strokeWidth="2.6" opacity="0.75" filter="url(#agxSoft)" />
          <path d="M 30 42 Q 4 96 22 158" fill="none" stroke="url(#agxGoldWire)" strokeWidth="1.6" opacity="0.5" filter="url(#agxSoft)" />
        </g>
        {/* Glowing gold particles scattered around the swirls */}
        <circle cx="26" cy="150" r="3.6" fill="#ffd57a" filter="url(#agxSoft)" />
        <circle cx="214" cy="96" r="3" fill="#ffcb62" filter="url(#agxSoft)" />
        <circle cx="196" cy="182" r="2.4" fill="#ffd57a" filter="url(#agxSoft)" opacity="0.85" />
        <circle cx="52" cy="62" r="2.2" fill="#ffe3a3" filter="url(#agxSoft)" opacity="0.8" />
        <circle cx="226" cy="140" r="2" fill="#ffdf98" filter="url(#agxSoft)" opacity="0.9" />
        <circle cx="180" cy="18" r="2.4" fill="#ffd57a" filter="url(#agxSoft)" opacity="0.85" />
        <circle cx="14" cy="104" r="1.8" fill="#ffe3a3" filter="url(#agxSoft)" opacity="0.7" />
        <circle cx="118" cy="228" r="2.2" fill="#ffd57a" filter="url(#agxSoft)" opacity="0.75" />
        <circle cx="70" cy="14" r="1.6" fill="#ffe9b8" filter="url(#agxSoft)" opacity="0.65" />

        <g transform="rotate(-5 120 122)">
          {/* Ear pod — camera-style concentric lens on the left */}
          <ellipse cx="38" cy="128" rx="22" ry="27" fill="#8598b2" />
          <ellipse cx="36" cy="128" rx="17" ry="22" fill="#3b4d68" />
          <ellipse cx="35" cy="128" rx="12" ry="16" fill="#141f33" />
          <ellipse cx="34" cy="128" rx="6.5" ry="9" fill="#2c4466" opacity="0.9" />
          <ellipse cx="31" cy="119" rx="3.4" ry="2.6" fill="#b8cbe2" opacity="0.8" />

          {/* Head shell */}
          <ellipse
            cx="124"
            cy="122"
            rx="80"
            ry="78"
            fill="url(#agxShell)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />

          {/* Panel seams on the shell */}
          <path d="M 74 58 Q 118 40 166 56" fill="none" stroke="rgba(50,68,94,0.35)" strokeWidth="1.4" />
          <path d="M 58 176 Q 96 200 150 196" fill="none" stroke="rgba(50,68,94,0.4)" strokeWidth="1.4" />
          <path d="M 170 190 Q 196 172 202 142" fill="none" stroke="rgba(50,68,94,0.32)" strokeWidth="1.2" />
          <path d="M 96 199 L 100 188" fill="none" stroke="rgba(50,68,94,0.35)" strokeWidth="1.2" />

          {/* Warm gold rim light along the upper-right edge */}
          <path
            d="M 154 50 A 80 78 0 0 1 202 132"
            fill="none"
            stroke="#ffd694"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#agxGlow)"
            opacity="0.85"
          />
          {/* Cool blue bounce along the lower-left edge */}
          <path
            d="M 50 154 A 80 78 0 0 0 96 196"
            fill="none"
            stroke="#5f92d8"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#agxGlow)"
            opacity="0.4"
          />

          {/* Top gloss highlight — kept subtle for a matte, enterprise look */}
          <ellipse cx="98" cy="66" rx="34" ry="13" fill="#ffffff" opacity="0.2" filter="url(#agxSoft)" />

          {/* Visor — large dark glass with a soft top reflection */}
          <rect
            x="66"
            y="76"
            width="122"
            height="100"
            rx="50"
            fill="url(#agxVisor)"
            stroke="rgba(20,32,52,0.9)"
            strokeWidth="2.5"
          />
          <rect
            x="66"
            y="76"
            width="122"
            height="100"
            rx="50"
            fill="none"
            stroke="rgba(150,190,240,0.28)"
            strokeWidth="1"
          />
          <path
            d="M 82 96 Q 127 80 172 96"
            fill="none"
            stroke="rgba(170,205,250,0.3)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#agxSoft)"
          />

          {/* Camera-lens eyes */}
          <g>
            <circle cx="108" cy="128" r="23" fill="#0b1830" />
            <circle cx="108" cy="128" r="23" fill="none" stroke="#3f6293" strokeWidth="2.4" />
            <circle cx="108" cy="128" r="16" fill="url(#agxLens)" />
            <circle cx="108" cy="128" r="8" fill="#091423" />
            <circle cx="102" cy="121" r="3.2" fill="#9fc6ee" opacity="0.85" />
            <circle cx="108" cy="128" r="24.5" fill="none" stroke="#4cc3ff" strokeWidth="1.2" opacity="0.35" filter="url(#agxSoft)" />
          </g>
          <g>
            <circle cx="156" cy="124" r="19" fill="#0b1830" />
            <circle cx="156" cy="124" r="19" fill="none" stroke="#3f6293" strokeWidth="2.2" />
            <circle cx="156" cy="124" r="13" fill="url(#agxLens)" />
            <circle cx="156" cy="124" r="6.5" fill="#091423" />
            <circle cx="151" cy="118" r="2.6" fill="#9fc6ee" opacity="0.85" />
            <circle cx="156" cy="124" r="20.5" fill="none" stroke="#4cc3ff" strokeWidth="1" opacity="0.35" filter="url(#agxSoft)" />
          </g>

        </g>

        {/* Front gold orbit segment crossing the lower left */}
        <path
          d="M 10 168 Q 70 206 150 198"
          fill="none"
          stroke="url(#agxGoldWire)"
          strokeWidth="1.6"
          opacity="0.85"
        />
        <circle cx="86" cy="199" r="2.6" fill="#ffd57a" filter="url(#agxSoft)" />
      </svg>
    </div>
  );
}

/** Abstract growth motif — deliberately ghosted (soft blur, low opacity,
    no axes or grid) so it cannot be mistaken for real analytics. */
function GrowthIllustration(): JSX.Element {
  const bars = [26, 38, 32, 48, 44, 60, 56, 74, 70, 88];
  return (
    <svg
      viewBox="0 0 200 104"
      className="mt-5 h-32 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="agx-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(242,178,62,0.06)" />
          <stop offset="70%" stopColor="rgba(250,196,90,0.32)" />
          <stop offset="100%" stopColor="rgba(255,222,150,0.46)" />
        </linearGradient>
        <filter id="agx-bar-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <g filter="url(#agx-bar-soft)">
        {bars.map((height, index) => (
          <rect
            key={index}
            x={index * 20 + 4}
            y={96 - height * 0.85}
            width={12}
            height={height * 0.85}
            rx={4}
            fill="url(#agx-bar)"
          />
        ))}
      </g>
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
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2.12fr)_minmax(0,0.88fr)]">
      <article className="glass-panel flex flex-col items-center gap-6 px-6 py-7 sm:flex-row sm:gap-9 md:px-9">
        <AiRobot />
        <div className="text-center sm:text-left">
          <h2 className="text-h3 font-bold leading-snug tracking-tight text-agx-ink md:text-[21px]">
            Automatisieren Sie Ihr Business
            <br className="hidden md:block" /> mit AGXORA AI
          </h2>
          <p className="mt-2.5 max-w-md text-body-sm leading-relaxed text-agx-dim">
            Lassen Sie die KI Ihre wiederkehrenden Aufgaben übernehmen, während
            Sie sich auf das Wesentliche konzentrieren.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={onAutomate}
              className="btn-gold px-5 py-2.5 text-body-sm"
            >
              Jetzt automatisieren
              <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <Link href="/" className="btn-ghost px-4 py-2.5 text-body-sm">
              <Icon name="play" className="h-3.5 w-3.5" />
              Demo ansehen
            </Link>
          </div>
        </div>
      </article>

      <article className="glass-panel px-6 py-7">
        <h2 className="text-h4 font-bold tracking-tight text-agx-ink">
          Wachstum beginnt mit einer Idee.
        </h2>
        <p className="mt-1.5 text-body-sm text-agx-dim">
          AGXORA macht den Rest.
        </p>
        <GrowthIllustration />
      </article>
    </section>
  );
}
