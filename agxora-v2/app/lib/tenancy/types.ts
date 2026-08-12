/**
 * Phase 42.1 tenancy types — trusted actor derived from server session.
 */

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";

export type Actor = {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly membershipId: string;
  readonly role: MembershipRole;
  readonly sessionToken: string;
};

export type CustomerAction =
  | "customer.read"
  | "customer.create"
  | "customer.update"
  | "customer.delete";

export type AuthzResource =
  | { readonly kind: "workspace"; readonly workspaceId: string; readonly organizationId: string }
  | {
      readonly kind: "customer";
      readonly customerId: string;
      readonly workspaceId: string;
      readonly organizationId: string;
    };
