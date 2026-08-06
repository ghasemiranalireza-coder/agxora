"use client";

import { useEffect, type JSX } from "react";
import { useOrganization } from "../../lib/organization";
import { customerStore } from "../../lib/customers";
import { Card } from "../ui";
import { CustomerTable } from "./CustomerTable";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerDetailsPanel } from "./CustomerDetailsPanel";
import { CustomerDeleteDialog } from "./CustomerDeleteDialog";

const LOCAL_ORG_FALLBACK = "org_local_default";

/**
 * Functional Customer CRM — list / create / edit / delete / search / filter.
 */
export function CustomersWorkspace(): JSX.Element {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;

  useEffect(() => {
    void customerStore.hydrate(organizationId);
  }, [organizationId]);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Customer Management
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Customers
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Create, edit, search, and manage customer records for{" "}
          {organization?.name ?? "your organization"}.
        </p>
      </Card>

      <CustomerTable />
      <CustomerFormDialog />
      <CustomerDetailsPanel />
      <CustomerDeleteDialog />
    </div>
  );
}

