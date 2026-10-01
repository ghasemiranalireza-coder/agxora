import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(process.cwd(), "app/components/landing/landing.css"),
  "utf8",
);

describe("landing mobile layout", () => {
  it("keeps short phone hero chips in a wrapping grid instead of one cropped row", () => {
    const shortPhone = css.match(
      /@media \(max-width: 430px\) and \(max-height: 740px\) \{[\s\S]*?\n\}/,
    );
    expect(shortPhone?.[0]).toBeTruthy();
    expect(shortPhone?.[0]).not.toContain("flex-wrap: nowrap");
    expect(shortPhone?.[0]).not.toContain("overflow-x: auto");
    expect(shortPhone?.[0]).not.toContain("line-clamp");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });
});
