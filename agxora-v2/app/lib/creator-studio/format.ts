import type { ContentFormat, MediaKind, PublishStatus, IntegrationStatus } from "./types";

export function formatLabel(format: ContentFormat): string {
  const map: Record<ContentFormat, string> = {
    instagram_caption: "Instagram Caption",
    tiktok_script: "TikTok Script",
    linkedin_post: "LinkedIn Post",
    facebook_post: "Facebook Post",
    x_post: "X Post",
    blog_article: "Blog Article",
    newsletter: "Newsletter",
    email_campaign: "Email Campaign",
    product_description: "Product Description",
    ad_copy: "Ad Copy",
    seo_article: "SEO Article",
    landing_page_copy: "Landing Page Copy",
  };
  return map[format];
}

export function publishStatusLabel(status: PublishStatus): string {
  const map: Record<PublishStatus, string> = {
    draft: "Draft",
    review: "Review",
    approved: "Approved",
    scheduled: "Scheduled",
    published: "Published",
    archive: "Archive",
  };
  return map[status];
}

export function mediaKindLabel(kind: MediaKind): string {
  const map: Record<MediaKind, string> = {
    image: "Image",
    video: "Video",
    document: "Document",
    logo: "Brand Logo",
    template: "Template",
  };
  return map[kind];
}

export function integrationLabel(status: IntegrationStatus): string {
  const map: Record<IntegrationStatus, string> = {
    planned: "Planned",
    ready: "Ready",
    connected: "Connected",
    disabled: "Disabled",
  };
  return map[status];
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
