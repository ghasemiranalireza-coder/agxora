import { describe, expect, it } from "vitest";
import {
  firstUnsupportedCampaignProvider,
  firstUnsupportedRequestedChannel,
  isExecutableCampaignProvider,
  supportedCampaignChannels,
  unsupportedCampaignProviderMessage,
} from "./campaign-providers";

describe("campaign provider eligibility", () => {
  it("treats Gmail and YouTube as executable and LinkedIn/Instagram as not", () => {
    expect(isExecutableCampaignProvider("email_gmail")).toBe(true);
    expect(isExecutableCampaignProvider("youtube")).toBe(true);
    expect(isExecutableCampaignProvider("linkedin")).toBe(false);
    expect(isExecutableCampaignProvider("instagram")).toBe(false);
  });

  it("does not create Instagram or LinkedIn campaign items", () => {
    expect(
      firstUnsupportedCampaignProvider([
        { provider: "instagram" },
        { provider: "youtube" },
      ]),
    ).toBe("instagram");
    expect(firstUnsupportedCampaignProvider([{ provider: "youtube" }])).toBeNull();
    expect(unsupportedCampaignProviderMessage("linkedin")).toMatch(/not available/i);
    expect(unsupportedCampaignProviderMessage("linkedin")).toMatch(/Nothing was created/i);
  });

  it("drops unsupported channels from a social campaign request", () => {
    expect(supportedCampaignChannels(["instagram", "youtube", "x", "youtube"])).toEqual([
      "youtube",
    ]);
    expect(firstUnsupportedRequestedChannel(["instagram", "x"])).toBe("instagram");
    expect(firstUnsupportedRequestedChannel(["youtube"])).toBeNull();
  });
});
