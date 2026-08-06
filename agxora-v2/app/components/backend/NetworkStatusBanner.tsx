"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";

/**
 * Network / offline banner — non-intrusive, retry-capable.
 * Does not alter module business logic.
 */
export function NetworkStatusBanner(): JSX.Element | null {
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
      style={{ zIndex: 1040 }}
    >
      <div
        className="flex w-full max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md"
        style={{
          background: "rgba(15, 23, 42, 0.94)",
          borderColor: "rgba(248, 113, 113, 0.45)",
          color: "#f8fafc",
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">You appear to be offline</p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Changes may not sync until the connection returns.{" "}
            <Link href="/offline" className="underline underline-offset-2">
              Offline help
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
          Retry
        </Button>
      </div>
    </div>
  );
}
