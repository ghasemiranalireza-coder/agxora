import { describe, expect, it } from "vitest";
import {
  LANGUAGE_GUIDANCE,
  assemblePrompt,
} from "./prompt/assemblePrompt";

describe("chat language guidance", () => {
  it("includes Persian, German, and English reply instructions", () => {
    expect(LANGUAGE_GUIDANCE).toMatch(/Persian/i);
    expect(LANGUAGE_GUIDANCE).toMatch(/German/i);
    expect(LANGUAGE_GUIDANCE).toMatch(/English/i);

    const assembled = assemblePrompt({
      organization: { organizationId: null, workspaceId: null },
      conversation: [],
      userPrompt: "سلام، حالت چطوره؟",
    });

    expect(assembled.systemPrompt).toContain(LANGUAGE_GUIDANCE);
    expect(assembled.userPrompt).toBe("سلام، حالت چطوره؟");
  });
});
