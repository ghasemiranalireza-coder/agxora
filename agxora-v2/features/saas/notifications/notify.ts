/**
 * SaaS commercial notifications — trial, expiry, payment failed, upgrades.
 */

import { saasCommercialStore } from "../store";
import type { SaasNotification, SaasNotificationKind } from "../types";
import { sendBillingEmail } from "../email/emailService";
import { evaluateLicenseStatus, ensureLicense } from "../license";
import { checkAllQuotas } from "../usage";

export function notifySaasEvent(
  organizationId: string,
  kind: SaasNotificationKind,
  content: { title: string; body: string; href?: string; vars?: Readonly<Record<string, string | number>> },
): SaasNotification {
  return saasCommercialStore.pushNotification({
    organizationId,
    kind,
    title: content.title,
    body: content.body,
    href: content.href,
    vars: content.vars,
  });
}

function hasRecentNotification(
  organizationId: string,
  kind: SaasNotificationKind,
): boolean {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return saasCommercialStore
    .listNotifications(organizationId)
    .some((n) => n.kind === kind && Date.parse(n.createdAt) >= dayAgo);
}

/** Evaluate license/usage and enqueue relevant notices (at most once per kind / 24h). */
export function refreshSubscriptionNotifications(
  organizationId: string,
  email?: string,
): readonly SaasNotification[] {
  const license = ensureLicense(organizationId);
  const status = evaluateLicenseStatus(license);
  const created: SaasNotification[] = [];

  if (status === "trial" && license.trialEndsAt) {
    const days =
      (new Date(license.trialEndsAt).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000);
    if (
      days <= 3 &&
      days > 0 &&
      !hasRecentNotification(organizationId, "trial_ending")
    ) {
      created.push(
        notifySaasEvent(organizationId, "trial_ending", {
          title: "billing.notifications.trialEnding.title",
          body: "billing.notifications.trialEnding.body",
          vars: { days: Math.ceil(days) },
          href: "/dashboard/billing",
        }),
      );
      if (email) {
        sendBillingEmail({
          templateId: "trial_ending",
          to: email,
          vars: { days: String(Math.ceil(days)) },
        });
      }
    }
  }

  if (
    status === "expired" &&
    !hasRecentNotification(organizationId, "subscription_expiry")
  ) {
    created.push(
      notifySaasEvent(organizationId, "subscription_expiry", {
        title: "billing.notifications.expired.title",
        body: "billing.notifications.expired.body",
        href: "/dashboard/billing",
      }),
    );
  }

  for (const quota of checkAllQuotas(organizationId)) {
    if (
      quota.softWarning &&
      !hasRecentNotification(organizationId, "quota_warning")
    ) {
      created.push(
        notifySaasEvent(organizationId, "quota_warning", {
          title: "billing.notifications.quotaWarning.title",
          body: "billing.notifications.quotaWarning.body",
          vars: { metric: quota.metric, used: quota.used, limit: quota.limit },
          href: "/dashboard/billing",
        }),
      );
      break;
    }
  }

  if (
    (license.planId === "starter" || license.planId === "professional") &&
    !hasRecentNotification(organizationId, "upgrade_available")
  ) {
    created.push(
      notifySaasEvent(organizationId, "upgrade_available", {
        title: "billing.notifications.upgradeAvailable.title",
        body: "billing.notifications.upgradeAvailable.body",
        href: "/dashboard/billing",
      }),
    );
  }

  return created;
}

export function listNotifications(organizationId: string) {
  return saasCommercialStore.listNotifications(organizationId);
}

export function markNotificationRead(id: string): void {
  saasCommercialStore.markNotificationRead(id);
}
