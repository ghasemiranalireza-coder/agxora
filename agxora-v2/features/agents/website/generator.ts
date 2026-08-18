import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId, nowIso } from "../growth/ids";
import { planWebsitePages } from "./planner";
import type {
  WebsitePage,
  WebsiteProject,
  WebsiteSection,
  WebsiteSectionType,
} from "./types";

function nameOf(profile: GrowthBusinessProfile): string {
  const name = profile.companyName.trim();
  return name.length > 0 ? name : "AGXORA";
}

function industryOf(profile: GrowthBusinessProfile): string {
  return (
    profile.industry?.trim() ||
    profile.businessType?.trim() ||
    "professional services"
  );
}

function audienceOf(profile: GrowthBusinessProfile): string {
  return profile.targetAudience?.trim() || "local customers";
}

function uspOf(profile: GrowthBusinessProfile): string {
  return (
    profile.uniqueSellingProposition?.trim() ||
    `Reliable ${industryOf(profile)} for ${audienceOf(profile)}.`
  );
}

function servicesOf(profile: GrowthBusinessProfile): readonly string[] {
  if (profile.services.length > 0) return profile.services;
  return ["Core service", "Consultation", "Follow-up support"];
}

function toneOf(profile: GrowthBusinessProfile): string {
  return profile.brandTone ?? profile.brand.tone;
}

function section(
  type: WebsiteSectionType,
  heading: string,
  body: string,
  extras?: Partial<WebsiteSection>,
): WebsiteSection {
  return {
    id: createGrowthId("wsec"),
    type,
    heading,
    body,
    ...extras,
  };
}

function buildHome(profile: GrowthBusinessProfile): WebsitePage {
  const company = nameOf(profile);
  const services = servicesOf(profile);
  return {
    id: createGrowthId("wpage"),
    slug: "home",
    title: company,
    kind: "home",
    sections: [
      section(
        "hero",
        company,
        profile.description?.trim() ||
          `${company} helps ${audienceOf(profile)} with ${industryOf(profile)}.`,
        {
          ctaLabel: profile.websiteGoal?.trim() || "Get started",
          metadata: { tone: toneOf(profile) },
        },
      ),
      section("featureGrid", uspOf(profile), "Why customers choose this team.", {
        items: services.slice(0, 4),
      }),
      section("services", "What we offer", "Structured service overview.", {
        items: services,
      }),
      section(
        "testimonials",
        "Customer proof",
        `Teams in ${profile.country?.trim() || "the local market"} trust ${company}.`,
        { items: [`${audienceOf(profile)} · recommended`] },
      ),
      section(
        "cta",
        "Next step",
        profile.websiteGoal?.trim() || "Request a consultation.",
        { ctaLabel: "Contact" },
      ),
      section("footer", company, profile.businessHours?.trim() || "By appointment"),
    ],
  };
}

function buildAbout(profile: GrowthBusinessProfile): WebsitePage {
  const company = nameOf(profile);
  return {
    id: createGrowthId("wpage"),
    slug: "about",
    title: "About",
    kind: "about",
    sections: [
      section(
        "hero",
        `About ${company}`,
        profile.description?.trim() ||
          `${company} is building a trusted ${industryOf(profile)} brand.`,
      ),
      section("text", "Positioning", uspOf(profile), {
        items: profile.brandKeywords.length
          ? profile.brandKeywords
          : [toneOf(profile), industryOf(profile)],
      }),
      section("image", "Visual direction", profile.visualPreferences?.trim() || toneOf(profile)),
      section("footer", company, profile.country?.trim() || ""),
    ],
  };
}

function buildServices(profile: GrowthBusinessProfile): WebsitePage {
  const services = servicesOf(profile);
  const products = profile.products.length > 0 ? profile.products : services;
  return {
    id: createGrowthId("wpage"),
    slug: "services",
    title: "Services",
    kind: "services",
    sections: [
      section("hero", "Services", `Offers designed for ${audienceOf(profile)}.`),
      section("services", "Service catalog", uspOf(profile), { items: services }),
      section("featureGrid", "How we work", "Clear scope, delivery, and follow-up.", {
        items: products.slice(0, 4),
      }),
      section("faq", "Questions", "Common planning questions.", {
        items: [
          `Who is this for? ${audienceOf(profile)}.`,
          `What is the focus? ${industryOf(profile)}.`,
        ],
      }),
      section("cta", "Start a project", profile.websiteGoal?.trim() || "Book a call.", {
        ctaLabel: "Contact",
      }),
      section("footer", nameOf(profile), ""),
    ],
  };
}

function buildContact(profile: GrowthBusinessProfile): WebsitePage {
  const contact = profile.contactInformation;
  return {
    id: createGrowthId("wpage"),
    slug: "contact",
    title: "Contact",
    kind: "contact",
    sections: [
      section(
        "hero",
        "Contact",
        contact?.address || profile.country || "Reach the team to discuss next steps.",
      ),
      section("contact", "Details", profile.businessHours?.trim() || "Business hours on request", {
        items: [
          contact?.email || "email@pending.local",
          contact?.phone || "",
          contact?.website || "",
        ].filter((item) => item.length > 0),
      }),
      section("cta", "Ready when you are", uspOf(profile), { ctaLabel: "Send message" }),
      section("footer", nameOf(profile), profile.primaryLanguage || "en"),
    ],
  };
}

function buildCustom(
  profile: GrowthBusinessProfile,
  slug: string,
  title: string,
): WebsitePage {
  const items =
    slug === "products"
      ? profile.products
      : slug === "pricing"
        ? servicesOf(profile)
        : servicesOf(profile);
  return {
    id: createGrowthId("wpage"),
    slug,
    title,
    kind: "custom",
    sections: [
      section("hero", title, `${nameOf(profile)} · ${industryOf(profile)}`),
      section("text", title, uspOf(profile), { items }),
      section("cta", "Learn more", profile.websiteGoal?.trim() || "Contact the team.", {
        ctaLabel: "Contact",
      }),
      section("footer", nameOf(profile), ""),
    ],
  };
}

export function generateWebsiteProject(input: {
  readonly organizationId: string;
  readonly profile: GrowthBusinessProfile;
  readonly projectId?: string;
}): WebsiteProject {
  const plan = planWebsitePages(input.profile);
  const pages = plan.pages.map((page) => {
    if (page.kind === "home") return buildHome(input.profile);
    if (page.kind === "about") return buildAbout(input.profile);
    if (page.kind === "services") return buildServices(input.profile);
    if (page.kind === "contact") return buildContact(input.profile);
    return buildCustom(input.profile, page.slug, page.title);
  });
  const now = nowIso();
  const company = nameOf(input.profile);
  return {
    id: input.projectId ?? createGrowthId("wproj"),
    organizationId: input.organizationId,
    profileId: input.profile.id,
    status: "PREVIEW",
    name: company,
    navigation: pages.map((page) => page.title),
    pages,
    metadata: {
      title: company,
      description:
        input.profile.description?.trim() ||
        `${company} ${industryOf(input.profile)} website preview.`,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function requiredPageKinds(
  project: WebsiteProject,
): readonly WebsitePage["kind"][] {
  return project.pages.map((page) => page.kind);
}
