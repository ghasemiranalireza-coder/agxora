"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useOrganization } from "@/app/lib/organization";
import { useOptionalAuth } from "@/app/lib/auth";
import { saasCommercialStore } from "../store";
import { ensureLicense, evaluateLicenseStatus } from "../license";
import { checkAllQuotas, getUsage } from "../usage";
import { listEnabledFeatures, syncPlanFeatureFlags } from "../gating";
import { listPublicPlans } from "../plans";
import type { SaasModuleFeatureKey } from "../types";

const ALL_FEATURES: readonly SaasModuleFeatureKey[] = [
  "crm",
  "projects",
  "finance",
  "documents",
  "ai",
  "automation",
  "analytics",
  "api_access",
  "sso",
  "audit_export",
  "priority_support",
  "custom_branding",
];

const LOCAL_ORG = "org_local_default";

export function useSaasOrganizationId(): string {
  const { organization } = useOrganization();
  return organization?.id ?? LOCAL_ORG;
}

export function useSaasCommercial() {
  const organizationId = useSaasOrganizationId();
  const auth = useOptionalAuth();
  const snapshot = useSyncExternalStore(
    (l) => saasCommercialStore.subscribe(l),
    () => saasCommercialStore.getSnapshot(),
    () => saasCommercialStore.getSnapshot(),
  );

  const license = useMemo(() => {
    if (!snapshot.hydrated) return null;
    return ensureLicense(organizationId);
  }, [organizationId, snapshot]);

  const usage = useMemo(() => {
    if (!snapshot.hydrated) return null;
    return getUsage(organizationId);
  }, [organizationId, snapshot]);

  const quotas = useMemo(() => {
    if (!snapshot.hydrated) return [];
    return checkAllQuotas(organizationId);
  }, [organizationId, snapshot]);

  const features = useMemo(() => {
    if (!snapshot.hydrated) return [];
    syncPlanFeatureFlags(organizationId, ALL_FEATURES);
    return listEnabledFeatures(organizationId);
  }, [organizationId, snapshot]);

  const invoices = useMemo(
    () =>
      snapshot.invoices.filter((i) => i.organizationId === organizationId),
    [organizationId, snapshot.invoices],
  );

  const payments = useMemo(
    () =>
      snapshot.payments.filter((p) => p.organizationId === organizationId),
    [organizationId, snapshot.payments],
  );

  const paymentMethods = useMemo(
    () =>
      snapshot.paymentMethods.filter(
        (m) => m.organizationId === organizationId,
      ),
    [organizationId, snapshot.paymentMethods],
  );

  const notifications = useMemo(
    () =>
      snapshot.notifications.filter(
        (n) => n.organizationId === organizationId,
      ),
    [organizationId, snapshot.notifications],
  );

  const profile = useMemo(
    () =>
      snapshot.profiles.find((p) => p.organizationId === organizationId) ??
      null,
    [organizationId, snapshot.profiles],
  );

  return {
    hydrated: snapshot.hydrated,
    organizationId,
    userId: auth?.userId ?? null,
    email: auth?.user?.email,
    license,
    licenseStatus: license ? evaluateLicenseStatus(license) : null,
    usage,
    quotas,
    features,
    plans: listPublicPlans(),
    invoices,
    payments,
    paymentMethods,
    notifications,
    profile,
    audit: snapshot.audit.filter((a) => a.organizationId === organizationId),
    allLicenses: snapshot.licenses,
    allInvoices: snapshot.invoices,
    emails: snapshot.emails,
  };
}
