/**
 * Phase 22 marketing plan document.
 * The model may fill a fixed set of proposal fields.
 * System fields are applied by the server. Unknown and metric fields are rejected.
 */

export const MARKETING_CHANNEL_INTENTS = [
  "instagram",
  "facebook",
  "linkedin",
  "in_store",
  "website",
] as const;

export type MarketingChannelIntent = (typeof MARKETING_CHANNEL_INTENTS)[number];

export const MODEL_PLAN_KEYS = [
  "strategy",
  "audience",
  "offer",
  "channelIntent",
  "contentThemes",
  "contentItems",
] as const;

const FORBIDDEN_KEYS = new Set([
  "publishStatus",
  "impressions",
  "clicks",
  "reach",
  "conversions",
  "tools",
  "tool",
  "capabilities",
  "capability",
  "metrics",
  "published",
  "sent",
  "invoice",
  "approval",
  "verified",
  "memory",
]);

export interface MarketingContentItem {
  readonly day: number;
  readonly theme: string;
  readonly draftCopy: string;
  readonly callToAction: string;
}

export interface MarketingFactRef {
  readonly key: string;
  readonly text: string;
}

export interface MarketingPlanDocument {
  readonly goalStatement: string;
  readonly planWindow: { readonly days: 7; readonly label: "next_7_days" };
  readonly businessFactsUsed: readonly MarketingFactRef[];
  readonly missingFacts: readonly string[];
  readonly strategy: string;
  readonly audience: string;
  readonly offer: string;
  readonly channelIntent: MarketingChannelIntent;
  readonly contentThemes: readonly string[];
  readonly contentItems: readonly MarketingContentItem[];
  readonly status: "draft" | "approved_stored" | "rejected";
  readonly provenance: "model_proposal";
  readonly modelId: string;
  readonly simulated: false;
  readonly contextRecordIds: readonly string[];
  readonly narrowedFromPublish: boolean;
}

export interface MarketingProjection {
  readonly goalStatement: string;
  readonly organizationName: string;
  readonly offer: string;
  readonly audienceNote?: string;
  readonly channelIntent?: MarketingChannelIntent;
  readonly facts: readonly MarketingFactRef[];
  readonly contextRecordIds: readonly string[];
  readonly narrowedFromPublish: boolean;
}

export function requiredMarketingFacts(offer: string): readonly string[] {
  return offer.trim() ? [] : ["offer"];
}

export function isMarketingChannelIntent(value: string): value is MarketingChannelIntent {
  return (MARKETING_CHANNEL_INTENTS as readonly string[]).includes(value);
}

export function modelIsSimulated(input: {
  readonly simulated?: boolean;
  readonly modelId?: string;
  readonly text?: string;
}): boolean {
  if (input.simulated === true) return true;
  const modelId = input.modelId ?? "";
  if (/stub|placeholder|simulated/i.test(modelId)) return true;
  return typeof input.text === "string" && /\[.*stub\]/i.test(input.text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function forbiddenKeyIn(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = forbiddenKeyIn(item);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return key;
    const nested = forbiddenKeyIn(value[key]);
    if (nested) return nested;
  }
  return null;
}

function readString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

function parseItems(value: unknown): MarketingContentItem[] | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  const items: MarketingContentItem[] = [];
  const days = new Set<number>();
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const extra = Object.keys(entry).filter(
      (key) => !["day", "theme", "draftCopy", "callToAction"].includes(key),
    );
    if (extra.length > 0) return null;
    if (typeof entry.day !== "number" || !Number.isInteger(entry.day)) return null;
    if (entry.day < 1 || entry.day > 7 || days.has(entry.day)) return null;
    days.add(entry.day);
    const theme = readString(entry.theme, 160);
    const draftCopy = readString(entry.draftCopy, 800);
    const callToAction = readString(entry.callToAction, 160);
    if (!theme || !draftCopy || !callToAction) return null;
    items.push({ day: entry.day, theme, draftCopy, callToAction });
  }
  items.sort((a, b) => a.day - b.day);
  if (items.map((item) => item.day).join(",") !== "1,2,3,4,5,6,7") return null;
  return items;
}

export function parseModelMarketingProposal(
  raw: unknown,
  projection: MarketingProjection,
  modelId: string,
): { readonly ok: true; readonly plan: MarketingPlanDocument } | { readonly ok: false; readonly error: string } {
  if (modelIsSimulated({ modelId })) {
    return { ok: false, error: "The marketing model result is simulated." };
  }
  if (!isRecord(raw)) return { ok: false, error: "The marketing model did not return an object." };
  const forbidden = forbiddenKeyIn(raw);
  if (forbidden) return { ok: false, error: `The marketing model returned a forbidden field: ${forbidden}.` };
  const unknown = Object.keys(raw).filter(
    (key) => !(MODEL_PLAN_KEYS as readonly string[]).includes(key),
  );
  if (unknown.length > 0) {
    return { ok: false, error: `The marketing model returned an unknown field: ${unknown[0]}.` };
  }
  const strategy = readString(raw.strategy, 1200);
  if (!strategy) return { ok: false, error: "The marketing strategy is missing." };
  const audience = typeof raw.audience === "string" ? raw.audience.trim().slice(0, 400) : null;
  if (audience === null) return { ok: false, error: "The marketing audience field is missing." };
  const offer = readString(raw.offer, 200);
  if (!offer || offer !== projection.offer.trim()) {
    return { ok: false, error: "The marketing offer does not match the supplied offer." };
  }
  const channel = typeof raw.channelIntent === "string" ? raw.channelIntent.trim() : "";
  if (!isMarketingChannelIntent(channel)) {
    return { ok: false, error: "The marketing channel is not on the allowlist." };
  }
  if (projection.channelIntent && channel !== projection.channelIntent) {
    return { ok: false, error: "The marketing channel does not match the supplied channel." };
  }
  if (!Array.isArray(raw.contentThemes) || raw.contentThemes.length < 1 || raw.contentThemes.length > 5) {
    return { ok: false, error: "Marketing content themes are missing." };
  }
  const contentThemes: string[] = [];
  for (const theme of raw.contentThemes) {
    const text = readString(theme, 80);
    if (!text) return { ok: false, error: "A marketing content theme is empty." };
    contentThemes.push(text);
  }
  const contentItems = parseItems(raw.contentItems);
  if (!contentItems) return { ok: false, error: "The marketing plan must contain seven content items." };
  return {
    ok: true,
    plan: {
      goalStatement: projection.goalStatement.trim(),
      planWindow: { days: 7, label: "next_7_days" },
      businessFactsUsed: projection.facts.slice(0, 12),
      missingFacts: [],
      strategy,
      audience,
      offer,
      channelIntent: channel,
      contentThemes,
      contentItems,
      status: "draft",
      provenance: "model_proposal",
      modelId,
      simulated: false,
      contextRecordIds: projection.contextRecordIds.slice(0, 20),
      narrowedFromPublish: projection.narrowedFromPublish,
    },
  };
}

export function validateStoredMarketingPlan(
  value: unknown,
): { readonly ok: true; readonly plan: MarketingPlanDocument } | { readonly ok: false; readonly error: string } {
  if (!isRecord(value)) return { ok: false, error: "Marketing plan is missing." };
  const forbidden = forbiddenKeyIn(value);
  if (forbidden) return { ok: false, error: `Marketing plan contains a forbidden field: ${forbidden}.` };
  if (value.simulated !== false) return { ok: false, error: "A simulated marketing plan cannot be stored." };
  if (modelIsSimulated({ modelId: typeof value.modelId === "string" ? value.modelId : "" })) {
    return { ok: false, error: "A simulated marketing plan cannot be stored." };
  }
  if (value.status !== "draft" && value.status !== "approved_stored") {
    return { ok: false, error: "Marketing plan status is not storable." };
  }
  if (value.provenance !== "model_proposal") return { ok: false, error: "Marketing plan provenance is invalid." };
  if (!isRecord(value.planWindow) || value.planWindow.days !== 7 || value.planWindow.label !== "next_7_days") {
    return { ok: false, error: "Marketing plan window must be seven days." };
  }
  const goalStatement = readString(value.goalStatement, 2000);
  const strategy = readString(value.strategy, 1200);
  const offer = readString(value.offer, 200);
  const modelId = readString(value.modelId, 80);
  if (!goalStatement || !strategy || !offer || !modelId) {
    return { ok: false, error: "Marketing plan is incomplete." };
  }
  if (typeof value.audience !== "string" || value.audience.trim().length > 400) {
    return { ok: false, error: "Marketing audience is invalid." };
  }
  if (typeof value.channelIntent !== "string" || !isMarketingChannelIntent(value.channelIntent)) {
    return { ok: false, error: "Marketing channel is invalid." };
  }
  if (!Array.isArray(value.missingFacts) || value.missingFacts.length > 0) {
    return { ok: false, error: "A marketing plan with missing facts cannot be stored." };
  }
  const contentItems = parseItems(value.contentItems);
  if (!contentItems) return { ok: false, error: "The marketing plan must contain seven content items." };
  if (!Array.isArray(value.contentThemes) || value.contentThemes.length < 1) {
    return { ok: false, error: "Marketing content themes are missing." };
  }
  const facts: MarketingFactRef[] = [];
  if (Array.isArray(value.businessFactsUsed)) {
    for (const fact of value.businessFactsUsed.slice(0, 12)) {
      if (!isRecord(fact)) continue;
      const key = readString(fact.key, 80);
      const text = readString(fact.text, 500);
      if (key && text) facts.push({ key, text });
    }
  }
  const contextRecordIds = Array.isArray(value.contextRecordIds)
    ? value.contextRecordIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80).slice(0, 20)
    : [];
  return {
    ok: true,
    plan: {
      goalStatement,
      planWindow: { days: 7, label: "next_7_days" },
      businessFactsUsed: facts,
      missingFacts: [],
      strategy,
      audience: value.audience.trim(),
      offer,
      channelIntent: value.channelIntent,
      contentThemes: value.contentThemes
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 80))
        .slice(0, 5),
      contentItems,
      status: "approved_stored",
      provenance: "model_proposal",
      modelId,
      simulated: false,
      contextRecordIds,
      narrowedFromPublish: value.narrowedFromPublish === true,
    },
  };
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(trimmed) as unknown;
}
