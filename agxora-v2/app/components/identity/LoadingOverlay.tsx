"use client";

import type { JSX } from "react";
import { createPortal } from "react-dom";
import { Skeleton } from "../ui";
import { OVERLAY_Z } from "../ui/overlayStack";

/**
 * Identity loading overlay — portaled, DS scrim/elevated, above shell chrome.
 */
export function IdentityLoadingOverlay({
  label = "Loading identity…",
}: {
  readonly label?: string;
}): JSX.Element | null {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: OVERLAY_Z.critical,
        background: "var(--agx-ds-scrim)",
      }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="w-full max-w-sm space-y-3 border p-6"
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          borderColor: "var(--agx-ds-border)",
          background: "var(--agx-ds-elevated)",
          boxShadow: "var(--agx-ds-shadow-lg)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--agx-ds-text-muted)" }}>
          {label}
        </p>
        <Skeleton height={14} width="70%" />
        <Skeleton height={36} width="100%" />
        <Skeleton height={36} width="100%" />
      </div>
    </div>,
    document.body,
  );
}
