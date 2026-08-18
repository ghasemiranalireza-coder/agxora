import type { GrowthBusinessProfile } from "../growth/types";
import { createGrowthId } from "../growth/ids";
import type { WebsitePage, WebsitePageKind } from "./types";

export interface WebsitePlanBlueprint {
  readonly pages: readonly {
    readonly kind: WebsitePageKind;
    readonly slug: string;
    readonly title: string;
  }[];
}

function displayName(profile: GrowthBusinessProfile): string {
  const name = profile.companyName.trim();
  return name.length > 0 ? name : "AGXORA";
}

export function planWebsitePages(
  profile: GrowthBusinessProfile,
): WebsitePlanBlueprint {
  const pages: WebsitePlanBlueprint["pages"][number][] = [
    { kind: "home", slug: "home", title: displayName(profile) },
    { kind: "about", slug: "about", title: "About" },
    { kind: "services", slug: "services", title: "Services" },
    { kind: "contact", slug: "contact", title: "Contact" },
  ];

  if (profile.products.length > 0) {
    pages.splice(3, 0, {
      kind: "custom",
      slug: "products",
      title: "Products",
    });
  }

  const type = (profile.businessType ?? profile.industry ?? "").toLowerCase();
  if (type.includes("restaurant") || type.includes("hotel")) {
    pages.splice(3, 0, { kind: "custom", slug: "menu", title: "Menu" });
  }
  if (type.includes("cleaning") || type.includes("consulting")) {
    pages.splice(pages.length - 1, 0, {
      kind: "custom",
      slug: "pricing",
      title: "Pricing",
    });
  }

  return { pages };
}

export function createEmptyPage(
  kind: WebsitePageKind,
  slug: string,
  title: string,
): WebsitePage {
  return {
    id: createGrowthId("wpage"),
    slug,
    title,
    kind,
    sections: [],
  };
}
