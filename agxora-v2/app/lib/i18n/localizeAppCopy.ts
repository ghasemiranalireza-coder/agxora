/**
 * Display-time localization for deterministic application copy.
 * Reuses t() / catalogCopy / isTranslationKey — not a second i18n system.
 * Unknown, technical, brand, and user-authored strings pass through unchanged.
 */

import { catalogCopy } from "./catalogCopy";
import { isTranslationKey } from "./errorMap";
import type { TranslateValues } from "./translate";

type TFn = (key: string, values?: TranslateValues) => string;

const MODULE_BADGE_KEYS: Readonly<Record<string, string>> = {
  "AI CRM": "navigation.aiCrm",
  Automation: "navigation.automation",
  "Finance & Tax": "navigation.financeTax",
  Team: "navigation.team",
  "AI Creator Studio": "navigation.aiCreatorStudio",
};

const AI_FEATURE_BADGE_KEYS: Readonly<Record<string, string>> = {
  "AI Summarization": "automation.catalog.ai-sum.label",
  "AI Email Reply": "automation.catalog.ai-email.label",
  "AI Routing": "automation.catalog.ai-route.label",
  "AI Decision": "automation.catalog.ai-decision.label",
  "AI Recommendations": "automation.catalog.ai-rec.label",
  "AI Classification": "automation.catalog.ai-class.label",
  "Generate AI Content": "automation.studioAiFeatures.generate_ai_content",
};

const INTEGRATION_EXACT: Readonly<Record<string, string>> = {
  "Installed — connect to authorize": "integrations.health.installedAuthorize",
  "Local demo OAuth stub (stub)": "integrations.health.oauthStubPlaceholder",
  "Local demo OAuth stub (live)": "integrations.health.oauthStubLive",
  "Local demo credential stored — live API not connected":
    "integrations.health.demoCredential",
  "Local demo connection — not a live provider link":
    "integrations.health.demoConnection",
  Disconnected: "integrations.health.disconnected",
  "Diagnostics complete": "integrations.logs.diagnosticsComplete",
};

function asValues(
  data?: Readonly<Record<string, unknown>> | TranslateValues,
): TranslateValues | undefined {
  if (!data) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function localizeWorkflowTemplateBadge(t: TFn, label: string): string {
  const key = MODULE_BADGE_KEYS[label] ?? AI_FEATURE_BADGE_KEYS[label];
  return key ? catalogCopy(t, key, label) : label;
}

export function localizeIntegrationMessage(
  t: TFn,
  message: string,
  data?: Readonly<Record<string, unknown>> | TranslateValues,
): string {
  const values = asValues(data);
  if (isTranslationKey(message)) {
    return t(message, values);
  }
  const exact = INTEGRATION_EXACT[message];
  if (exact) return t(exact, values);

  const installed = /^Installed (.+)$/.exec(message);
  if (installed) return t("integrations.logs.installed", { name: installed[1] });
  const demoConnected = /^Demo connected (.+)$/.exec(message);
  if (demoConnected) {
    return t("integrations.logs.demoConnected", { name: demoConnected[1] });
  }
  const disconnected = /^Disconnected (.+)$/.exec(message);
  if (disconnected) {
    return t("integrations.logs.disconnected", { name: disconnected[1] });
  }
  const webhook = /^Created webhook (.+)$/.exec(message);
  if (webhook) return t("integrations.logs.webhookCreated", { name: webhook[1] });
  const keyCreated = /^Created API key (.+)$/.exec(message);
  if (keyCreated) return t("integrations.logs.keyCreated", { name: keyCreated[1] });
  const rotated = /^Rotated key (.+)$/.exec(message);
  if (rotated) return t("integrations.logs.keyRotated", { name: rotated[1] });
  const revoked = /^Revoked key (.+)$/.exec(message);
  if (revoked) return t("integrations.logs.keyRevoked", { name: revoked[1] });
  const stubHealthy = /^(.+) stub healthy$/.exec(message);
  if (stubHealthy) {
    return t("integrations.logs.stubHealthy", { name: stubHealthy[1] });
  }
  const published = /^Published (.+)$/.exec(message);
  if (published) {
    return t("integrations.notice.publishedEvent", { type: published[1] });
  }
  const outgoing = /^Outgoing (.+): (.+)$/.exec(message);
  if (outgoing) {
    return t("integrations.logs.outgoing", {
      status: outgoing[1],
      eventType: outgoing[2],
    });
  }
  return message;
}

export type BillingNoticeCopy = {
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly vars?: TranslateValues;
};

function withQuotaMetric(t: TFn, vars?: TranslateValues): TranslateValues | undefined {
  if (!vars) return vars;
  const metric = vars.metric;
  if (typeof metric !== "string") return vars;
  return {
    ...vars,
    metric: catalogCopy(t, `billing.quotas.${metric}`, metric),
  };
}

export function localizeBillingNotification(
  t: TFn,
  notice: BillingNoticeCopy,
): { title: string; body: string } {
  const vars = withQuotaMetric(t, notice.vars);
  if (isTranslationKey(notice.title) || isTranslationKey(notice.body)) {
    return {
      title: isTranslationKey(notice.title)
        ? t(notice.title, vars)
        : notice.title,
      body: isTranslationKey(notice.body) ? t(notice.body, vars) : notice.body,
    };
  }

  switch (notice.title) {
    case "Trial ending soon": {
      const days = /\b(\d+)\b/.exec(notice.body)?.[1] ?? "";
      return {
        title: t("billing.notifications.trialEnding.title"),
        body: t("billing.notifications.trialEnding.body", { days }),
      };
    }
    case "Subscription expired":
      return {
        title: t("billing.notifications.expired.title"),
        body: t("billing.notifications.expired.body"),
      };
    case "Subscription cancelled":
      return {
        title: t("billing.notifications.cancelled.title"),
        body: t("billing.notifications.cancelled.body"),
      };
    case "Upgrade available":
      return {
        title: t("billing.notifications.upgradeAvailable.title"),
        body: t("billing.notifications.upgradeAvailable.body"),
      };
    case "Invoice ready": {
      const number = /^Invoice (.+) was paid/.exec(notice.body)?.[1] ?? "";
      return {
        title: t("billing.notifications.invoiceReady.title"),
        body: t("billing.notifications.invoiceReady.body", { number }),
      };
    }
    case "Subscription renewed": {
      const date = /on ([0-9-]{10})/.exec(notice.body)?.[1] ?? "";
      return {
        title: t("billing.notifications.renewed.title"),
        body: t("billing.notifications.renewed.body", { date }),
      };
    }
    default: {
      const quota = /^Approaching (.+) limit$/.exec(notice.title);
      if (!quota) return { title: notice.title, body: notice.body };
      const metric = catalogCopy(t, `billing.quotas.${quota[1]}`, quota[1]);
      const used = /Used (\S+) of (\S+)/.exec(notice.body);
      return {
        title: t("billing.notifications.quotaWarning.title", { metric }),
        body: t("billing.notifications.quotaWarning.body", {
          metric,
          used: used?.[1] ?? "",
          limit: used?.[2] ?? "",
        }),
      };
    }
  }
}
