/**
 * AI context packet assembled for every generation.
 */

import type { MemoryContextPacket } from "../memory/MemoryTypes";

export interface AIOrganizationSlice {
  readonly organizationId: string | null;
  readonly workspaceId: string | null;
  readonly companyName?: string;
  readonly businessType?: string;
  readonly country?: string;
  readonly language?: string;
  readonly timezone?: string;
}

export interface AIBusinessSlice {
  readonly templateId?: string;
  readonly templateSummary?: string;
  readonly reasoningDomains?: readonly string[];
  readonly goals?: readonly string[];
  readonly departments?: readonly string[];
  readonly employees?: readonly string[];
  readonly customers?: readonly string[];
  readonly projects?: readonly string[];
  readonly files?: readonly string[];
  readonly kpis?: readonly string[];
  readonly modules?: readonly string[];
  readonly agents?: readonly string[];
}

export interface AIKnowledgeSlice {
  readonly entries: readonly {
    readonly title: string;
    readonly content: string;
  }[];
}

export interface AIMessageSlice {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly name?: string;
}

export interface AIRuntimeContext {
  readonly organization: AIOrganizationSlice;
  readonly business?: AIBusinessSlice;
  readonly memory?: MemoryContextPacket;
  readonly knowledge?: AIKnowledgeSlice;
  readonly conversation: readonly AIMessageSlice[];
  readonly systemPrompt?: string;
  readonly userPrompt: string;
  readonly toolResults?: readonly {
    readonly toolName: string;
    readonly result: string;
  }[];
}
