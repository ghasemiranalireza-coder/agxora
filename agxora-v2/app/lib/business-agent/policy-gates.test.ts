import { describe, expect, it } from "vitest";
import {
  campaignItemApproveBlockReason,
  campaignItemRejectBlockReason,
  decideExternalActionPolicy,
  planStatusClaimSucceeded,
} from "./policy-gates";

describe("external action policy gates", () => {
  it("blocks SAFE unapproved publish and send", () => {
    expect(
      decideExternalActionPolicy({
        mode: "SAFE",
        itemStatus: "NEEDS_APPROVAL",
        kind: "publish",
      }),
    ).toEqual({
      blocked: true,
      code: "safe_mode_requires_approval",
      message: "SAFE MODE requires explicit approval before external actions",
    });
    expect(
      decideExternalActionPolicy({
        mode: "SAFE",
        itemStatus: "APPROVED",
        kind: "publish",
      }).blocked,
    ).toBe(false);
  });

  it("still requires approval for publish/send outside SAFE", () => {
    expect(
      decideExternalActionPolicy({
        mode: "AUTONOMOUS",
        itemStatus: "NEEDS_APPROVAL",
        kind: "publish",
      }),
    ).toMatchObject({ blocked: true, code: "approval_required" });
    expect(
      decideExternalActionPolicy({
        mode: "ASSISTED",
        itemStatus: "NEEDS_APPROVAL",
        kind: "send_email",
      }),
    ).toMatchObject({ blocked: true, code: "approval_required" });
    expect(
      decideExternalActionPolicy({
        mode: "AUTONOMOUS",
        itemStatus: "APPROVED",
        kind: "publish",
      }).blocked,
    ).toBe(false);
  });

  it("does not re-approve published or cancelled items", () => {
    expect(campaignItemApproveBlockReason("NEEDS_APPROVAL")).toBeNull();
    expect(campaignItemApproveBlockReason("PUBLISHED")).toMatch(/already published/i);
    expect(campaignItemApproveBlockReason("CANCELLED")).toMatch(/cancelled/i);
  });

  it("does not reject a confirmed or in-flight provider result", () => {
    expect(campaignItemRejectBlockReason("NEEDS_APPROVAL")).toBeNull();
    expect(campaignItemRejectBlockReason("APPROVED")).toBeNull();
    expect(campaignItemRejectBlockReason("PUBLISHED")).toMatch(/already published/i);
    expect(campaignItemRejectBlockReason("PUBLISHING")).toMatch(/already executing/i);
    expect(planStatusClaimSucceeded(1)).toBe(true);
    expect(planStatusClaimSucceeded(0)).toBe(false);
  });
});
