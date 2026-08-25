/**
 * Growth profile → CRM customer/contact sync using the existing CRM mutation path.
 */

import { normalizeEmail } from "@/app/lib/crm/directory/validation";
import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import { agentsStore } from "../store";
import {
  emptyContactDraft,
  emptyCustomerDraft,
  emptyNoteDraft,
  getCrmBridgeProvider,
} from "./adapter";
import type {
  CampaignCrmSync,
  CrmBridgeResult,
  GrowthCrmLink,
  GrowthCrmLinkOutcome,
} from "./types";

function crmHref(customerId: string): string {
  return `/dashboard/crm/${customerId}`;
}

function orgLinks(organizationId: string): GrowthCrmLink[] {
  return agentsStore
    .getSnapshot()
    .growthCrmLinks.filter((item) => item.organizationId === organizationId);
}

function findLinkForProfile(
  organizationId: string,
  profileId: string,
): GrowthCrmLink | undefined {
  return orgLinks(organizationId).find((item) => item.profileId === profileId);
}

function draftEmail(profile: GrowthBusinessProfile): string {
  const fromContact = profile.contactInformation?.email?.trim();
  if (fromContact) return normalizeEmail(fromContact);
  const slug = profile.companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "growth";
  return normalizeEmail(`growth.${slug}@pending.local`);
}

function contactNameOf(profile: GrowthBusinessProfile): string {
  return profile.companyName.trim() || "Growth contact";
}

function buildCustomerDraft(profile: GrowthBusinessProfile) {
  return emptyCustomerDraft({
    companyName: profile.companyName.trim() || "Growth company",
    contactName: contactNameOf(profile),
    email: draftEmail(profile),
    phone: profile.contactInformation?.phone?.trim() ?? "",
    website: profile.contactInformation?.website?.trim() ?? "",
    industry: profile.industry?.trim() ?? "",
    country: profile.country?.trim() ?? "",
    city: "",
    address: profile.contactInformation?.address?.trim() ?? "",
    taxNumber: "",
    status: "lead",
    owner: "Growth Agent",
    tags: "growth,campaign",
  });
}

function buildContactDraft(profile: GrowthBusinessProfile) {
  return emptyContactDraft({
    name: contactNameOf(profile),
    role: "Primary",
    email: draftEmail(profile),
    phone: profile.contactInformation?.phone?.trim() ?? "",
    mobile: "",
    notes: profile.description?.trim() ?? "",
  });
}

function buildCampaignNoteDraft(input: {
  readonly profile: GrowthBusinessProfile;
  readonly campaignName?: string;
  readonly campaignOffer?: string;
  readonly campaignObjective?: string;
  readonly campaignCta?: string;
}) {
  const lines = [
    `Growth profile: ${input.profile.companyName}`,
    input.campaignName ? `Campaign: ${input.campaignName}` : undefined,
    input.campaignObjective ? `Objective: ${input.campaignObjective}` : undefined,
    input.campaignOffer ? `Offer: ${input.campaignOffer}` : undefined,
    input.campaignCta ? `CTA: ${input.campaignCta}` : undefined,
    `Audience: ${input.profile.targetAudience ?? "n/a"}`,
  ].filter(Boolean);
  return emptyNoteDraft({
    title: input.campaignName
      ? `Growth campaign · ${input.campaignName}`
      : "Growth campaign context",
    body: lines.join("\n"),
    author: "Growth Agent",
  });
}

function resultOf(
  outcome: GrowthCrmLinkOutcome,
  patch: Partial<CrmBridgeResult> & { readonly message: string },
): CrmBridgeResult {
  const success =
    outcome === "linked" || outcome === "created" || outcome === "already-linked";
  return {
    available: outcome !== "unavailable",
    success,
    outcome,
    duplicated: outcome === "already-linked" || outcome === "linked",
    ...patch,
    message: patch.message,
  };
}

export async function syncGrowthProfileToCrm(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
  readonly campaignId?: string;
  readonly campaignName?: string;
  readonly campaignOffer?: string;
  readonly campaignObjective?: string;
  readonly campaignCta?: string;
  readonly attachNote?: boolean;
  readonly taskId?: string;
  readonly executionJobId?: string;
}): Promise<{
  readonly result: CrmBridgeResult;
  readonly link?: GrowthCrmLink;
  readonly sync?: CampaignCrmSync;
}> {
  const provider = getCrmBridgeProvider();
  const now = nowIso();
  const existingLink = findLinkForProfile(input.organizationId, input.profile.id);

  if (!provider.available) {
    const result = resultOf("unavailable", {
      message: "crm_unavailable",
      available: false,
      success: false,
    });
    const sync = persistSync({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      profileId: input.profile.id,
      status: "blocked",
      outcome: "unavailable",
      result,
      taskId: input.taskId,
      executionJobId: input.executionJobId,
      now,
    });
    return { result, sync };
  }

  try {
    let outcome: GrowthCrmLinkOutcome = "created";
    let customerId = existingLink?.customerId;
    let contactId = existingLink?.contactId;
    let noteId = existingLink?.noteId;
    let companyName = existingLink?.companyName ?? input.profile.companyName;
    let contactName = existingLink?.contactName;
    let email = existingLink?.email;
    let duplicated = false;

    if (customerId) {
      const existingCustomer = await provider.getCustomer(customerId);
      if (existingCustomer && existingCustomer.organizationId === input.organizationId) {
        outcome = "already-linked";
        duplicated = true;
        companyName = existingCustomer.companyName;
        contactName = existingCustomer.contactName;
        email = existingCustomer.email;
      } else {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customers = await provider.listCustomers(input.organizationId);
      const draft = buildCustomerDraft(input.profile);
      const emailKey = normalizeEmail(draft.email);
      const companyKey = draft.companyName.trim().toLowerCase();
      const match = customers.find(
        (row) =>
          normalizeEmail(row.email) === emailKey ||
          row.companyName.trim().toLowerCase() === companyKey,
      );
      if (match) {
        customerId = match.id;
        companyName = match.companyName;
        contactName = match.contactName;
        email = match.email;
        outcome = "linked";
        duplicated = true;
      } else {
        const created = await provider.createCustomer(input.organizationId, draft);
        customerId = created.id;
        companyName = created.companyName;
        contactName = created.contactName;
        email = created.email;
        outcome = "created";
      }
    }

    if (!contactId && customerId) {
      const contacts = await provider.listContacts(customerId);
      const emailKey = draftEmail(input.profile);
      const existingContact = contacts.find(
        (row) => normalizeEmail(row.email) === emailKey,
      );
      if (existingContact) {
        contactId = existingContact.id;
        contactName = existingContact.name;
      } else {
        const createdContact = await provider.createContact(
          input.organizationId,
          customerId,
          buildContactDraft(input.profile),
        );
        contactId = createdContact.id;
        contactName = createdContact.name;
      }
    }

    if (input.attachNote !== false && input.campaignId && customerId) {
      const note = await provider.createNote(
        input.organizationId,
        customerId,
        buildCampaignNoteDraft({
          profile: input.profile,
          campaignName: input.campaignName,
          campaignOffer: input.campaignOffer,
          campaignObjective: input.campaignObjective,
          campaignCta: input.campaignCta,
        }),
      );
      noteId = note.id;
    }

    const link: GrowthCrmLink = {
      id: existingLink?.id ?? createGrowthId("gclink"),
      organizationId: input.organizationId,
      profileId: input.profile.id,
      customerId,
      contactId,
      noteId,
      campaignId: input.campaignId ?? existingLink?.campaignId,
      href: crmHref(customerId),
      companyName,
      contactName,
      email,
      outcome,
      createdAt: existingLink?.createdAt ?? now,
      updatedAt: now,
      lastSyncedAt: now,
    };
    agentsStore.upsertGrowthCrmLink(link);

    const result = resultOf(outcome, {
      message: outcome,
      linkId: link.id,
      customerId,
      contactId,
      noteId,
      href: link.href,
      duplicated,
    });

    const sync = persistSync({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      profileId: input.profile.id,
      linkId: link.id,
      customerId,
      contactId,
      noteId,
      href: link.href,
      status: "completed",
      outcome,
      result,
      taskId: input.taskId,
      executionJobId: input.executionJobId,
      now,
    });

    return { result, link, sync };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "crm_bridge_error";
    const unavailable =
      message.includes("unavailable") ||
      (error instanceof Error && error.name === "CrmBridgeUnavailableError");
    const outcome: GrowthCrmLinkOutcome = unavailable ? "unavailable" : "error";
    const result = resultOf(outcome, {
      message,
      available: !unavailable,
      success: false,
    });
    const sync = persistSync({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      profileId: input.profile.id,
      status: unavailable ? "blocked" : "failed",
      outcome,
      result,
      taskId: input.taskId,
      executionJobId: input.executionJobId,
      lastError: message,
      now,
    });
    return { result, sync };
  }
}

function persistSync(input: {
  readonly organizationId: string;
  readonly campaignId?: string;
  readonly profileId: string;
  readonly linkId?: string;
  readonly customerId?: string;
  readonly contactId?: string;
  readonly noteId?: string;
  readonly href?: string;
  readonly status: CampaignCrmSync["status"];
  readonly outcome?: GrowthCrmLinkOutcome;
  readonly result?: CrmBridgeResult;
  readonly taskId?: string;
  readonly executionJobId?: string;
  readonly lastError?: string;
  readonly now: string;
}): CampaignCrmSync {
  const existing = agentsStore
    .getSnapshot()
    .campaignCrmSyncs.find((item) => {
      if (item.organizationId !== input.organizationId) return false;
      if (input.campaignId) {
        return item.campaignId === input.campaignId;
      }
      // Profile-only syncs: match the profile-scoped row (no campaign invented).
      return !item.campaignId && item.profileId === input.profileId;
    });
  const sync: CampaignCrmSync = {
    id: existing?.id ?? createGrowthId("csync"),
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    profileId: input.profileId,
    linkId: input.linkId ?? existing?.linkId,
    customerId: input.customerId ?? existing?.customerId,
    contactId: input.contactId ?? existing?.contactId,
    noteId: input.noteId ?? existing?.noteId,
    href: input.href ?? existing?.href,
    status: input.status,
    outcome: input.outcome,
    result: input.result,
    executionJobId: input.executionJobId ?? existing?.executionJobId,
    taskId: input.taskId ?? existing?.taskId,
    createdAt: existing?.createdAt ?? input.now,
    updatedAt: input.now,
    lastError: input.lastError,
  };
  agentsStore.upsertCampaignCrmSync(sync);
  return sync;
}

export function getGrowthCrmLink(
  organizationId: string,
  profileId?: string,
): GrowthCrmLink | undefined {
  const links = orgLinks(organizationId);
  if (profileId) return links.find((item) => item.profileId === profileId);
  return links[0];
}

export function getCampaignCrmSync(
  organizationId: string,
  campaignId?: string,
): CampaignCrmSync | undefined {
  const rows = agentsStore
    .getSnapshot()
    .campaignCrmSyncs.filter((item) => item.organizationId === organizationId);
  if (campaignId) return rows.find((item) => item.campaignId === campaignId);
  return rows.find((item) => !item.campaignId) ?? rows[0];
}
