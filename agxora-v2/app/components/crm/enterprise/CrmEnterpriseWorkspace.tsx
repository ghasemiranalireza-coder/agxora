"use client";

import { useEffect, type JSX } from "react";
import { useOrganization } from "../../../lib/organization";
import {
  crmStore,
  useCrmAnalytics,
} from "../../../lib/crm/directory";
import { Card } from "../../ui";
import { CrmAnalyticsDashboard } from "./CrmAnalyticsDashboard";
import { CrmCustomerDeleteDialog } from "./CrmCustomerDeleteDialog";
import { CrmCustomerFormDialog } from "./CrmCustomerFormDialog";
import { CrmDirectory } from "./CrmDirectory";

const LOCAL_ORG_FALLBACK = "org_local_default";

/**
 * Enterprise CRM 2.0 — analytics + customer directory.
 */
export function CrmEnterpriseWorkspace(): JSX.Element {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;
  const analytics = useCrmAnalytics();

  useEffect(() => {
    void crmStore.hydrate(organizationId);
  }, [organizationId]);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Enterprise CRM 2.0
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Customer Relationship Management
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Manage the customer directory, profiles, contacts, notes, and
          documents for {organization?.name ?? "your organization"}. Projects
          are linked by company name from the Projects module without
          duplicating data.
        </p>
      </Card>

      <CrmAnalyticsDashboard analytics={analytics} />
      <CrmDirectory />
      <CrmCustomerFormDialog />
      <CrmCustomerDeleteDialog />
    </div>
  );
}
