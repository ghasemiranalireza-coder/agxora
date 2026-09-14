import { describe, expect, it } from "vitest";
import { AUTOMATION_INTEGRATIONS } from "@/app/lib/automation/catalog";
import { DOCUMENT_INTEGRATIONS } from "@/app/lib/documents/catalog";
import { DATEV_EXPORTS } from "@/app/lib/finance/mock-data";
import { COMMUNICATION_CHANNELS } from "@/app/lib/crm/channels";
import { CREATOR_PLATFORM_INTEGRATIONS } from "@/app/lib/creator-studio/platforms";
import {
  API_KEYS,
  SETTINGS_DATA_SOURCE,
  SETTINGS_INTEGRATIONS,
  SETTINGS_KPIS,
  TEAM_MEMBERS,
} from "@/app/lib/settings/mock-data";
import { getPaymentProvider } from "@/features/saas/payments/providers";
import { runSyncJob } from "@/features/integrations/sync";
import { receiveIncomingWebhook } from "@/features/integrations/webhooks";

describe("provider and catalog honesty", () => {
  it("does not claim Google Workspace is connected without a backend", () => {
    const item = AUTOMATION_INTEGRATIONS.find((row) => row.id === "google-workspace");
    expect(item?.status).not.toBe("connected");
    expect(item?.status).toBe("planned");
  });

  it("does not mark Google Drive as beta without OAuth", () => {
    const item = DOCUMENT_INTEGRATIONS.find((row) => row.id === "google-drive");
    expect(item?.status).not.toBe("beta");
    expect(item?.status).not.toBe("connected");
  });

  it("does not represent DATEV samples as delivered", () => {
    expect(DATEV_EXPORTS.some((row) => row.status === "delivered")).toBe(false);
  });

  it("does not mark the Communication Hub email channel as ready", () => {
    const email = COMMUNICATION_CHANNELS.find((row) => row.id === "email");
    expect(email?.status).not.toBe("ready");
    expect(email?.status).not.toBe("connected");
  });

  it("does not claim a live healthy Stripe connection", async () => {
    const health = await getPaymentProvider("stripe").health();
    expect(health.ok).toBe(false);
    expect(health.message.toLowerCase()).toContain("stub");
  });

  it("does not report local sync as successful external delivery", async () => {
    const job = await runSyncJob({
      organizationId: "org_honesty",
      connectionId: "conn_honesty",
      mode: "manual",
    });
    expect(job.status).not.toBe("succeeded");
    expect(job.error).toMatch(/no external connector delivery/i);
  });

  it("does not report incoming local webhooks as delivered", () => {
    const delivery = receiveIncomingWebhook({
      endpoint: {
        id: "wh_honesty",
        organizationId: "org_honesty",
        name: "Local",
        direction: "incoming",
        url: "https://example.invalid/hook",
        enabled: true,
        events: ["test"],
        createdAt: new Date().toISOString(),
      },
      organizationId: "org_honesty",
      eventType: "test",
      payload: { ok: true },
    });
    expect(delivery.status).not.toBe("delivered");
  });

  it("marks YouTube as ready because publishing exists", () => {
    const youtube = CREATOR_PLATFORM_INTEGRATIONS.find((row) => row.id === "youtube");
    expect(youtube?.status).toBe("ready");
  });

  it("labels settings prototype data instead of presenting live tenant counts", () => {
    expect(SETTINGS_DATA_SOURCE).toBe("demo-prototype");
    expect(SETTINGS_KPIS.find((row) => row.id === "members")?.value).toBe("0");
    expect(TEAM_MEMBERS.every((row) => row.name.startsWith("Demo ·"))).toBe(true);
    expect(API_KEYS.every((row) => row.prefix.startsWith("demo_not_live_"))).toBe(
      true,
    );
    expect(SETTINGS_INTEGRATIONS.every((row) => row.state !== "connected")).toBe(
      true,
    );
    expect(SETTINGS_INTEGRATIONS.every((row) => row.state !== "installed")).toBe(
      true,
    );
  });
});
