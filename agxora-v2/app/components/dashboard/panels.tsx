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
  readonly tileClass: string;
}

const KPI_ITEMS: readonly KpiItem[] = [
  {
    icon: "euro",
    title: "Gesamtumsatz",
    empty: "Noch keine Umsatzdaten",
    hint: "Verbinden Sie Ihre Finanzquellen",
    tileClass:
      "border-agx-gold/35 bg-agx-gold/12 text-agx-gold-soft shadow-[0_0_16px_rgba(242,178,62,0.14)]",
  },
  {
    icon: "users",
    title: "Aktive Kunden",
    empty: "Noch keine Kunden erfasst",
    hint: "Legen Sie Ihren ersten Kunden an",
    tileClass:
      "border-agx-cyan/25 bg-agx-cyan/10 text-agx-cyan-soft shadow-[0_0_16px_rgba(76,195,255,0.12)]",
  },
  {
    icon: "megaphone",
    title: "Laufende Kampagnen",
    empty: "Keine laufenden Kampagnen",
    hint: "Starten Sie Ihre erste Kampagne",
    tileClass:
      "border-agx-blue/30 bg-agx-blue/12 text-[#9dc2ff] shadow-[0_0_16px_rgba(59,130,246,0.14)]",
  },
  {
    icon: "clock",
    title: "Zeitersparnis",
    empty: "Noch keine Daten",
    hint: "Richten Sie Automatisierungen ein",
    tileClass:
      "border-agx-gold/35 bg-agx-gold/12 text-agx-gold-soft shadow-[0_0_16px_rgba(242,178,62,0.14)]",
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
        <article key={item.title} className="glass-panel px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[13px] font-medium text-agx-dim">
              {item.title}
            </span>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.tileClass}`}
            >
              <Icon name={item.icon} className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-1.5 text-[30px] font-bold leading-none tracking-tight text-agx-ink/75">
            –
          </p>
          <p className="mt-3 text-[12px] font-medium text-agx-dim">{item.empty}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-agx-faint">{item.hint}</p>
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
              <span className="whitespace-nowrap rounded-full border border-agx-line-strong bg-[rgba(16,32,62,0.5)] px-2.5 py-1 text-[10.5px] font-medium text-agx-dim">
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

/** Reference-style AI robot — glossy white segmented shell, dark visor
    with camera-lens eyes, side ear pod, warm gold back-light and thin
    gold orbit wires. Pure inline SVG/CSS, no image assets. */
function AiRobot(): JSX.Element {
  return (
    <div aria-hidden="true" className="relative h-48 w-48 shrink-0 sm:h-52 sm:w-52">
      {/* Warm gold back-light behind the upper-right of the head */}
      <div
        className="absolute -inset-5 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 66% 34%, rgba(255, 209, 128, 0.42) 0%, rgba(242, 178, 62, 0.14) 42%, transparent 68%)," +
            "radial-gradient(circle at 30% 76%, rgba(60, 120, 220, 0.18) 0%, transparent 55%)",
        }}
      />

      <svg viewBox="0 0 240 240" className="relative h-full w-full">
        <defs>
          <radialGradient id="agxShell" cx="34%" cy="22%" r="90%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#eef3fa" />
            <stop offset="56%" stopColor="#c3cfdf" />
            <stop offset="78%" stopColor="#8b9cb4" />
            <stop offset="100%" stopColor="#586a86" />
          </radialGradient>
          <radialGradient id="agxVisor" cx="42%" cy="30%" r="92%">
            <stop offset="0%" stopColor="#22375c" />
            <stop offset="45%" stopColor="#101f3b" />
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

        {/* Gold orbit wires behind the head */}
        <g opacity="0.8">
          <ellipse cx="120" cy="126" rx="112" ry="52" fill="none" stroke="url(#agxGoldWire)" strokeWidth="1.4" transform="rotate(-16 120 126)" />
          <ellipse cx="120" cy="128" rx="104" ry="66" fill="none" stroke="url(#agxGoldWire)" strokeWidth="1" opacity="0.65" transform="rotate(9 120 128)" />
          <ellipse cx="120" cy="124" rx="116" ry="42" fill="none" stroke="url(#agxGoldWire)" strokeWidth="0.8" opacity="0.5" transform="rotate(-32 120 124)" />
        </g>
        {/* Glowing orbit nodes */}
        <circle cx="26" cy="150" r="3.4" fill="#ffd57a" filter="url(#agxSoft)" />
        <circle cx="214" cy="96" r="2.8" fill="#ffcb62" filter="url(#agxSoft)" />
        <circle cx="196" cy="182" r="2.2" fill="#ffd57a" filter="url(#agxSoft)" opacity="0.85" />
        <circle cx="52" cy="62" r="2" fill="#ffe3a3" filter="url(#agxSoft)" opacity="0.8" />

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
            stroke="rgba(255,255,255,0.3)"
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

          {/* Top gloss highlight */}
          <ellipse cx="98" cy="66" rx="40" ry="17" fill="#ffffff" opacity="0.4" filter="url(#agxSoft)" />

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

          {/* Soft mouth light at the bottom of the visor */}
          <path
            d="M 116 162 Q 128 168 142 161"
            fill="none"
            stroke="#4cc3ff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
            filter="url(#agxSoft)"
          />
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

/** Decorative growth bars — subtle grid, no numbers, no fabricated data. */
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
          <stop offset="0%" stopColor="rgba(242,178,62,0.18)" />
          <stop offset="70%" stopColor="rgba(250,196,90,0.75)" />
          <stop offset="100%" stopColor="rgba(255,222,150,0.95)" />
        </linearGradient>
      </defs>
      {/* Faint horizontal grid — orientation only, no values */}
      {[14, 40, 66].map((y) => (
        <path
          key={y}
          d={`M0 ${y} H200`}
          stroke="rgba(140,178,240,0.12)"
          strokeWidth="1"
          strokeDasharray="2 5"
          fill="none"
        />
      ))}
      <path d="M0 92 H200" stroke="rgba(140,178,240,0.22)" strokeWidth="1" fill="none" />
      {bars.map((height, index) => (
        <rect
          key={index}
          x={index * 20 + 4}
          y={92 - height * 0.85}
          width={12}
          height={height * 0.85}
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
              <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2.2} />
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
