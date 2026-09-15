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
});
