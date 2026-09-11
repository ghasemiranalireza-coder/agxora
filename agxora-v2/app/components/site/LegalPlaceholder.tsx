import Link from "next/link";
import type { JSX } from "react";
import StarfieldBackground from "../StarfieldBackground";
import { SiteNav } from "./SiteNav";
import { Icon } from "../ui/icons";

interface LegalPlaceholderProps {
  readonly title: string;
  readonly description: string;
}

/**
 * Honest placeholder destination for legal/contact pages whose final
 * content does not exist yet. No legal claims are fabricated — the page
 * clearly states that the information is still being prepared.
 */
export function LegalPlaceholder({
  title,
  description,
}: LegalPlaceholderProps): JSX.Element {
  return (
    <div className="relative min-h-screen">
      <StarfieldBackground />

      <div className="relative z-[1]">
        <SiteNav />

        <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 md:px-8">
          <div className="glass-panel px-7 py-10 md:px-10">
            <span className="badge badge-neutral uppercase tracking-[0.12em]">
              In Vorbereitung
            </span>
            <h1 className="mt-4 text-h1 font-bold tracking-tight text-agx-ink">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-body leading-relaxed text-agx-dim">
              {description}
            </p>
            <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-agx-dim">
              Die vollständigen Angaben werden vor der Veröffentlichung
              ergänzt.
            </p>
            <Link
              href="/"
              className="btn-ghost mt-8 inline-flex px-5 py-2.5 text-body-sm"
            >
              <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
              Zurück zur Startseite
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
