"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { OVERLAY_Z } from "../ui/overlayStack";
import { useT } from "@/app/lib/i18n";

/**
 * Network / offline banner — non-intrusive, retry-capable.
 * Does not alter module business logic.
 */
export function NetworkStatusBanner(): JSX.Element | null {
  const t = useT();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-0 flex justify-center p-3 sm:p-4"
      style={{ zIndex: OVERLAY_Z.critical }}
    >
      <div
        className="flex w-full max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl"
        style={{
          background: "var(--agx-ds-elevated)",
          borderColor:
            "color-mix(in srgb, var(--agx-ds-danger) 45%, transparent)",
          color: "var(--agx-ds-text)",
          boxShadow: "var(--agx-ds-shadow-lg)",
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("backend.network.offline")}</p>
          <p className="text-xs" style={{ color: "var(--agx-ds-text-muted)" }}>
            {t("backend.network.offlineSyncHint")}{" "}
            <Link href="/offline" className="underline underline-offset-2">
              {t("backend.network.offlineHelp")}
            </Link>
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
        >
          {t("backend.errorBoundary.retry")}
        </Button>
      </div>
    </div>
  );
}
