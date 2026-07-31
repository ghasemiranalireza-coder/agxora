"use client";

import Link from "next/link";
import type { JSX } from "react";
import { Button, Card } from "@/app/components/ui";

export function SessionExpiredPage(): JSX.Element {
  return (
    <Card
      className="mx-auto max-w-lg space-y-4 text-center"
      padding="32px"
      hover={false}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
      >
        Identity & Access
      </p>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Session expired
      </h1>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Your access token is no longer valid. Sign in again to restore your
        workspace session. Refresh-token rotation will be enforced by the
        identity backend.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/login">
          <Button variant="primary" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/">
          <Button variant="secondary" size="sm">
            Home
          </Button>
        </Link>
      </div>
    </Card>
  );
}
