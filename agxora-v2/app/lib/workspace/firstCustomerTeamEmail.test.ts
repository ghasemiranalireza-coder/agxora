import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  HIDDEN_PRIMARY_NAV_HREFS,
  PRIMARY_NAV_ITEMS,
  isHiddenPrimaryNavHref,
} from "./firstCustomerSurface";
import {
  FIRST_CUSTOMER_TEAM_SETTINGS_HREF,
  LEGACY_EMAIL_HUB_HREF,
  LEGACY_TEAM_HREF,
  inviteDeliveryKind,
  inviteHonestyMessageKey,
  shouldShowManualInviteLink,
} from "./firstCustomerTeamEmail";

const ROOT = path.resolve(__dirname, "../../..");

describe("first-customer team + email path", () => {
  it("keeps production team on Settings and hides the legacy mock team route", () => {
    expect(FIRST_CUSTOMER_TEAM_SETTINGS_HREF).toBe("/dashboard/settings#team");
    expect(PRIMARY_NAV_ITEMS.some((item) => item.href === LEGACY_TEAM_HREF)).toBe(
      false,
    );
    expect(HIDDEN_PRIMARY_NAV_HREFS).toContain(LEGACY_TEAM_HREF);
    expect(isHiddenPrimaryNavHref("/dashboard/team")).toBe(true);
    expect(isHiddenPrimaryNavHref("/dashboard/settings")).toBe(false);
  });

  it("hides the Gmail email hub from the first-customer surface", () => {
    expect(PRIMARY_NAV_ITEMS.some((item) => item.href === LEGACY_EMAIL_HUB_HREF)).toBe(
      false,
    );
    expect(HIDDEN_PRIMARY_NAV_HREFS).toContain(LEGACY_EMAIL_HUB_HREF);
    expect(isHiddenPrimaryNavHref("/dashboard/email")).toBe(true);
  });

  it("redirects the legacy team page to Settings → Team", () => {
    const page = readFileSync(path.join(ROOT, "app/dashboard/team/page.tsx"), "utf8");
    expect(page).toContain("FIRST_CUSTOMER_TEAM_SETTINGS_HREF");
    expect(page).toContain("router.replace");
    expect(page).not.toContain("TeamWorkspace");
    expect(existsSync(path.join(ROOT, "app/components/team/TeamWorkspace.tsx"))).toBe(
      true,
    );
  });

  it("points IAM team management at the real Prisma team panel", () => {
    const text = readFileSync(
      path.join(ROOT, "features/auth/components/IamIdentityWorkspace.tsx"),
      "utf8",
    );
    expect(text).toContain("/dashboard/settings#team");
    expect(text).not.toContain('href="/dashboard/team"');
  });

  it("treats queued delivery as confirmed and omits the manual invite link", () => {
    expect(inviteDeliveryKind("queued")).toBe("queued");
    expect(inviteHonestyMessageKey("queued")).toBe(
      "settings.controlPlane.inviteQueued",
    );
    expect(shouldShowManualInviteLink("queued", "/invite/secret-token")).toBe(false);
  });

  it("shows a manual invite link only when the server did not queue email", () => {
    expect(inviteDeliveryKind("not_configured")).toBe("manual");
    expect(inviteHonestyMessageKey("not_configured")).toBe(
      "settings.controlPlane.inviteHonesty",
    );
    expect(shouldShowManualInviteLink("not_configured", "/invite/abc")).toBe(true);
    expect(shouldShowManualInviteLink("not_configured", undefined)).toBe(false);
    expect(inviteHonestyMessageKey(null)).toBe(
      "settings.controlPlane.inviteBeforeSend",
    );
  });

  it("does not put email secrets on the first-customer team/email client path", () => {
    const files = [
      "app/lib/workspace/firstCustomerTeamEmail.ts",
      "app/components/settings/control-plane/ControlPlanePanels.tsx",
      "app/dashboard/team/page.tsx",
      "app/forgot-password/page.tsx",
      "app/verify-email/page.tsx",
    ] as const;
    for (const file of files) {
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(text, file).not.toContain("RESEND_API_KEY");
      expect(text, file).not.toContain("POSTMARK_SERVER_TOKEN");
      expect(text, file).not.toContain("AGXORA_EMAIL_HTTP_TOKEN");
    }
  });
});
