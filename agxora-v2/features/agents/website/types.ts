import type { ApprovalState } from "../types";

export type WebsiteSectionType =
  | "hero"
  | "text"
  | "image"
  | "featureGrid"
  | "services"
  | "testimonials"
  | "cta"
  | "contact"
  | "faq"
  | "footer";

export type WebsitePageKind =
  | "home"
  | "about"
  | "services"
  | "contact"
  | "custom";

export type WebsiteProjectStatus =
  | "DRAFT"
  | "GENERATING"
  | "PREVIEW"
  | "NEEDS_CHANGES"
  | "READY"
  | "APPROVED"
  | "PUBLISHED"
  | "FAILED";

export interface WebsiteSection {
  readonly id: string;
  readonly type: WebsiteSectionType;
  readonly heading?: string;
  readonly body?: string;
  readonly items?: readonly string[];
  readonly ctaLabel?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface WebsitePage {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly kind: WebsitePageKind;
  readonly sections: readonly WebsiteSection[];
}

export interface WebsiteMetadata {
  readonly title: string;
  readonly description: string;
}

export interface WebsitePublishResult {
  readonly available: boolean;
  readonly status: "unavailable" | "published" | "failed";
  readonly published: boolean;
  readonly reason?: string;
  readonly externalId?: string;
}

export interface WebsiteProject {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly status: WebsiteProjectStatus;
  readonly name: string;
  readonly navigation: readonly string[];
  readonly pages: readonly WebsitePage[];
  readonly metadata: WebsiteMetadata;
  readonly executionId?: string;
  readonly taskId?: string;
  readonly approvalState?: ApprovalState;
  readonly publishResult?: WebsitePublishResult;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WebsiteGenerationRequest {
  readonly organizationId: string;
  readonly profileId: string;
  readonly projectId?: string;
}

export interface WebsiteGenerationResult {
  readonly project: WebsiteProject;
  readonly generated: boolean;
}
