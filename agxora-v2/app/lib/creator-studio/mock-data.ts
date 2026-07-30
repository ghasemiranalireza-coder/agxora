import type {
  AnalyticsMetric,
  BrandVoiceOption,
  CalendarItem,
  CampaignPlan,
  ContentFormatOption,
  CreatorKpiMetric,
  MediaAsset,
  QueueItem,
  TopPost,
} from "./types";

export const CREATOR_KPI_METRICS: readonly CreatorKpiMetric[] = [
  {
    id: "content",
    label: "Content Created",
    value: "246",
    caption: "This quarter",
    delta: { value: "+38", positive: true },
  },
  {
    id: "campaigns",
    label: "Campaigns",
    value: "18",
    caption: "Active + planned",
    delta: { value: "+3", positive: true },
  },
  {
    id: "scheduled",
    label: "Scheduled Posts",
    value: "42",
    caption: "Next 14 days",
    delta: { value: "+9", positive: true },
  },
  {
    id: "engagement",
    label: "Engagement",
    value: "4.8%",
    caption: "Avg rate across channels",
    delta: { value: "+0.6%", positive: true },
  },
  {
    id: "followers",
    label: "Followers Growth",
    value: "+12.4k",
    caption: "Last 30 days",
    delta: { value: "+18%", positive: true },
  },
  {
    id: "reach",
    label: "Reach",
    value: "1.86M",
    caption: "Unique impressions",
    delta: { value: "+11%", positive: true },
  },
  {
    id: "conversions",
    label: "Conversions",
    value: "3,204",
    caption: "Attributed actions",
    delta: { value: "+7.2%", positive: true },
  },
  {
    id: "ai-score",
    label: "AI Performance Score",
    value: "88 / 100",
    caption: "Content quality signal",
    delta: { value: "+4", positive: true },
  },
];

export const CONTENT_FORMATS: readonly ContentFormatOption[] = [
  {
    id: "instagram_caption",
    label: "Instagram Caption",
    description: "Feed / Reels captions with CTA hooks.",
  },
  {
    id: "tiktok_script",
    label: "TikTok Script",
    description: "Hook → value → CTA short-form scripts.",
  },
  {
    id: "linkedin_post",
    label: "LinkedIn Post",
    description: "Thought leadership and B2B narratives.",
  },
  {
    id: "facebook_post",
    label: "Facebook Post",
    description: "Community and page-ready posts.",
  },
  {
    id: "x_post",
    label: "X Post",
    description: "Concise threads and single posts.",
  },
  {
    id: "blog_article",
    label: "Blog Article",
    description: "Long-form editorial drafts.",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description: "Email newsletter sections and subject lines.",
  },
  {
    id: "email_campaign",
    label: "Email Campaign",
    description: "Campaign sequences and nurture copy.",
  },
  {
    id: "product_description",
    label: "Product Description",
    description: "Commerce-ready product narratives.",
  },
  {
    id: "ad_copy",
    label: "Ad Copy",
    description: "Paid social and search ad variants.",
  },
  {
    id: "seo_article",
    label: "SEO Article",
    description: "Search-intent articles with outline structure.",
  },
  {
    id: "landing_page_copy",
    label: "Landing Page Copy",
    description: "Hero, benefits, proof, and CTA blocks.",
  },
];

export const BRAND_VOICES: readonly BrandVoiceOption[] = [
  {
    id: "professional",
    label: "Professional",
    description: "Clear, credible, business-first tone.",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Refined, sparse, premium framing.",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm, approachable, conversational.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Short sentences, high clarity.",
  },
  {
    id: "corporate",
    label: "Corporate",
    description: "Formal enterprise communications.",
  },
  {
    id: "creative",
    label: "Creative",
    description: "Expressive storytelling for campaigns.",
  },
  {
    id: "custom",
    label: "Custom Brand Voice",
    description: "Upload guidelines and sample copy later.",
  },
];

export const CAMPAIGNS: readonly CampaignPlan[] = [
  {
    id: "camp-1",
    name: "Q3 Product Launch",
    objective: "Awareness + waitlist signups",
    audience: "EU SMB operators",
    platforms: ["LinkedIn", "Instagram", "Email"],
    budgetPlaceholder: "€8,500 (placeholder)",
    timeline: "Aug 4 – Sep 12",
    status: "Active",
  },
  {
    id: "camp-2",
    name: "Creator Collab Sprint",
    objective: "Reach + community growth",
    audience: "Creators 18–34 DE/AT",
    platforms: ["TikTok", "Instagram", "YouTube"],
    budgetPlaceholder: "€4,200 (placeholder)",
    timeline: "Jul 20 – Aug 20",
    status: "In review",
  },
  {
    id: "camp-3",
    name: "Agency Portfolio Push",
    objective: "Lead generation",
    audience: "Marketing directors",
    platforms: ["LinkedIn", "X", "Newsletter"],
    budgetPlaceholder: "€2,900 (placeholder)",
    timeline: "Sep 1 – Sep 30",
    status: "Planned",
  },
];

export const CONTENT_CALENDAR: readonly CalendarItem[] = [
  {
    id: "cal-1",
    date: "2026-08-01",
    title: "Launch teaser Reel",
    platform: "Instagram",
    status: "scheduled",
  },
  {
    id: "cal-2",
    date: "2026-08-02",
    title: "Founder LinkedIn narrative",
    platform: "LinkedIn",
    status: "approved",
  },
  {
    id: "cal-3",
    date: "2026-08-04",
    title: "Waitlist email #1",
    platform: "Email",
    status: "review",
  },
  {
    id: "cal-4",
    date: "2026-08-05",
    title: "TikTok demo script",
    platform: "TikTok",
    status: "draft",
  },
];

export const MEDIA_ASSETS: readonly MediaAsset[] = [
  {
    id: "media-1",
    name: "hero-product-dark.png",
    kind: "image",
    folder: "Campaigns / Q3 Launch",
    tags: ["hero", "product", "dark"],
    updatedAt: "2026-07-28",
  },
  {
    id: "media-2",
    name: "brand-mark.svg",
    kind: "logo",
    folder: "Brand Assets",
    tags: ["logo", "primary"],
    updatedAt: "2026-06-12",
  },
  {
    id: "media-3",
    name: "reel-cutdown-01.mp4",
    kind: "video",
    folder: "Campaigns / Q3 Launch",
    tags: ["reel", "teaser"],
    updatedAt: "2026-07-29",
  },
  {
    id: "media-4",
    name: "brand-guidelines.pdf",
    kind: "document",
    folder: "Brand Assets",
    tags: ["guidelines", "voice"],
    updatedAt: "2026-05-03",
  },
  {
    id: "media-5",
    name: "carousel-template.fig",
    kind: "template",
    folder: "Templates",
    tags: ["carousel", "instagram"],
    updatedAt: "2026-07-15",
  },
  {
    id: "media-6",
    name: "linkedin-banner.png",
    kind: "image",
    folder: "Brand Assets",
    tags: ["linkedin", "banner"],
    updatedAt: "2026-07-01",
  },
];

export const PUBLISHING_QUEUE: readonly QueueItem[] = [
  {
    id: "q-1",
    title: "Launch teaser Reel caption",
    platform: "Instagram",
    format: "instagram_caption",
    status: "scheduled",
    scheduledAt: "2026-08-01T09:00:00Z",
    author: "Maya R.",
  },
  {
    id: "q-2",
    title: "Founder narrative post",
    platform: "LinkedIn",
    format: "linkedin_post",
    status: "approved",
    scheduledAt: "2026-08-02T08:30:00Z",
    author: "Sara M.",
  },
  {
    id: "q-3",
    title: "Waitlist nurture email",
    platform: "Email",
    format: "email_campaign",
    status: "review",
    author: "Tom K.",
  },
  {
    id: "q-4",
    title: "Product landing hero copy",
    platform: "Web",
    format: "landing_page_copy",
    status: "draft",
    author: "Maya R.",
  },
  {
    id: "q-5",
    title: "TikTok demo script v2",
    platform: "TikTok",
    format: "tiktok_script",
    status: "draft",
    author: "Creative Desk",
  },
  {
    id: "q-6",
    title: "June recap carousel",
    platform: "Instagram",
    format: "instagram_caption",
    status: "published",
    scheduledAt: "2026-07-10T11:00:00Z",
    author: "Maya R.",
  },
  {
    id: "q-7",
    title: "Old promo thread",
    platform: "X",
    format: "x_post",
    status: "archive",
    author: "Tom K.",
  },
];

export const ANALYTICS_METRICS: readonly AnalyticsMetric[] = [
  { id: "a1", label: "Engagement", value: "4.8%", change: "+0.6%", positive: true },
  { id: "a2", label: "Reach", value: "1.86M", change: "+11%", positive: true },
  { id: "a3", label: "CTR", value: "2.4%", change: "+0.3%", positive: true },
  { id: "a4", label: "Conversions", value: "3,204", change: "+7.2%", positive: true },
  { id: "a5", label: "Audience Growth", value: "+12.4k", change: "+18%", positive: true },
  { id: "a6", label: "Content Performance", value: "88", change: "+4", positive: true },
];

export const TOP_POSTS: readonly TopPost[] = [
  {
    id: "tp-1",
    title: "Warehouse automation teardown",
    platform: "LinkedIn",
    engagement: "6.2%",
    reach: "84k",
  },
  {
    id: "tp-2",
    title: "30s product demo Reel",
    platform: "Instagram",
    engagement: "5.4%",
    reach: "210k",
  },
  {
    id: "tp-3",
    title: "Creator collab hook",
    platform: "TikTok",
    engagement: "7.1%",
    reach: "460k",
  },
];

export const AI_RECOMMENDATIONS: readonly string[] = [
  "Repurpose the LinkedIn teardown into a 3-part carousel this week.",
  "Schedule TikTok demos Tue–Thu 18:00–20:00 CET for higher completion.",
  "Tighten luxury brand voice on Instagram CTAs — shorten by ~20%.",
  "Translate top Reel caption into DE/FR for EU audience expansion.",
];

export const WORKSPACE_TABS = [
  { id: "create", label: "Create Content" },
  { id: "campaigns", label: "Campaigns" },
  { id: "media", label: "Media Library" },
  { id: "templates", label: "Templates" },
  { id: "brand", label: "Brand Assets" },
  { id: "queue", label: "Publishing Queue" },
  { id: "analytics", label: "Analytics" },
] as const;
