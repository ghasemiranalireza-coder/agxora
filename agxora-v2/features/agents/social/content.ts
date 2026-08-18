import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import type {
  SocialContentCalendar,
  SocialContentItem,
  SocialStrategy,
} from "./types";

function hashtagsFor(
  profile: GrowthBusinessProfile,
  platform: string,
): readonly string[] {
  const industry =
    profile.industry?.replace(/\s+/g, "") ||
    profile.businessType?.replace(/\s+/g, "") ||
    "business";
  const keywords = profile.brandKeywords.slice(0, 2).map((word) =>
    word.replace(/\s+/g, ""),
  );
  return [`#${industry}`, `#${platform}`, ...keywords.map((word) => `#${word}`)];
}

export function generateSocialContent(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
  readonly strategy: SocialStrategy;
  readonly calendar: SocialContentCalendar;
}): readonly SocialContentItem[] {
  const now = nowIso();
  const visual = input.profile.visualPreferences?.trim() ||
    input.profile.brandTone ||
    input.profile.brand.tone;

  return input.calendar.entries.map((entry) => ({
    id: createGrowthId("scontent"),
    organizationId: input.organizationId,
    profileId: input.profile.id,
    calendarId: input.calendar.id,
    platform: entry.platform,
    contentType: entry.contentType,
    title: entry.topic,
    topic: entry.topic,
    caption: entry.caption,
    cta: entry.cta,
    hashtags: hashtagsFor(input.profile, entry.platform),
    visualDirection: visual,
    pillar: entry.pillar,
    scheduledAt: `${entry.date}T${entry.time}:00.000Z`,
    status: "DRAFT",
    generatedBy: "social_media",
    createdAt: now,
    updatedAt: now,
  }));
}
