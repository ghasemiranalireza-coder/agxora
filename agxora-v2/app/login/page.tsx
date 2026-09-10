import Link from "next/link";
import type { Metadata } from "next";
import type { JSX } from "react";
import StarfieldBackground from "../components/StarfieldBackground";
import { AgxoraLogo } from "../components/site/AgxoraLogo";

export const metadata: Metadata = {
  title: "Anmelden – AGXORA",
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <StarfieldBackground />

      <div className="glass-panel relative z-[1] w-full max-w-[420px] px-7 py-9 md:px-9">
        <div className="flex justify-center">
          <Link href="/">
            <AgxoraLogo />
          </Link>
        </div>

        <h1 className="mt-7 text-center text-xl font-semibold tracking-tight text-agx-ink">
          Willkommen zurück
        </h1>
        <p className="mt-1.5 text-center text-[13px] text-agx-dim">
          Melden Sie sich bei Ihrem Workspace an.
        </p>

        <form className="mt-7 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-agx-dim">
              E-Mail
            </span>
            <input
              type="email"
              autoComplete="email"
              placeholder="name@firma.de"
              className="rounded-xl border border-agx-line bg-[rgba(6,14,30,0.6)] px-3.5 py-2.5 text-[14px] text-agx-ink outline-none transition-colors placeholder:text-agx-faint focus:border-agx-cyan/50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-agx-dim">
              Passwort
            </span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border border-agx-line bg-[rgba(6,14,30,0.6)] px-3.5 py-2.5 text-[14px] text-agx-ink outline-none transition-colors placeholder:text-agx-faint focus:border-agx-cyan/50"
            />
          </label>

          <button type="submit" className="btn-gold mt-2 w-full px-4 py-3 text-[14.5px]">
            Anmelden
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-agx-faint">
          Demo – die Anmeldung ist in dieser Umgebung noch nicht verbunden.
        </p>

        <p className="mt-3 text-center">
          <Link
            href="/"
            className="text-[12.5px] text-agx-dim transition-colors hover:text-agx-ink"
          >
            ← Zurück zur Startseite
          </Link>
        </p>
      </div>
    </main>
  );
}
