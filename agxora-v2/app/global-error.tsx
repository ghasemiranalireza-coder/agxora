"use client";

import type { JSX } from "react";
import { useEffect } from "react";
import { reportError } from "@/app/lib/production/observability";
import { sanitizeClientErrorMessage } from "@/app/lib/production/safeErrorMessage";
import { resolveMessage } from "@/app/lib/i18n";
import { DEFAULT_LOCALE } from "@/app/lib/i18n/locale";

/**
 * Root layout error boundary — must define its own html/body.
 * Hides internal error details from end users.
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

  const message = sanitizeClientErrorMessage(
    error.message,
    resolveMessage(DEFAULT_LOCALE, "backend.globalError.message"),
  );

  const title = resolveMessage(DEFAULT_LOCALE, "backend.globalError.title");
  const retry = resolveMessage(DEFAULT_LOCALE, "backend.globalError.retry");
  const home = resolveMessage(DEFAULT_LOCALE, "backend.notFound.home");
  const contact = resolveMessage(DEFAULT_LOCALE, "backend.notFound.contact");

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
            "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          background:
            "radial-gradient(ellipse at top, rgba(248,113,113,0.1), transparent 55%), #05070d",
          color: "#f8fafc",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 440,
            padding: 32,
            textAlign: "center",
            borderRadius: 24,
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(8,14,28,0.88)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#22d3ee",
              fontWeight: 700,
              margin: 0,
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: 24, margin: "14px 0 10px", fontWeight: 650 }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.55, margin: 0 }}>
            {message}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(90deg,#06b6d4,#22d3ee)",
              color: "#020617",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {retry}
          </button>
          <p style={{ marginTop: 18, fontSize: 12, color: "#94a3b8" }}>
            {/* Plain anchors required: root layout may be unavailable. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#22d3ee" }}>
              {home}
            </a>
            {" · "}
            <a href="/contact" style={{ color: "#22d3ee" }}>
              {contact}
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
