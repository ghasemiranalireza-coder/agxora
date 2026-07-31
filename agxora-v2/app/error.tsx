"use client";

import type { JSX } from "react";
import { ErrorPanel } from "./components/backend";

/** Global 500 / route error — architecture error surface with retry. */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): JSX.Element {
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
