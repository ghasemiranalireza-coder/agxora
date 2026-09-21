/**
 * First-customer Agent CRM path.
 *
 * Customer-facing Agent CRM must use Prisma Customer UUIDs via the existing
 * CRM APIs. localStorage / cus_* / crm_* IDs are not a source of truth.
 * Organization/workspace ownership comes from the session actor on the server.
 */

export const FIRST_CUSTOMER_AGENT_CRM_HREF = "/dashboard/crm" as const;

const REAL_CUSTOMER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_CUSTOMER_ID_RE = /^(cus_|crm_|ccon_|cnote_|cact_|crm_mem_)/i;

export type AgentCrmCustomerIdIssue = "missing" | "mock" | "invalid";

export function parseRealCustomerId(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!REAL_CUSTOMER_UUID_RE.test(trimmed)) return null;
  return trimmed;
}

export function isMockCustomerId(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  if (parseRealCustomerId(trimmed)) return false;
  return MOCK_CUSTOMER_ID_RE.test(trimmed) || trimmed.includes("_mem_");
}

export function agentCrmCustomerIdIssue(
  value: string | null | undefined,
): AgentCrmCustomerIdIssue | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "missing";
  if (isMockCustomerId(trimmed)) return "mock";
  if (!parseRealCustomerId(trimmed)) return "invalid";
  return null;
}

export function agentCrmCustomerIdErrorMessage(
  issue: AgentCrmCustomerIdIssue,
): string {
  if (issue === "missing") return "customerId is required.";
  if (issue === "mock") return "Mock customer IDs are not allowed.";
  return "Customer ID must be a real CRM UUID.";
}

export function assertRealCustomerId(value: string | null | undefined): string {
  const issue = agentCrmCustomerIdIssue(value);
  if (issue) {
    const error = new Error("crm_customer_id_invalid");
    error.name = "CrmCustomerIdInvalidError";
    throw error;
  }
  return value!.trim();
}

export function isCrmCustomerIdInvalidError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "CrmCustomerIdInvalidError" ||
      error.message === "crm_customer_id_invalid")
  );
}

export const AGENT_CRM_CUSTOMER_READ_FIELDS = [
  "id",
  "companyName",
  "contactName",
  "email",
  "phone",
  "address",
  "city",
  "country",
  "status",
] as const;

/** Client-supplied tenant/actor keys are never ownership. Session actor is. */
export const AGENT_CRM_IGNORED_CLIENT_TENANT_KEYS = [
  "organizationId",
  "workspaceId",
  "tenantId",
  "actorId",
] as const;

export type AgentCrmHonestyKind =
  | "waiting_approval"
  | "completed"
  | "unavailable"
  | "invalid_id"
  | "failed"
  | "in_progress";

export function agentCrmHonestyKind(input: {
  readonly jobStatus: string;
  readonly resultSuccess?: boolean;
  readonly crmAvailable?: boolean;
  readonly invalidCustomerId?: boolean;
}): AgentCrmHonestyKind {
  if (input.jobStatus === "WAITING_FOR_APPROVAL") return "waiting_approval";
  if (input.invalidCustomerId) return "invalid_id";
  if (input.crmAvailable === false) return "unavailable";
  if (input.resultSuccess === true && input.jobStatus === "COMPLETED") {
    return "completed";
  }
  if (input.jobStatus === "FAILED" || input.resultSuccess === false) {
    return "failed";
  }
  return "in_progress";
}
