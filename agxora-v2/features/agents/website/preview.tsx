"use client";

import type { JSX } from "react";
import { Badge } from "@/app/components/ui";
import { catalogCopy, useT } from "@/app/lib/i18n";
import type { WebsitePage, WebsiteProject, WebsiteSection } from "./types";

function sectionCopy(section: WebsiteSection): { heading: string; body: string } {
  return {
    heading: section.heading ?? "",
    body: section.body ?? "",
  };
}

function PreviewSection({ section }: { readonly section: WebsiteSection }): JSX.Element {
  const t = useT();
  const copy = sectionCopy(section);
  return (
    <section
      className="space-y-2 rounded-2xl border px-4 py-4"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
      >
        {catalogCopy(t, `agents.growth.sections.${section.type}`, section.type)}
      </p>
      {copy.heading ? (
        <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {copy.heading}
        </h3>
      ) : null}
      {copy.body ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {copy.body}
        </p>
      ) : null}
      {section.items && section.items.length > 0 ? (
        <ul className="list-disc space-y-1 ps-5 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.ctaLabel ? (
        <span
          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "var(--agx-accent, #22d3ee)",
            color: "#041016",
          }}
        >
          {section.ctaLabel}
        </span>
      ) : null}
    </section>
  );
}

function PreviewPage({ page }: { readonly page: WebsitePage }): JSX.Element {
  const t = useT();
  return (
    <article className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {page.title}
        </h2>
        <Badge>
          {catalogCopy(t, `agents.growth.pages.${page.kind}`, page.kind)}
        </Badge>
      </div>
      <div className="grid gap-3">
        {page.sections.map((section) => (
          <PreviewSection key={section.id} section={section} />
        ))}
      </div>
    </article>
  );
}

export function WebsitePreview({
  project,
}: {
  readonly project: WebsiteProject;
}): JSX.Element {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">{t("agents.growth.previewBadge")}</Badge>
        <Badge>
          {catalogCopy(t, `agents.growth.websiteStatus.${project.status}`, project.status)}
        </Badge>
        {project.publishResult && !project.publishResult.available ? (
          <Badge tone="warning">{t("agents.growth.publishingNotConfigured")}</Badge>
        ) : null}
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {project.navigation.map((item) => (
          <span
            key={item}
            className="rounded-full border px-3 py-1"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              color: "var(--agx-text, #f8fafc)",
            }}
          >
            {item}
          </span>
        ))}
      </nav>
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {project.metadata.description}
      </p>
      <div className="space-y-8">
        {project.pages.map((page) => (
          <PreviewPage key={page.id} page={page} />
        ))}
      </div>
    </div>
  );
}
