"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { ErrorPanel } from "./components/backend";
import { reportError } from "@/app/lib/production/observability";

/** Segment error UI — architecture error surface with retry + observability. */
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

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <ErrorPanel
        code="500"
        title="Something went wrong"
        message={error.message || "An unexpected error occurred. Please try again."}
        retryable
        onRetry={reset}
      />
    </div>
  );
}
