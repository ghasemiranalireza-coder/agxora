"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type JSX } from "react";
import {
  Button,
  Card,
  FormField,
  FormInput,
  FormSelect,
  Switch,
} from "@/app/components/ui";
import { useAuth } from "@/app/lib/auth";
import { useT } from "@/app/lib/i18n";
import { useIamAuth } from "../hooks/useIamAuth";
import { useIamProfilePreferences } from "../hooks/useIamStores";
import { iamProfileStore } from "../store/profileStore";
import { initialsFromName } from "../utils";
import { WorkspaceSelector } from "./WorkspaceSelector";

type ProfileDraft = {
  displayName: string;
  language: string;
  timezone: string;
  notificationsEmail: boolean;
  notificationsPush: boolean;
};

/**
 * Professional user profile — avatar, identity, preferences, security links.
 */
export function IamProfileWorkspace(): JSX.Element {
  const t = useT();
  const auth = useAuth();
  const { role, identity } = useIamAuth();
  const prefs = useIamProfilePreferences();
  const [notice, setNotice] = useState(t("iam.profile.noticeInitial"));
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  useEffect(() => {
    iamProfileStore.hydrate({
      displayName: auth.user?.displayName,
      email: auth.user?.email,
      avatarUrl: auth.user?.avatarUrl,
    });
  }, [auth.user?.avatarUrl, auth.user?.displayName, auth.user?.email]);

  const form: ProfileDraft = draft ?? {
    displayName: prefs.displayName || auth.user?.displayName || "",
    language: prefs.language,
    timezone: prefs.timezone,
    notificationsEmail: prefs.notificationsEmail,
    notificationsPush: prefs.notificationsPush,
  };

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    iamProfileStore.update({
      displayName: form.displayName.trim(),
      email: auth.user?.email ?? prefs.email,
      language: form.language,
      timezone: form.timezone,
      notificationsEmail: form.notificationsEmail,
      notificationsPush: form.notificationsPush,
    });
    setDraft(null);
    setNotice(t("iam.profile.noticeSaved"));
  };

  const patch = (partial: Partial<ProfileDraft>) => {
    setDraft({ ...form, ...partial });
  };

  const initials = initialsFromName(
    form.displayName || auth.user?.displayName || "User",
  );

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("iam.profile.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("iam.profile.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("iam.profile.lead")}
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="space-y-4 text-center" padding="24px" hover={false}>
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold"
            style={{
              background:
                "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)",
              color: "var(--agx-accent, #22d3ee)",
              border:
                "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
            }}
            aria-hidden
          >
            {initials}
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {form.displayName || auth.user?.displayName || t("iam.profile.guest")}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {auth.user?.email || t("iam.profile.notSignedIn")}
            </p>
            <p
              className="mt-2 text-[11px] uppercase tracking-wider"
              style={{ color: "var(--agx-accent, #22d3ee)" }}
            >
              {role ?? identity.role ?? "viewer"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/identity">
              <Button size="sm" variant="secondary">
                {t("iam.profile.identitySettings")}
              </Button>
            </Link>
            <Link href="/dashboard/settings#security">
              <Button size="sm" variant="ghost">
                {t("iam.profile.security")}
              </Button>
            </Link>
          </div>
        </Card>

        <form onSubmit={onSave} className="space-y-4">
          <Card className="space-y-4" padding="24px" hover={false}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {t("iam.profile.profileSection")}
            </h2>
            <FormField label={t("iam.profile.fullName")} required>
              <FormInput
                value={form.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
                autoComplete="name"
              />
            </FormField>
            <FormField label={t("iam.profile.email")}>
              <FormInput
                value={auth.user?.email ?? ""}
                readOnly
                autoComplete="email"
                style={{ opacity: 0.8 }}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("iam.profile.language")}>
                <FormSelect
                  value={form.language}
                  onChange={(e) => patch({ language: e.target.value })}
                >
                  <option value="en-GB">{t("iam.profile.languageEnGb")}</option>
                  <option value="en-US">{t("iam.profile.languageEnUs")}</option>
                  <option value="de-DE">{t("iam.profile.languageDe")}</option>
                </FormSelect>
              </FormField>
              <FormField label={t("iam.profile.timezone")}>
                <FormSelect
                  value={form.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                >
                  <option value="Europe/Berlin">{t("iam.profile.timezoneBerlin")}</option>
                  <option value="Europe/London">{t("iam.profile.timezoneLondon")}</option>
                  <option value="UTC">{t("iam.profile.timezoneUtc")}</option>
                  <option value="America/New_York">{t("iam.profile.timezoneNewYork")}</option>
                </FormSelect>
              </FormField>
            </div>
          </Card>

          <Card className="space-y-4" padding="24px" hover={false}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--agx-ds-text)" }}
            >
              {t("iam.profile.notifications")}
            </h2>
            <Switch
              label={t("iam.profile.emailNotifications")}
              checked={form.notificationsEmail}
              onChange={(value) => patch({ notificationsEmail: value })}
            />
            <Switch
              label={t("iam.profile.pushNotifications")}
              checked={form.notificationsPush}
              onChange={(value) => patch({ notificationsPush: value })}
            />
          </Card>

          <Card className="space-y-3" padding="24px" hover={false}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {t("iam.profile.workspace")}
            </h2>
            <WorkspaceSelector />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className="text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {notice}
            </p>
            <Button type="submit" size="sm" variant="primary">
              {t("iam.profile.savePreferences")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
