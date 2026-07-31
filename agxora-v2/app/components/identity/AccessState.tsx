"use client";

import Link from "next/link";
import type { JSX } from "react";
import type { AccessErrorCode } from "../../lib/identity";
import { Card, Button } from "../ui";

const COPY: Record<
  AccessErrorCode,
  { readonly title: string; readonly description: string }
> = {
  unauthorized: {
    title: "Unauthorized",
    description: "Sign in to continue to this area of AGXORA.",
  },
  forbidden: {
    title: "Forbidden",
    description: "Your role does not include permission for this resource.",
  },
  expired_session: {
    title: "Expired Session",
    description: "Your session expired. Sign in again to resume work.",
  },
  missing_permission: {
    title: "Missing Permission",
    description: "Ask an Owner or Admin to grant the required module access.",
  },
  account_locked: {
    title: "Account Locked",
    description:
      "This account is locked. Contact an organization owner or try again later.",
  },
};

export function AccessState({
  code,
  detail,
}: {
  readonly code: AccessErrorCode;
  readonly detail?: string;
}): JSX.Element {
  const copy = COPY[code];
  return (
    <Card className="mx-auto max-w-lg space-y-4 text-center" padding="32px" hover={false}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
      >
        Identity & Access
      </p>
      <h1 className="text-2xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {copy.title}
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {detail ?? copy.description}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/login">
          <Button variant="primary" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </Card>
  );
}
