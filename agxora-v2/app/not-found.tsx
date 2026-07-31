import type { JSX } from "react";
import Link from "next/link";
import { ErrorPanel } from "./components/backend";

/** Global 404 — architecture error surface. */
export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-4">
        <ErrorPanel
          code="404"
          title="Page not found"
          message="The resource you requested does not exist or has been moved."
          retryable={false}
        />
        <p className="text-center text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          <Link href="/" className="underline-offset-2 hover:underline">
            Return home
          </Link>
        </p>
      </div>
    </div>
  );
}
