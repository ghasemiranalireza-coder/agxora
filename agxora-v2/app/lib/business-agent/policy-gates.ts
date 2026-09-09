/**
 * SAFE / approval gates for external campaign actions.
 * Provider confirmation still happens in the adapter after these checks pass.
 */

export type ExternalActionKind = "publish" | "schedule" | "send_email";

export type PolicyGateDecision =
  | { readonly blocked: false }
  | {
      readonly blocked: true;
      readonly code: "approval_required" | "safe_mode_requires_approval";
      readonly message: string;
    };

export function decideExternalActionPolicy(input: {
  readonly mode: string;
  readonly itemStatus: string;
  readonly kind: ExternalActionKind;
}): PolicyGateDecision {
  const approved = input.itemStatus === "APPROVED";
  if (input.mode === "SAFE" && !approved) {
    return {
      blocked: true,
      code: "safe_mode_requires_approval",
      message: "SAFE MODE requires explicit approval before external actions",
    };
  }
  if (input.kind === "send_email" && !approved) {
    return {
      blocked: true,
      code: "approval_required",
      message: "Sending requires explicit approval. Nothing was sent.",
    };
  }
  if (input.kind === "publish" && !approved) {
    return {
      blocked: true,
      code: "approval_required",
      message: "Publishing requires explicit approval. Nothing was published.",
    };
  }
  return { blocked: false };
}

export function canApproveCampaignItem(status: string): boolean {
  return status === "NEEDS_APPROVAL" || status === "DRAFT";
}

export function campaignItemApproveBlockReason(status: string): string | null {
  if (status === "APPROVED") return null;
  if (status === "PUBLISHED") {
    return "This item is already published. Approve does not change a confirmed provider result.";
  }
  if (status === "CANCELLED") {
    return "This item was cancelled and cannot be approved.";
  }
  if (status === "PUBLISHING") {
    return "This item is already executing. Wait for provider confirmation.";
  }
  if (status === "FAILED") {
    return "This item failed. Create a new item instead of approving a failed publish.";
  }
  if (!canApproveCampaignItem(status)) {
    return "This item cannot be approved in its current status.";
  }
  return null;
}

export function campaignItemRejectBlockReason(status: string): string | null {
  if (status === "CANCELLED") return null;
  if (status === "PUBLISHED") {
    return "This item is already published. Reject does not change a confirmed provider result.";
  }
  if (status === "PUBLISHING") {
    return "This item is already executing. Wait for provider confirmation.";
  }
  return null;
}

export function planStatusClaimSucceeded(count: number): boolean {
  return count === 1;
}
