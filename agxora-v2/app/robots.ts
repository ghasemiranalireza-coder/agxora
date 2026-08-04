import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_AGXORA_SITE_URL ?? "https://agxora.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/demo", "/contact-sales", "/login", "/register"],
        disallow: ["/dashboard", "/workspace", "/api/", "/welcome", "/onboarding"],
      },
    ],
    sitemap: `${SITE.replace(/\/$/, "")}/sitemap.xml`,
    host: SITE.replace(/\/$/, ""),
  };
}
