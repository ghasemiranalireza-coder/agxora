"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type JSX, type ReactNode } from "react";
import { Button, Card } from "@/app/components/ui";
import { useAuth } from "@/app/lib/auth";
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
  const auth = useAuth();
  const { role, identity } = useIamAuth();
  const prefs = useIamProfilePreferences();
  const [notice, setNotice] = useState(
    "Preferences save locally until the profile API is connected.",
  );
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
    setNotice("Profile preferences updated.");
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
          Identity
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          User Profile
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Manage your account identity, preferences, and security. Organization
          and workspace controls live in Identity Settings.
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
              {form.displayName || auth.user?.displayName || "Guest"}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {auth.user?.email || "Not signed in"}
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
                Identity settings
              </Button>
            </Link>
            <Link href="/dashboard/settings#security">
              <Button size="sm" variant="ghost">
                Security
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
              Profile
            </h2>
            <Field label="Full name">
              <input
                value={form.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={fieldStyle}
              />
            </Field>
            <Field label="Email">
              <input
                value={auth.user?.email ?? ""}
                readOnly
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none opacity-80"
                style={fieldStyle}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Language">
                <select
                  value={form.language}
                  onChange={(e) => patch({ language: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={fieldStyle}
                >
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                  <option value="de-DE">Deutsch</option>
                </select>
              </Field>
              <Field label="Timezone">
                <select
                  value={form.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={fieldStyle}
                >
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card className="space-y-4" padding="24px" hover={false}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              Notifications
            </h2>
            <Toggle
              label="Email notifications"
              checked={form.notificationsEmail}
              onChange={(value) => patch({ notificationsEmail: value })}
            />
            <Toggle
              label="Push notifications"
              checked={form.notificationsPush}
              onChange={(value) => patch({ notificationsPush: value })}
            />
          </Card>

          <Card className="space-y-3" padding="24px" hover={false}>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              Workspace
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
              Save preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const fieldStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
  background: "rgba(255,255,255,0.04)",
  color: "var(--agx-text, #f8fafc)",
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span
        className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span style={{ color: "var(--agx-text, #f8fafc)" }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
