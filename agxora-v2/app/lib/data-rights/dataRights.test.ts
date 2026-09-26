import { describe, expect, it } from "vitest";
import { assembleOrganizationExport } from "./buildExport";
import { projectExecutionOutcome, projectGovernedEvidence } from "./evidenceProjection";
import { projectAgentOsExport } from "./projectAgentOs";
import { isBlockedExportKey, redactSecrets } from "./redact";
import { describeRecovery } from "./recovery";
import {
  CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE,
  customerDeletePersistenceError,
} from "../crm/persistence/customerDeleteConflict";

const ORG = "org-a";
const OTHER = "org-b";

describe("data export filtering", () => {
  it("drops password hashes, tokens, and email bodies", () => {
    const redacted = redactSecrets({
      passwordHash: "bcrypt",
      accessToken: "tok",
      refreshToken: "ref",
      apiKey: "key",
      html: "secret email body",
      name: "kept",
      body: "crm note text",
    }) as Record<string, unknown>;
    expect(redacted.name).toBe("kept");
    expect(redacted.passwordHash).toBeUndefined();
    expect(redacted.accessToken).toBeUndefined();
    expect(redacted.refreshToken).toBeUndefined();
    expect(redacted.apiKey).toBeUndefined();
    expect(redacted.body).toBe("crm note text");
    expect(JSON.stringify(redacted)).not.toContain("bcrypt");
    expect(JSON.stringify(redacted)).not.toContain("secret email body");
    expect(isBlockedExportKey("passwordHash")).toBe(true);
  });

  it("keeps only the session organization in agent data", () => {
    const projected = projectAgentOsExport(
      {
        workers: [
          { id: "w1", organizationId: ORG, role: "CUSTOMER_COMMUNICATION", status: "ACTIVE", name: "Mail" },
          { id: "w2", organizationId: OTHER, role: "SALES", status: "ACTIVE", name: "Other" },
        ],
        memories: [
          { id: "m1", organizationId: ORG, key: "goal:1", value: { content: "kept", accessToken: "nope" } },
          { id: "m2", organizationId: OTHER, key: "goal:2", value: { content: "foreign" } },
        ],
        businessGoals: [{ id: "g1", organizationId: ORG, statement: "follow up", status: "active" }],
        plans: [],
        approvals: [],
      },
      ORG,
    );
    expect(projected.workers).toHaveLength(1);
    expect(projected.memories).toHaveLength(1);
    expect(JSON.stringify(projected)).not.toContain(OTHER);
    expect(JSON.stringify(projected)).not.toContain("nope");
    expect(JSON.stringify(projected)).toContain("kept");
  });

  it("builds an export that ignores a client organization id by using the supplied organization only", () => {
    const exported = assembleOrganizationExport({
      generatedAt: "2026-09-26T00:00:00.000Z",
      organization: { id: ORG, name: "A" },
      memberships: [{ email: "a@example.com", passwordHash: "hash" }],
      customers: [],
      contacts: [],
      notes: [{ body: "note text is business data", accessToken: "tok" }],
      activities: [],
      documentMetadata: [],
      invoices: [],
      deliveryNotes: [],
      financeSettings: [],
      agentOsPayload: { workers: [{ id: "w", organizationId: OTHER, role: "SALES" }] },
      governedExecutions: [
        {
          id: "e1",
          idempotencyKey: "key-1",
          executionId: "exec-1",
          status: "COMPLETED",
          capabilityId: "CRM_CREATE_NOTE",
          workerId: "w1",
          actorId: "user-1",
          approvalGranted: true,
          verificationStatus: "verified",
          outcome: { noteId: "n1", customerId: "c1", mutated: true, text: "email body" },
          createdAt: "2026-09-26T00:00:00.000Z",
          updatedAt: "2026-09-26T00:00:00.000Z",
        },
      ],
      governedEvidence: [],
    });
    const serialized = JSON.stringify(exported);
    expect(exported.organizationId).toBe(ORG);
    expect(exported.exportVersion).toBe(1);
    expect(exported.workers).toHaveLength(0);
    expect(serialized).not.toContain("hash");
    expect(serialized).not.toContain("tok");
    expect(serialized).not.toContain("email body");
    expect(serialized).toContain("note text is business data");
    expect(exported.governedExecutions[0]?.outcome).toMatchObject({ noteId: "n1", customerId: "c1" });
  });
});

describe("evidence projection", () => {
  it("exposes support fields and hides the raw email body", () => {
    const view = projectGovernedEvidence(
      {
        id: "ev1",
        organizationId: ORG,
        executionId: "exec-1",
        businessGoalId: "g1",
        planId: "p1",
        stepId: "s1",
        capabilityId: "COMMUNICATION_SEND_EMAIL",
        workerId: "worker-1",
        actorId: "user-1",
        action: "execution.result",
        status: "ambiguous",
        metadata: { idempotencyKey: "key-1", text: "hidden body", approval: "APPROVED" },
        createdAt: new Date("2026-09-26T00:00:00.000Z"),
      },
      {
        executionId: "exec-1",
        idempotencyKey: "key-1",
        status: "AMBIGUOUS",
        approvalGranted: true,
        approvalRequired: true,
        verificationStatus: "ambiguous",
        outcome: { mutated: false, ambiguous: true, delivery: "not_configured", text: "body", customerId: "c1" },
        updatedAt: new Date("2026-09-26T00:01:00.000Z"),
      },
    );
    expect(view.idempotencyKey).toBe("key-1");
    expect(view.customerId).toBe("c1");
    expect(view.approvalStatus).toBe("APPROVED");
    expect(view.verificationStatus).toBe("ambiguous");
    expect(view.executionStatus).toBe("AMBIGUOUS");
    expect(view.actorId).not.toBe(view.workerId);
    expect(JSON.stringify(view)).not.toContain("hidden body");
    expect(JSON.stringify(view)).not.toContain("\"text\"");
  });

  it("projects outcome without credentials", () => {
    const outcome = projectExecutionOutcome({
      mutated: true,
      noteId: "n1",
      customerId: "c1",
      accessToken: "secret",
    });
    expect(outcome.noteId).toBe("n1");
    expect(JSON.stringify(outcome)).not.toContain("secret");
  });
});

describe("recovery states", () => {
  it("covers reserved, executing, ambiguous, failed, completed, approval, and verification", () => {
    expect(describeRecovery({ status: "RESERVED" }).code).toBe("RESERVED");
    expect(describeRecovery({ status: "EXECUTING" }).retry).toBe("no");
    expect(describeRecovery({ status: "AMBIGUOUS" }).messageKey).toBe("agents.recovery.ambiguous");
    expect(describeRecovery({ status: "AMBIGUOUS" }).changed).toBe("unknown");
    expect(describeRecovery({ status: "FAILED", mutated: false }).retry).toBe("yes");
    expect(describeRecovery({ status: "COMPLETED", mutated: true }).code).toBe("COMPLETED");
    expect(describeRecovery({ status: "RESERVED", approvalRequired: true, approvalGranted: false }).code).toBe("APPROVAL_REQUIRED");
    expect(describeRecovery({ status: "COMPLETED", verificationStatus: "pending", mutated: true }).code).toBe("VERIFICATION_PENDING");
    expect(describeRecovery({ status: "COMPLETED", verificationStatus: "verified" }).code).toBe("VERIFIED");
    expect(describeRecovery({ status: "COMPLETED", replayed: true }).code).toBe("REPLAYED");
  });
});

describe("customer delete conflict", () => {
  it("maps finance restrict errors to a product message and leaves other failures generic", () => {
    const conflict = customerDeletePersistenceError({ code: "P2003" });
    expect(conflict.code).toBe("conflict");
    expect(conflict.message).toBe(CUSTOMER_FINANCE_DELETE_CONFLICT_MESSAGE);
    expect(conflict.message).not.toContain("P2003");
    expect(customerDeletePersistenceError(new Error("db")).message).toBe("Failed to delete customer");
    const wrapped = customerDeletePersistenceError(new Error("Foreign key constraint failed on the field"));
    expect(wrapped.code).toBe("conflict");
    expect(wrapped.message).not.toContain("Foreign key");
  });
});
