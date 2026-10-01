"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { Button } from "@/app/components/ui/Button";
import { catalogCopy, useT } from "@/app/lib/i18n";
import {
  buildAiContentConfirmation,
  buildAutomaticPublishingConfirmation,
  buildPlatformConfirmation,
  type PlatformPermissionKey,
} from "@/app/lib/platform-authorization/policy";

type PermissionOption = {
  readonly key: PlatformPermissionKey;
  readonly label: string;
};

type Props = {
  readonly provider: string;
  readonly displayName: string;
  readonly accountLabel?: string | null;
  readonly redirectPath: string;
  readonly onClose: () => void;
  readonly onConnected: (authorizationUrl?: string) => void;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return body;
}

export function PlatformAuthorizationDialog({
  provider,
  displayName,
  accountLabel,
  redirectPath,
  onClose,
  onConnected,
}: Props): JSX.Element {
  const t = useT();
  const [options, setOptions] = useState<readonly PermissionOption[]>([]);
  const [selected, setSelected] = useState<readonly string[]>(["connect_account"]);
  const [aiContent, setAiContent] = useState(false);
  const [automaticPublishing, setAutomaticPublishing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revocation, setRevocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    void api<{
      permissions?: PermissionOption[];
      revocation?: string;
    }>(`/api/v1/integrations/${provider}/authorization`)
      .then((result) => {
        if (cancelled) return;
        const permissions = result.permissions ?? [];
        setOptions(permissions);
        setSelected(
          permissions.some((item) => item.key === "connect_account")
            ? ["connect_account"]
            : [],
        );
        setRevocation(result.revocation ?? "");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const dataPermissions = options.filter(
    (item) => item.key !== "create_ai_content" && item.key !== "auto_publish_ai",
  );
  const aiAvailable = options.some((item) => item.key === "create_ai_content");
  const autoAvailable = options.some((item) => item.key === "auto_publish_ai");
  const grantedKeys = useMemo(() => {
    const keys = selected.filter(
      (key) => key !== "create_ai_content" && key !== "auto_publish_ai",
    ) as PlatformPermissionKey[];
    return keys;
  }, [selected]);

  const statement = buildPlatformConfirmation({
    provider,
    accountLabel: accountLabel ?? null,
    permissions: [
      ...grantedKeys,
      ...(aiContent ? (["create_ai_content"] as const) : []),
      ...(automaticPublishing ? (["auto_publish_ai"] as const) : []),
    ],
    aiContent,
    automaticPublishing,
  });

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
    setConfirmed(false);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ authorizationUrl?: string }>(
        `/api/v1/integrations/${provider}/connect`,
        {
          method: "POST",
          body: JSON.stringify({
            redirectPath,
            confirmed,
            permissions: grantedKeys,
            aiContent,
            automaticPublishing,
            automaticPublishingConfirmed: autoConfirmed,
            accountLabel: accountLabel ?? null,
          }),
        },
      );
      onConnected(result.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "connect_failed");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 6, 23, 0.72)" }}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border p-6"
        style={{
          background: "var(--agx-panel, #0f172a)",
          borderColor: "var(--agx-border, #334155)",
          color: "var(--agx-text, #f8fafc)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
          {catalogCopy(t, "integrations.authorization.eyebrow", "External platform")}
        </p>
        <h2 id="platform-auth-title" className="mt-2 text-xl font-semibold">
          {displayName}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {accountLabel
            ? `${catalogCopy(t, "integrations.authorization.account", "Account")}: ${accountLabel}`
            : catalogCopy(
                t,
                "integrations.authorization.accountPending",
                "The platform will confirm the account during OAuth.",
              )}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {dataPermissions.map((permission) => (
            <li key={permission.key}>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(permission.key)}
                  onChange={() => toggle(permission.key)}
                />
                <span>
                  {catalogCopy(
                    t,
                    `integrations.authorization.permission.${permission.key}`,
                    permission.label,
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {aiAvailable ? (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiContent}
              onChange={(event) => {
                setAiContent(event.target.checked);
                setConfirmed(false);
              }}
            />
            <span>{buildAiContentConfirmation(provider)}</span>
          </label>
        ) : null}
        {autoAvailable ? (
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={automaticPublishing}
              onChange={(event) => {
                setAutomaticPublishing(event.target.checked);
                setAutoConfirmed(false);
                setConfirmed(false);
              }}
            />
            <span>
              {buildAutomaticPublishingConfirmation({
                provider,
                accountLabel: accountLabel ?? null,
                contentTypes: ["freigegebene Beiträge"],
                frequency: null,
              })}
            </span>
          </label>
        ) : null}
        {automaticPublishing ? (
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoConfirmed}
              onChange={(event) => setAutoConfirmed(event.target.checked)}
            />
            <span>
              {catalogCopy(
                t,
                "integrations.authorization.autoConfirm",
                "I confirm automatic publishing for this platform, account, and content type.",
              )}
            </span>
          </label>
        ) : null}
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>{statement}</span>
        </label>
        {revocation ? (
          <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {revocation}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {catalogCopy(t, "integrations.authorization.cancel", "Cancel")}
          </Button>
          <Button
            variant="premium"
            disabled={!confirmed || busy || grantedKeys.length === 0}
            onClick={() => void submit()}
          >
            {catalogCopy(t, "integrations.authorization.connect", "Connect")} {displayName}
          </Button>
        </div>
      </div>
    </div>
  );
}
