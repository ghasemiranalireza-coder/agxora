import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getCapability } from "@/features/agents/capabilities/registry";
import { instagramPublishAvailabilityFromEnv } from "@/features/agents/capabilities/instagramAvailability";
import {
  assessInstagramPublishAccess,
  classifyContainerCreate,
  classifyContainerStatus,
  classifyMediaPublish,
  decideIdempotentPublish,
  instagramPublishIdempotencyKey,
  safePublishEvidence,
  verifyReadBack,
  type PublishAccessInput,
} from "./instagramPublish";

const ready: PublishAccessInput = {
  actorOrganizationId: "org-a",
  workerActive: true,
  entitled: true,
  configured: true,
  planFound: true,
  planOrganizationId: "org-a",
  planStatus: "approved_stored",
  channelIntent: "instagram",
  itemFound: true,
  recordCompleted: true,
  claimGatePass: true,
  imageApproved: true,
  imageOwned: true,
  explicitPublish: true,
  credentialActive: true,
  publishPermission: true,
};

describe("MARKETING_PUBLISH_INSTAGRAM", () => {
  it("is a governed write that is live only when the flag is set", () => {
    const capability = getCapability("MARKETING_PUBLISH_INSTAGRAM");
    expect(capability?.mode).toBe("WRITE");
    expect(capability?.approval.required).toBe(true);
    expect(capability?.security.tenantScoped).toBe(true);
    expect(capability?.execution.idempotencyRequired).toBe(true);
    expect(capability?.verification.required).toBe(true);
    expect(capability?.availability.status).toBe("BLOCKED");
    expect(instagramPublishAvailabilityFromEnv({})).toBe("BLOCKED");
    expect(instagramPublishAvailabilityFromEnv({ AGXORA_INSTAGRAM_PUBLISH_ENABLED: "true" })).toBe("LIVE");
  });

  it("blocks base entitlement, foreign tenants, and missing approval gates", () => {
    expect(assessInstagramPublishAccess({ ...ready, entitled: false }).ok).toBe(false);
    expect(assessInstagramPublishAccess({ ...ready, clientOrganizationId: "org-b" })).toMatchObject({ status: 404 });
    expect(assessInstagramPublishAccess({ ...ready, planOrganizationId: "org-b" })).toMatchObject({ status: 404 });
    expect(assessInstagramPublishAccess({ ...ready, credentialActive: false }).ok).toBe(false);
    expect(assessInstagramPublishAccess({ ...ready, publishPermission: false }).ok).toBe(false);
    expect(assessInstagramPublishAccess({ ...ready, imageOwned: false })).toMatchObject({ status: 404 });
    expect(assessInstagramPublishAccess({ ...ready, planStatus: "draft" }).ok).toBe(false);
    expect(assessInstagramPublishAccess({ ...ready, claimGatePass: false }).ok).toBe(false);
    expect(assessInstagramPublishAccess({ ...ready, explicitPublish: false }).ok).toBe(false);
    expect(assessInstagramPublishAccess(ready).ok).toBe(true);
  });

  it("does not republish an ambiguous or completed execution", () => {
    const baseKey = instagramPublishIdempotencyKey({
      organizationId: "org-a",
      goalId: "goal",
      planId: "plan",
      day: 1,
    });
    expect(decideIdempotentPublish({
      baseKey,
      existing: [{ idempotencyKey: baseKey, executionId: "exec", status: "AMBIGUOUS" }],
    })).toMatchObject({ action: "replay" });
    expect(decideIdempotentPublish({
      baseKey,
      existing: [{ idempotencyKey: baseKey, executionId: "exec", status: "COMPLETED", mediaId: "media" }],
    })).toMatchObject({ action: "replay" });
    expect(decideIdempotentPublish({
      baseKey,
      existing: [{ idempotencyKey: baseKey, executionId: "exec", status: "EXECUTING" }],
    })).toMatchObject({ action: "replay" });
    const failed = decideIdempotentPublish({
      baseKey,
      existing: [{ idempotencyKey: baseKey, executionId: "exec", status: "FAILED" }],
    });
    expect(failed).toMatchObject({ action: "create" });
    if (failed.action === "create") {
      expect(decideIdempotentPublish({
        baseKey,
        existing: [
          { idempotencyKey: baseKey, executionId: "exec", status: "FAILED" },
          { idempotencyKey: failed.key, executionId: "exec-2", status: "AMBIGUOUS" },
        ],
      })).toMatchObject({ action: "replay" });
    }
  });

  it("classifies provider failure, ambiguity, and read-back", () => {
    expect(classifyContainerCreate({ httpStatus: 400, body: {}, transportError: false }).kind).toBe("failed");
    expect(classifyContainerCreate({ httpStatus: 0, body: null, transportError: true }).kind).toBe("ambiguous");
    expect(classifyMediaPublish({ httpStatus: 500, body: null, transportError: false }).kind).toBe("ambiguous");
    expect(classifyContainerStatus("IN_PROGRESS", false)).toBe("wait");
    expect(classifyContainerStatus("FINISHED", false)).toBe("ready");
    expect(verifyReadBack({
      expectedAccountId: "ig",
      expectedUsername: "agxora",
      expectedMediaId: "media",
      expectedCaption: "Approved caption",
      accountId: null,
      username: "agxora",
      mediaId: "media",
      caption: "Approved caption",
      permalink: "https://www.instagram.com/p/abc/",
    }).ok).toBe(true);
    expect(verifyReadBack({
      expectedAccountId: "ig",
      expectedUsername: "agxora",
      expectedMediaId: "media",
      expectedCaption: "Approved caption",
      accountId: null,
      username: "other",
      mediaId: "media",
      caption: "Approved caption",
      permalink: null,
    }).ok).toBe(false);
  });

  it("stores evidence without secrets", () => {
    const metadata = safePublishEvidence({
      provider: "instagram",
      externalAccountId: "1789",
      username: "agxora",
      mediaId: "media",
      permalink: "https://www.instagram.com/p/abc/",
      contentHash: "abc",
      verificationStatus: "verified",
    });
    expect(JSON.stringify(metadata)).not.toMatch(/token|secret|password/i);
    expect(metadata.username).toBe("@agxora");
    expect(metadata.mediaId).toBe("media");
  });

  it("keeps the publish preview inside the mobile frame", () => {
    const css = readFileSync(new URL("../../components/dashboard/first-result.css", import.meta.url), "utf8");
    expect(css).toContain(".agx-ig-publish");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
