import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import type {
  SocialCalendarEntry,
  SocialContentCalendar,
  SocialContentType,
  SocialStrategy,
} from "./types";

const WEEKDAY_SLOTS = [
  { offset: 0, time: "09:00", type: "POST" as const, pillarIndex: 0 },
  { offset: 1, time: "11:00", type: "STORY" as const, pillarIndex: 1 },
  { offset: 2, time: "18:00", type: "POST" as const, pillarIndex: 2 },
  { offset: 3, time: "10:00", type: "STORY" as const, pillarIndex: 3 },
  { offset: 4, time: "16:00", type: "POST" as const, pillarIndex: 0 },
  { offset: 5, time: "12:00", type: "STORY" as const, pillarIndex: 1 },
  { offset: 6, time: "15:00", type: "POST" as const, pillarIndex: 3 },
] as const;

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekStartFrom(iso: string): string {
  const date = new Date(iso);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utc).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(utc);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

export function generateContentCalendar(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
  readonly strategy: SocialStrategy;
  readonly weekStart?: string;
}): SocialContentCalendar {
  const weekStart = input.weekStart ?? weekStartFrom(input.profile.createdAt);
  const platforms = input.strategy.recommendedPlatforms;
  const services = input.profile.services.length
    ? input.profile.services
    : ["core offering"];
  const company = input.profile.companyName.trim() || "the business";
  const cta = input.strategy.ctaStrategy;

  const entries: SocialCalendarEntry[] = WEEKDAY_SLOTS.map((slot, index) => {
    const pillar = input.strategy.pillars[slot.pillarIndex % input.strategy.pillars.length];
    const platform = platforms[index % platforms.length];
    const service = services[index % services.length];
    const topic = `${pillar.name}: ${service}`;
    const contentType: Extract<SocialContentType, "POST" | "STORY"> = slot.type;
    return {
      id: createGrowthId("cal"),
      date: addDays(weekStart, slot.offset),
      time: slot.time,
      platform,
      contentType,
      topic,
      pillar: pillar.name,
      caption: `${company} · ${topic}. ${input.profile.uniqueSellingProposition ?? ""}`.trim(),
      cta,
      status: "PLANNED",
    };
  });

  const now = nowIso();
  return {
    id: createGrowthId("scal"),
    organizationId: input.organizationId,
    profileId: input.profile.id,
    strategyId: input.strategy.id,
    weekStart,
    entries,
    createdAt: now,
    updatedAt: now,
  };
}
