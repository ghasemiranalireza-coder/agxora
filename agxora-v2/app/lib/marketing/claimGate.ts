/**
 * Deterministic marketing claim gate.
 * A claim is supported only when authoritative business context supports it.
 * The gate does not decide whether a sentence is true in the outside world.
 */

import { createHash } from "node:crypto";
import { isAuthoritativeBusinessFact } from "./businessFact";
import type { MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import type { MemoryRecord } from "@/features/agents/types";

export const CLAIM_GATE_VERSION = "v1";

export type ClaimKind =
  | "SUPPORTED_FACT"
  | "UNSUPPORTED_FACT"
  | "PROHIBITED_CLAIM"
  | "MARKETING_PERSUASION"
  | "OPINION_OR_STYLE";

export type ClaimGateDecision = "PASS" | "BLOCKED" | "EDIT_REQUIRED";

export interface CheckedClaim {
  readonly text: string;
  readonly kind: ClaimKind;
  readonly supportFactIds: readonly string[];
  readonly customerReason: string | null;
}

export interface ClaimGateEvaluation {
  readonly version: string;
  readonly result: ClaimGateDecision;
  readonly contentHash: string;
  readonly supportFactIds: readonly string[];
  readonly claims: readonly CheckedClaim[];
  readonly customerMessage: string;
}

const STOP = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer",
  "wir", "unser", "unsere", "unseren", "unserem", "uns", "sie", "ihr", "ihre", "ihren",
  "und", "oder", "mit", "von", "vom", "zu", "zum", "zur", "im", "in", "auf", "fuer", "für",
  "ist", "sind", "bei", "auch", "nur", "nicht", "keine", "kein", "the", "a", "an", "our",
  "we", "your", "for", "and", "of", "to", "with", "our", "this", "that",
]);

const STYLE = new Set([
  "entdecke", "entdecken", "entdeck", "probiere", "probier", "probieren", "komm", "kommt",
  "besuche", "besuchen", "geniesse", "geniessen", "erlebe", "erleben", "schau", "jetzt",
  "heute", "neu", "neuen", "deinen", "dein", "discover", "try", "visit", "enjoy", "taste",
]);

function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function normalizeClaimText(text: string): string {
  return fold(text).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return normalizeClaimText(text).split(" ").filter((token) => token.length > 2 && !STOP.has(token));
}

function contentTokens(text: string): string[] {
  return tokens(text).filter((token) => !STYLE.has(token));
}

const PRICE_RULE = /preis|rabatt|guenstig|discount|kostenlos|gratis/;
const PRICE_CLAIM = /guenstig|preis|rabatt|discount|kostenlos|gratis|\d+\s*(euro|eur)/;
const LOVE = /\bliebe[nt]?\b|\bliebt\b|\bgeliebt\b|\bloves?\b|\bbeliebt/;
const SUPERLATIVE = /\bbeliebtest|\bmarktfuehrer\b|\bguenstigst|\bbeste[ns]?\b|\bgroesste[ns]?\b|\bnummer\s*1\b|\bnr\s*1\b/;
const TESTIMONIAL = /testimonial|bewertung|\bsterne\b|ausgezeichnet|empfehlen|kunden sagen|gaeste sagen/;
const YEARS = /seit\s+\d+\s+jahr/;

function factCorpus(texts: readonly string[]): Set<string> {
  return new Set(texts.flatMap((text) => tokens(text)));
}

function markers(text: string, factTokens: ReadonlySet<string>): string[] {
  const normalized = normalizeClaimText(text);
  const found: string[] = [];
  const consider = (label: string, pattern: RegExp) => {
    if (!pattern.test(normalized)) return;
    const pieces = normalized.match(pattern) ?? [];
    const supported = pieces.every((piece) => tokens(piece).every((token) => factTokens.has(token)) || factTokens.has(piece.replace(/\s+/g, "")));
    if (!supported) found.push(label);
  };
  consider("preference", LOVE);
  consider("superlative", SUPERLATIVE);
  consider("testimonial", TESTIMONIAL);
  consider("years", YEARS);
  const numbers = normalized.match(/\d+/g) ?? [];
  if (numbers.some((number) => !factTokens.has(number) && ![...factTokens].some((token) => token.includes(number)))) {
    found.push("number");
  }
  return found;
}

function prohibitedTopics(statement: string): string[] {
  const normalized = normalizeClaimText(statement);
  const topics: string[] = [];
  if (PRICE_RULE.test(normalized)) topics.push("price");
  if (/superlativ|beliebtest|marktfuehrer|preisversprechen/.test(normalized)) topics.push("boast");
  return topics;
}

function hitsProhibited(text: string, topics: readonly string[], prohibitedStatements: readonly string[]): boolean {
  const normalized = normalizeClaimText(text);
  if (topics.includes("price") && PRICE_CLAIM.test(normalized)) return true;
  if (topics.includes("boast") && (SUPERLATIVE.test(normalized) || PRICE_CLAIM.test(normalized))) return true;
  for (const statement of prohibitedStatements) {
    const banned = contentTokens(statement).filter((token) => token.length > 4 && !["keine", "nicht", "verwenden", "nutzen"].includes(token));
    if (banned.length < 2) continue;
    const claimTokens = new Set(contentTokens(text));
    const overlap = banned.filter((token) => claimTokens.has(token)).length;
    if (overlap / banned.length >= 0.6) return true;
  }
  return false;
}

function isInvitation(text: string): boolean {
  const first = normalizeClaimText(text).split(" ")[0] ?? "";
  return STYLE.has(first) || [...STYLE].some((verb) => first.startsWith(verb));
}

export interface ClaimSupport {
  readonly id: string;
  readonly text: string;
  readonly prohibited: boolean;
  readonly status: string;
  readonly updatedAt: string;
  readonly contentHash: string;
}

export interface FactContextRef {
  readonly id: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly contentHash: string;
  readonly prohibited: boolean;
}

export const CLAIM_GATE_RECHECK_MESSAGE = "This marketing content must be checked again.";

export function supportFromMemories(
  memories: readonly MemoryRecord[],
  organizationId: string,
): readonly ClaimSupport[] {
  return memories.filter((record) => isAuthoritativeBusinessFact(record, organizationId)).map((record) => {
    const value = record.value as {
      content?: string;
      fact?: { category?: string; allowedForMarketing?: boolean; statement?: string };
    };
    const statement = value.fact?.statement ?? value.content ?? "";
    const status = typeof (record.value as { status?: unknown }).status === "string"
      ? (record.value as { status: string }).status
      : "";
    const updatedAt = typeof (record.value as { updatedAt?: unknown }).updatedAt === "string"
      ? (record.value as { updatedAt: string }).updatedAt
      : record.createdAt;
    const prohibited = value.fact?.category === "PROHIBITED_CLAIM"
      || value.fact?.allowedForMarketing === false
      || (value.fact?.category === "BRAND_RULE" && /keine|nicht|must not|do not|nicht verwenden/i.test(statement));
    return {
      id: record.id,
      text: statement,
      prohibited,
      status,
      updatedAt,
      contentHash: factStatementHash(statement),
    };
  });
}

function segments(plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">): string[] {
  const texts = [
    plan.strategy,
    plan.audience,
    plan.offer,
    ...plan.contentThemes,
    ...plan.contentItems.flatMap((item) => [item.theme, item.draftCopy, item.callToAction]),
  ];
  const sentences: string[] = [];
  for (const text of texts) {
    for (const part of text.split(/[.!?\n]+/)) {
      const sentence = part.trim();
      if (sentence) sentences.push(sentence);
    }
  }
  return sentences;
}

export function claimContentHash(plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">): string {
  const payload = [CLAIM_GATE_VERSION, ...segments(plan).map(normalizeClaimText)].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export interface ConfirmedFactProof {
  readonly memoryId: string;
  readonly statement: string;
  readonly category: string;
  readonly allowedForMarketing: boolean;
  readonly authoritative: boolean;
  readonly status: string;
}

export function supportConfirmedByProofs(
  memories: readonly MemoryRecord[],
  organizationId: string,
  proofs: readonly ConfirmedFactProof[],
): readonly ClaimSupport[] {
  const byId = new Map(
    proofs
      .filter((proof) => proof.authoritative && proof.status === "VERIFIED")
      .map((proof) => [proof.memoryId, proof]),
  );
  return supportFromMemories(memories, organizationId).flatMap((item) => {
    const proof = byId.get(item.id);
    if (!proof || factStatementHash(proof.statement) !== item.contentHash) return [];
    const prohibited = proof.category === "PROHIBITED_CLAIM"
      || proof.allowedForMarketing === false
      || (proof.category === "BRAND_RULE" && /keine|nicht|must not|do not|nicht verwenden/i.test(proof.statement));
    return [{
      ...item,
      text: proof.statement,
      prohibited,
      contentHash: factStatementHash(proof.statement),
    }];
  });
}

export function factStatementHash(statement: string): string {
  return createHash("sha256").update(normalizeClaimText(statement)).digest("hex");
}

export function factContextRefs(support: readonly ClaimSupport[]): readonly FactContextRef[] {
  return [...support]
    .map((item) => ({
      id: item.id,
      status: item.status,
      updatedAt: item.updatedAt,
      contentHash: item.contentHash,
      prohibited: item.prohibited,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function factContextHash(refs: readonly FactContextRef[], organizationName = ""): string {
  const payload = [
    normalizeClaimText(organizationName),
    ...refs.map((item) => [item.id, item.status, item.updatedAt, item.contentHash, item.prohibited ? "prohibited" : "allowed"].join("|")),
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function claimGateCheckId(draftHashValue: string, factsHash: string): string {
  return createHash("sha256").update([CLAIM_GATE_VERSION, draftHashValue, factsHash].join("\n")).digest("hex");
}

export function claimGateIdempotencyKey(organizationId: string, planId: string, checkId: string): string {
  return `claimgate:${CLAIM_GATE_VERSION}:${organizationId}:${planId}:${checkId}`;
}

export interface StoredClaimGateCheck {
  readonly organizationId: string;
  readonly planId: string;
  readonly result: string;
  readonly version: string;
  readonly draftHash: string;
  readonly factContextHash: string;
  readonly checkId: string;
  readonly invalidated: boolean;
}

export function assessClaimGateApproval(input: {
  readonly organizationId: string;
  readonly planId: string;
  readonly draftHash: string;
  readonly factContextHash: string;
  readonly stored: StoredClaimGateCheck | null;
  readonly clientClaimGatePassed?: unknown;
  readonly clientDraftHash?: unknown;
  readonly clientFactContextHash?: unknown;
}): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  void input.clientClaimGatePassed;
  void input.clientDraftHash;
  void input.clientFactContextHash;
  const stored = input.stored;
  const expectedId = claimGateCheckId(input.draftHash, input.factContextHash);
  if (!stored || stored.invalidated) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.organizationId !== input.organizationId) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.planId !== input.planId) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.version !== CLAIM_GATE_VERSION) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.result !== "PASS") return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.draftHash !== input.draftHash) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.factContextHash !== input.factContextHash) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (stored.checkId !== expectedId) return { ok: false, error: CLAIM_GATE_RECHECK_MESSAGE };
  return { ok: true };
}

export function evaluateMarketingClaims(input: {
  readonly plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">;
  readonly support: readonly ClaimSupport[];
  readonly organizationName?: string;
}): ClaimGateEvaluation {
  const allowed = input.support.filter((item) => !item.prohibited);
  const prohibited = input.support.filter((item) => item.prohibited);
  const factTokens = factCorpus(allowed.map((item) => item.text));
  const corpus = factCorpus([
    ...allowed.map((item) => item.text),
    input.plan.offer,
    input.organizationName ?? "",
  ]);
  const topics = [...new Set(prohibited.flatMap((item) => prohibitedTopics(item.text)))];
  const claims: CheckedClaim[] = segments(input.plan).map((text) => {
    const words = contentTokens(text);
    const supportFactIds = allowed
      .filter((item) => contentTokens(item.text).some((token) => words.includes(token)))
      .map((item) => item.id);
    if (hitsProhibited(text, topics, prohibited.map((item) => item.text))) {
      return {
        text,
        kind: "PROHIBITED_CLAIM" as const,
        supportFactIds: prohibited.map((item) => item.id),
        customerReason: "This statement conflicts with a rule you confirmed.",
      };
    }
    if (markers(text, factTokens).length > 0) {
      return {
        text,
        kind: "UNSUPPORTED_FACT" as const,
        supportFactIds: [],
        customerReason: "This statement is not supported by a verified business fact.",
      };
    }
    const covered = words.filter((token) => {
      if (corpus.has(token)) return true;
      if (token.length < 5) return false;
      for (const known of corpus) {
        if (known.length >= 5 && (known.startsWith(token) || token.startsWith(known))) return true;
      }
      return false;
    }).length;
    if (words.length > 0 && covered / words.length >= 0.6) {
      return { text, kind: "SUPPORTED_FACT" as const, supportFactIds, customerReason: null };
    }
    if (words.length === 0 || isInvitation(text)) {
      return {
        text,
        kind: words.length === 0 ? "OPINION_OR_STYLE" as const : "MARKETING_PERSUASION" as const,
        supportFactIds: [],
        customerReason: null,
      };
    }
    return {
      text,
      kind: "UNSUPPORTED_FACT" as const,
      supportFactIds: [],
      customerReason: "This statement is not supported by a verified business fact.",
    };
  });
  const result: ClaimGateDecision = claims.some((claim) => claim.kind === "PROHIBITED_CLAIM")
    ? "BLOCKED"
    : claims.some((claim) => claim.kind === "UNSUPPORTED_FACT")
      ? "EDIT_REQUIRED"
      : "PASS";
  const supportFactIds = [...new Set(claims.flatMap((claim) => claim.kind === "SUPPORTED_FACT" ? claim.supportFactIds : []))];
  return {
    version: CLAIM_GATE_VERSION,
    result,
    contentHash: claimContentHash(input.plan),
    supportFactIds,
    claims,
    customerMessage: result === "PASS"
      ? "Claims checked."
      : "Some statements need your attention.",
  };
}

export function claimGateAllowsStore(result: ClaimGateDecision): boolean {
  return result === "PASS";
}
