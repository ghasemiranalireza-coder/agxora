"use client";

import type { JSX } from "react";
import { ErrorPanel } from "../components/backend";

/** Offline state — architecture surface for reconnect / retry UI. */
export default function OfflinePage(): JSX.Element {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <ErrorPanel
        code="OFFLINE"
        title="You are offline"
        message="Check your connection and retry when you are back online."
        retryable
        onRetry={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    </div>
  );
}
