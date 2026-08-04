"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { ErrorPanel } from "./components/backend";
import { reportError } from "@/app/lib/production/observability";
import { sanitizeClientErrorMessage } from "@/app/lib/production/safeErrorMessage";

/** Segment error UI — sanitized message, retry, recovery links. */
export default function RouteError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): JSX.Element {
  useEffect(() => {
    reportError(error, {
      source: "route-error",
      digest: error.digest ?? "",
    });
  }, [error]);

  const message = sanitizeClientErrorMessage(
    error.message,
    "An unexpected error occurred. Please try again.",
  );

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(248,113,113,0.08), transparent 55%), #05070d",
      }}
    >
      <div className="w-full max-w-lg space-y-4">
        <ErrorPanel
          code="500"
          title="Something went wrong"
          message={message}
          retryable
          onRetry={reset}
        />
        <p
          className="text-center text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <Link href="/" className="underline-offset-2 hover:underline">
            Home
          </Link>
          {" · "}
          <Link href="/offline" className="underline-offset-2 hover:underline">
            Offline help
          </Link>
        </p>
      </div>
    </div>
  );
}
