"use client";

import type { JSX } from "react";
import Link from "next/link";
import { ErrorPanel } from "./components/backend";
import { useT } from "./lib/i18n";

/** Global 404 — premium recovery surface. */
export default function NotFound(): JSX.Element {
  const t = useT();

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(34,211,238,0.1), transparent 55%), #05070d",
        color: "#f8fafc",
      }}
    >
      <div className="w-full max-w-lg space-y-4">
        <ErrorPanel
          code="404"
          title={t("backend.notFound.title")}
          message={t("backend.notFound.message")}
          retryable={false}
        />
        <nav
          aria-label={t("backend.notFound.recoveryNav")}
          className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-center text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <Link href="/" className="underline-offset-2 hover:underline">
            {t("backend.notFound.home")}
          </Link>
          <Link href="/pricing" className="underline-offset-2 hover:underline">
            {t("backend.notFound.pricing")}
          </Link>
          <Link href="/contact" className="underline-offset-2 hover:underline">
            {t("backend.notFound.contact")}
          </Link>
          <Link href="/login" className="underline-offset-2 hover:underline">
            {t("backend.notFound.signIn")}
          </Link>
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            {t("backend.notFound.dashboard")}
          </Link>
        </nav>
      </div>
    </div>
  );
}
