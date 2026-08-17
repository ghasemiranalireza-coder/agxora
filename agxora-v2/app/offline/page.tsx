"use client";

import type { JSX } from "react";
import Link from "next/link";
import { ErrorPanel } from "../components/backend";
import { useT } from "../lib/i18n";

/** Offline state — reconnect / retry with clear recovery paths. */
export default function OfflinePage(): JSX.Element {
  const t = useT();

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(251,191,36,0.08), transparent 55%), #05070d",
      }}
    >
      <div className="w-full max-w-lg space-y-4">
        <ErrorPanel
          code="OFFLINE"
          title={t("backend.offline.title")}
          message={t("backend.offline.message")}
          retryable
          onRetry={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
        <p
          className="text-center text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <Link href="/" className="underline-offset-2 hover:underline">
            {t("backend.offline.home")}
          </Link>
          {" · "}
          <Link href="/contact" className="underline-offset-2 hover:underline">
            {t("backend.offline.contact")}
          </Link>
          {" · "}
          <Link href="/login" className="underline-offset-2 hover:underline">
            {t("backend.offline.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
