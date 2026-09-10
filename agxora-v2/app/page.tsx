import Link from "next/link";
import type { JSX } from "react";
import AgxoraGlobe3D from "./components/AgxoraGlobe3D";
import StarfieldBackground from "./components/StarfieldBackground";
import { AgxoraLogo } from "./components/site/AgxoraLogo";
import { SiteNav } from "./components/site/SiteNav";
import { Icon, type IconName } from "./components/ui/icons";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

interface TrustItem {
  readonly icon: IconName;
  readonly title: string;
  readonly sub: string;
}

const TRUST_ITEMS: readonly TrustItem[] = [
  {
    icon: "sparkles",
    title: "KI-gestützt",
    sub: "Von der Idee zur Umsetzung",
  },
  {
    icon: "shield",
    title: "Sicher & DSGVO-konform",
    sub: "Ihre Daten bleiben Ihre Daten",
  },
  {
    icon: "layers",
    title: "Alles an einem Ort",
    sub: "Ein System. Keine Grenzen.",
  },
];

interface ValueItem {
  readonly icon: IconName;
  readonly title: string;
  readonly sub: string;
}

const VALUE_ITEMS: readonly ValueItem[] = [
  {
    icon: "layers",
    title: "Ein System",
    sub: "Alle Business-Funktionen vereint",
  },
  {
    icon: "zap",
    title: "Mehr Effizienz",
    sub: "Durch intelligente Automatisierung",
  },
  {
    icon: "clock",
    title: "Weniger Aufwand",
    sub: "Mehr Zeit für das Wesentliche",
  },
  {
    icon: "globe",
    title: "Global einsetzbar",
    sub: "Für jede Branche",
  },
];

interface FeatureItem {
  readonly icon: IconName;
  readonly title: string;
  readonly sub: string;
  readonly tileClass: string;
}

const FEATURE_ITEMS: readonly FeatureItem[] = [
  {
    icon: "bot",
    title: "KI Agent",
    sub: "Automatisiert Ihre Aufgaben",
    tileClass: "border-cyan-300/25 bg-cyan-400/10 text-cyan-300",
  },
  {
    icon: "users",
    title: "Kunden",
    sub: "Zentrales Kundenmanagement",
    tileClass: "border-teal-300/25 bg-teal-400/10 text-teal-300",
  },
  {
    icon: "megaphone",
    title: "Kampagnen",
    sub: "Erstellt und verwaltet Kampagnen",
    tileClass: "border-amber-300/25 bg-amber-400/10 text-amber-300",
  },
  {
    icon: "calendar",
    title: "Content Kalender",
    sub: "Plant Ihren Content",
    tileClass: "border-violet-300/25 bg-violet-400/10 text-violet-300",
  },
  {
    icon: "chart",
    title: "Analysen",
    sub: "Macht Ihre Daten verständlich",
    tileClass: "border-sky-300/25 bg-sky-400/10 text-sky-300",
  },
  {
    icon: "zap",
    title: "Automatisierungen",
    sub: "Spart Zeit und reduziert Fehler",
    tileClass: "border-emerald-300/25 bg-emerald-400/10 text-emerald-300",
  },
  {
    icon: "plug",
    title: "Integrationen",
    sub: "Verbindet Ihre Tools",
    tileClass: "border-blue-300/25 bg-blue-400/10 text-blue-300",
  },
  {
    icon: "store",
    title: "Marketplace",
    sub: "Erweitert Ihre Möglichkeiten",
    tileClass: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-300",
  },
];

interface HeroBadge {
  readonly icon: IconName;
  readonly label: string;
  readonly position: string;
  readonly delay: string;
}

const HERO_BADGES: readonly HeroBadge[] = [
  { icon: "users", label: "Kunden", position: "left-0 top-[10%]", delay: "0s" },
  {
    icon: "trendingUp",
    label: "Wachstum",
    position: "right-0 top-[22%]",
    delay: "1.8s",
  },
  {
    icon: "zap",
    label: "Automatisierung",
    position: "bottom-[30%] left-[2%]",
    delay: "3.2s",
  },
  {
    icon: "star",
    label: "Erfolg",
    position: "bottom-[22%] right-[4%]",
    delay: "4.6s",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home(): JSX.Element {
  return (
    <div className="relative min-h-screen">
      <StarfieldBackground />

      <div className="relative z-[1]">
        <SiteNav />

        {/* Hero */}
        <section
          id="produkt"
          className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[minmax(0,10fr)_minmax(0,11fr)] lg:gap-6 lg:pt-16"
        >
          <div className="max-w-xl">
            <span className="glass-chip inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.3em] text-agx-gold-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-agx-gold shadow-[0_0_8px_rgba(242,178,62,0.8)]" />
              AGXORA
            </span>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-agx-ink md:text-5xl xl:text-[3.6rem]">
              Das intelligente <span className="gold-text">Business</span>
              <br />
              Operating System.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-agx-dim md:text-lg">
              Verbindet Kunden, Finanzen, Dokumente und KI in einem ruhigen
              Command Center – für Gründer und Operatoren, die Klarheit
              brauchen, nicht noch einen Tool-Stack.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/login" className="btn-gold px-6 py-3 text-[15px]">
                Kostenlos starten
              </Link>
              <a href="#plattform" className="btn-ghost px-5 py-3 text-[15px]">
                <Icon name="play" className="h-4 w-4" />
                So funktioniert&apos;s
              </a>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {TRUST_ITEMS.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center !rounded-xl text-agx-cyan-soft">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-agx-ink">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-agx-faint">
                      {item.sub}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero globe with floating glass badges */}
          <div className="relative mx-auto h-[380px] w-full max-w-[420px] sm:h-[480px] sm:max-w-[540px] lg:h-[600px] lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 48%, rgba(38, 92, 180, 0.34) 0%, rgba(14, 40, 92, 0.16) 42%, transparent 68%)",
              }}
            />
            <AgxoraGlobe3D />
            {HERO_BADGES.map((badge) => (
              <span
                key={badge.label}
                className={`glass-chip agx-float pointer-events-none absolute inline-flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-agx-ink ${badge.position}`}
                style={{ animationDelay: badge.delay }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-agx-cyan/15 text-agx-cyan-soft">
                  <Icon name={badge.icon} className="h-3.5 w-3.5" />
                </span>
                {badge.label}
              </span>
            ))}
          </div>
        </section>

        {/* Value strip */}
        <section className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="glass-panel grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_ITEMS.map((item) => (
              <div key={item.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-agx-line bg-agx-cyan/10 text-agx-cyan-soft">
                  <Icon name={item.icon} className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-agx-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-agx-dim">
                    {item.sub}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section id="plattform" className="mx-auto max-w-7xl px-5 pt-24 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-agx-ink md:text-4xl">
              Eine Plattform. Unendliche Möglichkeiten.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-agx-dim">
              AGXORA vereint die wichtigsten Business-Funktionen in einem
              intelligenten System.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_ITEMS.map((item) => (
              <article
                key={item.title}
                className="glass-panel group px-5 py-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.tileClass}`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-agx-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-agx-dim">
                  {item.sub}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-16 pt-28 md:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 62% 34%, rgba(64, 130, 220, 0.4) 0%, rgba(20, 52, 110, 0.24) 38%, rgba(6, 16, 38, 0.1) 62%, transparent 75%)",
              boxShadow: "inset -30px -20px 80px rgba(2, 8, 20, 0.8)",
            }}
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-agx-ink md:text-4xl">
              Bereit, Ihr Business auf das
              <br className="hidden sm:block" /> nächste Level zu bringen?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-agx-dim">
              Schließen Sie sich Unternehmen an, die bereits auf AGXORA setzen.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/login" className="btn-gold px-6 py-3 text-[15px]">
                Kostenlos starten
              </Link>
              <Link href="/dashboard" className="btn-ghost px-5 py-3 text-[15px]">
                <Icon name="play" className="h-4 w-4" />
                Demo ansehen
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-agx-line">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row md:px-8">
            <AgxoraLogo />
            <p className="text-[13px] text-agx-faint">
              © 2026 AGXORA. Alle Rechte vorbehalten.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
