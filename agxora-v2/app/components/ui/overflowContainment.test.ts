import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function css(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("UI text containment", () => {
  const enterprise = css("app/components/ui/enterprise.css");
  const landing = css("app/components/landing/landing.css");
  const dashboard = css("app/components/dashboard/dashboard.css");

  it("does not use a global break-all hammer", () => {
    expect(enterprise).not.toMatch(/\*\s*\{[^}]*word-break:\s*break-all/);
    expect(landing).not.toMatch(/\*\s*\{[^}]*word-break:\s*break-all/);
    expect(dashboard).not.toMatch(/\*\s*\{[^}]*word-break:\s*break-all/);
  });

  it("lets design-system cards and buttons wrap inside their boxes", () => {
    expect(enterprise).toMatch(/\.agx-ui-card[\s\S]*overflow-wrap:\s*anywhere/);
    expect(enterprise).toMatch(/\.agx-ui-btn[\s\S]*overflow-wrap:\s*anywhere/);
    expect(enterprise).toMatch(/\.agx-ui-badge[\s\S]*overflow-wrap:\s*anywhere/);
    expect(enterprise).toMatch(/\.agx-integrations__card[\s\S]*min-width:\s*0/);
  });

  it("keeps landing provider tiles and pipeline steps shrinkable", () => {
    expect(landing).toContain("minmax(min(100%, 220px), 1fr)");
    expect(landing).toMatch(/\.p31-connected__card[\s\S]*overflow-wrap:\s*anywhere/);
    expect(landing).toMatch(/\.p31-btn[\s\S]*overflow-wrap:\s*anywhere/);
    expect(landing).toMatch(/\.p31-agents__pipeline li[\s\S]*min-width:\s*0/);
  });

  it("keeps dashboard metric and snapshot grids from forcing overflow", () => {
    expect(dashboard).toContain("minmax(min(100%, 220px), 1fr)");
    expect(dashboard).toMatch(/\.agx-metric-card[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it("lets finance document templates wrap without forcing page overflow", () => {
    const documents = css("app/components/finance/documents/document.css");
    expect(documents).toContain("minmax(min(100%, 220px), 1fr)");
    expect(documents).toMatch(/\.agx-doc-settings[\s\S]*minmax\(0/);
    expect(documents).toMatch(/\.agx-doc__tablewrap[\s\S]*overflow-x:\s*auto/);
    expect(documents).toContain(".agx-doc--modern");
    expect(documents).toContain(".agx-doc--compact");
    expect(documents).toContain(".agx-doc--professional");
  });

  it("lets Finance tables scroll inside the page instead of crushing columns", () => {
    const finance = css("app/components/finance/core/finance.css");
    expect(finance).toContain("minmax(min(100%, 220px), 1fr)");
    expect(finance).toMatch(/\.agx-finance-core \.overflow-x-auto[\s\S]*overflow-x:\s*auto/);
    expect(finance).toMatch(/overflow-x:\s*clip/);
    expect(finance).toMatch(/table\.agx-ui-table[\s\S]*min-width:\s*52rem/);
    expect(finance).not.toMatch(
      /\.agx-finance-core table,\s*\.agx-finance-core td,\s*\.agx-finance-core th[\s\S]*min-width:\s*0/,
    );
  });
});
