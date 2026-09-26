/**
 * Customer-facing recovery meaning for governed execution states.
 * Ambiguous email is uncertainty: do not claim sent or unsent, and do not retry.
 */

export type RecoveryCode =
  | "RESERVED"
  | "EXECUTING"
  | "AMBIGUOUS"
  | "FAILED"
  | "COMPLETED"
  | "APPROVAL_REQUIRED"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "REPLAYED";

export interface RecoveryView {
  readonly code: RecoveryCode;
  readonly changed: "yes" | "no" | "unknown";
  readonly retry: "yes" | "no" | "after_approval" | "contact_support";
  readonly messageKey: string;
}

export function describeRecovery(input: {
  readonly status?: string | null;
  readonly approvalRequired?: boolean;
  readonly approvalGranted?: boolean;
  readonly verificationStatus?: string | null;
  readonly ambiguous?: boolean;
  readonly replayed?: boolean;
  readonly mutated?: boolean | null;
}): RecoveryView {
  const status = (input.status ?? "").toUpperCase();
  if (input.replayed) {
    return {
      code: "REPLAYED",
      changed: input.mutated === true ? "yes" : "unknown",
      retry: "no",
      messageKey: "agents.recovery.replayed",
    };
  }
  if (input.approvalRequired && input.approvalGranted === false && status !== "COMPLETED" && status !== "FAILED" && status !== "AMBIGUOUS") {
    return {
      code: "APPROVAL_REQUIRED",
      changed: "no",
      retry: "after_approval",
      messageKey: "agents.recovery.approvalRequired",
    };
  }
  if (input.ambiguous || status === "AMBIGUOUS") {
    return {
      code: "AMBIGUOUS",
      changed: "unknown",
      retry: "contact_support",
      messageKey: "agents.recovery.ambiguous",
    };
  }
  if (status === "FAILED") {
    return {
      code: "FAILED",
      changed: input.mutated === true ? "yes" : "no",
      retry: input.mutated === true ? "contact_support" : "yes",
      messageKey: "agents.recovery.failed",
    };
  }
  if (status === "EXECUTING") {
    return {
      code: "EXECUTING",
      changed: "unknown",
      retry: "no",
      messageKey: "agents.recovery.executing",
    };
  }
  if (status === "RESERVED") {
    return {
      code: "RESERVED",
      changed: "no",
      retry: "no",
      messageKey: "agents.recovery.reserved",
    };
  }
  if (status === "COMPLETED" && (input.verificationStatus === "pending" || input.verificationStatus === "unverified")) {
    return {
      code: "VERIFICATION_PENDING",
      changed: input.mutated === false ? "no" : "yes",
      retry: "no",
      messageKey: "agents.recovery.verificationPending",
    };
  }
  if (status === "COMPLETED" && (input.verificationStatus === "verified" || input.verificationStatus === "VERIFIED")) {
    return {
      code: "VERIFIED",
      changed: "yes",
      retry: "no",
      messageKey: "agents.recovery.verified",
    };
  }
  if (status === "COMPLETED") {
    return {
      code: "COMPLETED",
      changed: input.mutated === false ? "no" : "yes",
      retry: "no",
      messageKey: "agents.recovery.completed",
    };
  }
  return {
    code: "RESERVED",
    changed: "unknown",
    retry: "contact_support",
    messageKey: "agents.recovery.reserved",
  };
}
