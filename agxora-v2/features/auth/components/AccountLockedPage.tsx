"use client";

import Link from "next/link";
import type { JSX } from "react";
import { Button, Card } from "@/app/components/ui";
import { iamAuditLog } from "../store/auditStore";
import { useEffect } from "react";

/**
 * Account locked lockout policy is enforced by future backend.
 */
export function AccountLockedPage(): JSX.Element {
  useEffect(() => {
    iamAuditLog({
      action: "auth.account_locked",
      resource: "user",
      metadata: { source: "account-locked-page" },
    });
  }, []);

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
        Account locked
      </h1>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        This account is temporarily locked. Contact an organization owner or
        wait for the lockout window to expire. Automated lockout and unlock
        flows are backend placeholders.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/login">
          <Button variant="primary" size="sm">
            Back to sign in
          </Button>
        </Link>
        <Link href="/forgot-password">
          <Button variant="secondary" size="sm">
            Reset password
          </Button>
        </Link>
      </div>
    </Card>
  );
}
