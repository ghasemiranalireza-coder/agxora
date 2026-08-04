import type { JSX } from "react";
import Link from "next/link";
import { ErrorPanel } from "./components/backend";

/** Global 404 — premium recovery surface. */
export default function NotFound(): JSX.Element {
  return (
    <div
      className="flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(34,211,238,0.1), transparent 55%), #05070d",
        color: "#f8fafc",
      }}
    >
      <div className="w-full max-w-lg space-y-4">
        <ErrorPanel
          code="404"
          title="Page not found"
          message="The page you requested does not exist, was moved, or is no longer available."
          retryable={false}
        />
        <nav
          aria-label="Recovery"
          className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-center text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <Link href="/" className="underline-offset-2 hover:underline">
            Home
          </Link>
          <Link href="/pricing" className="underline-offset-2 hover:underline">
            Pricing
          </Link>
          <Link href="/contact" className="underline-offset-2 hover:underline">
            Contact
          </Link>
          <Link href="/login" className="underline-offset-2 hover:underline">
            Sign in
          </Link>
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            Dashboard
          </Link>
        </nav>
      </div>
    </div>
  );
}
