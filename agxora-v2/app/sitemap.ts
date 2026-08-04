import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_AGXORA_SITE_URL ?? "https://agxora.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.replace(/\/$/, "");
  const now = new Date();

  const paths: ReadonlyArray<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/demo", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact-sales", changeFrequency: "monthly", priority: 0.7 },
    { path: "/register", changeFrequency: "monthly", priority: 0.8 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  ];

  return paths.map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
