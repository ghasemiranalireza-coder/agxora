"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { reportError } from "@/app/lib/production/observability";

/**
 * Root layout error boundary — must define its own html/body.
 * Reports to observability stubs (Sentry-ready).
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): JSX.Element {
  useEffect(() => {
    reportError(error, {
      source: "global-error",
      digest: error.digest ?? "",
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#0b1220",
          color: "#f8fafc",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#22d3ee",
              fontWeight: 600,
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: 24, margin: "12px 0" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
