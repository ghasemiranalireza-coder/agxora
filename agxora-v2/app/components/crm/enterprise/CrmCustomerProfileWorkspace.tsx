"use client";

import { useEffect, type JSX } from "react";
import { useOrganization } from "../../../lib/organization";
import { crmStore } from "../../../lib/crm/directory";
import { CrmCustomerDeleteDialog } from "./CrmCustomerDeleteDialog";
import { CrmCustomerFormDialog } from "./CrmCustomerFormDialog";
import { CrmCustomerProfile } from "./CrmCustomerProfile";

const LOCAL_ORG_FALLBACK = "org_local_default";

export function CrmCustomerProfileWorkspace({
  customerId,
}: {
  readonly customerId: string;
}): JSX.Element {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;

  useEffect(() => {
    void crmStore.hydrate(organizationId).then(() => {
      void crmStore.openCustomer(customerId);
    });
  }, [organizationId, customerId]);

  return (
    <>
      <CrmCustomerProfile customerId={customerId} />
      <CrmCustomerFormDialog />
      <CrmCustomerDeleteDialog />
    </>
  );
}
