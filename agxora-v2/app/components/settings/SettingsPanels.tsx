"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useAISettings } from "../../lib/ai";
import type { AIProviderId } from "../../lib/ai";
import {
  ensureActiveSession,
  listSessions,
  revokeOtherSessions,
  revokeSession,
  toggleTrustedDevice,
  useIdentity,
  type SessionRecord,
} from "../../lib/identity";
import {
  ACCENT_SWATCHES,
  API_KEYS,
  AUDIT_LOGS,
  DEFAULT_APPEARANCE_PREFS,
  DEFAULT_AUTOMATION_PREFS,
  DEFAULT_DOCUMENTS_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
  SETTINGS_INTEGRATIONS,
  type AppearancePrefs,
  type AutomationPrefs,
  type DocumentsPrefs,
  type NotificationPrefs,
  type SettingsSectionId,
} from "../../lib/settings";
import { useTheme, type ThemeMode } from "../../lib/theme";
import { Badge, Button, DataTable, EmptyState } from "../ui";
import type { DataTableColumn } from "../ui";
import { AccountBillingSection, SaasNavLink } from "../../../features/saas";
import { useAuth } from "../../lib/auth";
import { isServerAuthMode } from "../../lib/auth/mode";
import { controlPlaneClient } from "../../lib/control-plane/client";
import {
  LanguageSwitcher,
  useLocale,
  useT,
} from "../../lib/i18n";
import { resolveProfileIdentity, type WorkspaceRole } from "./profileIdentity";
import {
  SettingsField,
  SettingsGrid,
  SettingsInput,
  SettingsNotice,
  SettingsPanel,
  SettingsSelect,
  SettingsTextArea,
  SettingsToggle,
} from "./forms/SettingsControls";
import {
  OrganizationControlPanel,
  TeamControlPanel,
  WorkspaceControlPanel,
} from "./control-plane/ControlPlanePanels";

function SaveRow({
  notice,
  onSave,
  label,
}: {
  readonly notice: string;
  readonly onSave: () => void;
  readonly label?: string;
}): JSX.Element {
  const t = useT();
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
      style={{ borderColor: "var(--agx-ds-border)" }}
    >
      <p className="text-xs" style={{ color: "var(--agx-ds-text-muted)" }}>
        {notice}
      </p>
      <Button size="sm" variant="primary" onClick={onSave}>
        {label ?? t("settings.saveChanges")}
      </Button>
    </div>
  );
}

function ProfilePanel(): JSX.Element {
  const { user, isAuthenticated, hydrated } = useAuth();
  const { mode, appearance } = useTheme();
  const { t } = useLocale();
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [region, setRegion] = useState("EU");
  const [prefs, setPrefs] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const identity = resolveProfileIdentity({
    hydrated,
    authenticated: isAuthenticated,
    displayName: user?.displayName,
    email: user?.email,
    workspaceRole,
  });

  const loadRole = useCallback(async () => {
    if (!isServerAuthMode() || !isAuthenticated) {
      setWorkspaceRole(null);
      return;
    }
    try {
      const data = await controlPlaneClient.organization();
      setWorkspaceRole(data.organization.viewerRole);
    } catch {
      setWorkspaceRole(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRole();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRole]);

  const roleLabel =
    identity.role === "OWNER"
      ? t("settings.controlPlane.roleOwner")
      : identity.role === "ADMIN"
        ? t("settings.controlPlane.roleAdmin")
        : identity.role === "MEMBER"
          ? t("settings.controlPlane.roleMember")
          : "";

  const identityReadOnly = identity.status !== "ready";

  return (
    <SettingsPanel
      title={t("settings.profile.title")}
      description={t("settings.profile.panelDescription")}
    >
      {identity.status === "loading" ? (
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("settings.controlPlane.loading")}
        </p>
      ) : null}
      {identity.status === "signed_out" ? (
        <SettingsNotice>{t("settings.profile.signedOut")}</SettingsNotice>
      ) : null}

      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border text-lg font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)",
            background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)",
            color: "var(--agx-accent, #22d3ee)",
          }}
          aria-hidden="true"
        >
          {identity.initials || "—"}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("settings.profile.avatar")}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("settings.profile.role")}: {roleLabel || "—"} · {t("settings.profile.theme")}: {mode}
          </p>
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setNotice(t("settings.profile.avatarUnavailable"))}
            >
              {t("settings.profile.changeAvatar")}
            </Button>
          </div>
        </div>
      </div>
      <SettingsGrid>
        <SettingsField label={t("settings.profile.fullName")}>
          <SettingsInput
            value={identity.displayName}
            readOnly
            aria-readonly="true"
            disabled={identityReadOnly}
          />
        </SettingsField>
        <SettingsField label={t("settings.profile.email")}>
          <SettingsInput
            type="email"
            value={identity.email}
            readOnly
            aria-readonly="true"
            disabled={identityReadOnly}
          />
        </SettingsField>
        <SettingsField label={t("settings.profile.role")}>
          <SettingsInput value={roleLabel} readOnly aria-readonly="true" />
        </SettingsField>
        <SettingsField label={t("settings.profile.language")}>
          <LanguageSwitcher id="settings-profile-language" size="md" />
        </SettingsField>
        <SettingsField label={t("settings.profile.timezone")}>
          <SettingsSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Asia/Dubai">Asia/Dubai</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.profile.theme")}>
          <SettingsInput
            value={`${mode} (resolved ${appearance})`}
            readOnly
            aria-readonly="true"
          />
        </SettingsField>
        <SettingsField label={t("settings.profile.region")}>
          <SettingsSelect value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="EU">European Union</option>
            <option value="US">United States</option>
            <option value="MENA">MENA</option>
            <option value="APAC">APAC</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsField label={t("settings.profile.personalPrefs")} hint={t("settings.profile.prefsHint")}>
        <SettingsTextArea value={prefs} onChange={setPrefs} />
      </SettingsField>
      {identity.status === "ready" ? (
        <SettingsNotice>{t("settings.profile.serverIdentityNotice")}</SettingsNotice>
      ) : null}
      <SettingsNotice>{t("settings.profile.appearanceNote")}</SettingsNotice>
      <SettingsNotice>{t("settings.profile.localPrefsNotice")}</SettingsNotice>
      <SettingsNotice>
        {t("settings.profile.supportLinks")}:{" "}
        <Link href="/contact" className="underline-offset-2 hover:underline">
          {t("common.contact")}
        </Link>
        {" · "}
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          {t("common.privacy")}
        </Link>
        {" · "}
        <Link href="/terms" className="underline-offset-2 hover:underline">
          {t("common.terms")}
        </Link>
      </SettingsNotice>
      {notice ? (
        <p className="text-sm" role="status" style={{ color: "var(--agx-accent, #22d3ee)" }}>
          {notice}
        </p>
      ) : null}
      <SaveRow
        notice={t("settings.profile.localPrefsNotice")}
        onSave={() => setNotice(t("settings.sessionNotice", { area: "profile" }))}
      />
    </SettingsPanel>
  );
}

function AiPanel(): JSX.Element {
  const { settings, setProvider, updateSettings } = useAISettings();
  const [style, setStyle] = useState("professional");
  const [memory, setMemory] = useState(true);
  const [automationSuggestions, setAutomationSuggestions] = useState(true);
  const [lang, setLang] = useState("auto");
  const [notice, setNotice] = useState(
    "AI settings sync through AISettingsProvider — keys never stored here.",
  );

  const t = useT();

  return (
    <SettingsPanel
      title={t("settings.ai.title")}
      description={t("settings.ai.panelDescription")}
      actions={
        <>
          <Link href="/dashboard/agents">
            <Button size="sm" variant="primary">
              Open Agent OS
            </Button>
          </Link>
          <Link href="/dashboard/ai">
            <Button size="sm" variant="secondary">
              Open AI Workspace
            </Button>
          </Link>
        </>
      }
    >
      <SettingsNotice>
        Provider implementations stay behind the AI service layer. The UI never
        receives API keys or SDK details. Autonomous agents live in Agent OS.
      </SettingsNotice>
      <SettingsGrid>
        <SettingsField label="Preferred AI Provider">
          <SettingsSelect
            value={settings.defaultProviderId}
            onChange={(e) => setProvider(e.target.value as AIProviderId)}
          >
            <option value="mock">Mock (local)</option>
            <option value="openai">OpenAI</option>
            <option value="azure">Azure OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
            <option value="local">Local Provider</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Default AI Model">
          <SettingsInput
            value={settings.defaultModelId}
            onChange={(e) => updateSettings({ defaultModelId: e.target.value })}
          />
        </SettingsField>
        <SettingsField
          label="Temperature"
          hint={`${settings.temperature.toFixed(2)}`}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.temperature}
            onChange={(e) =>
              updateSettings({ temperature: Number(e.target.value) })
            }
            className="w-full"
            aria-label="Temperature"
          />
        </SettingsField>
        <SettingsField label="Top P" hint={`${settings.topP.toFixed(2)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.topP}
            onChange={(e) => updateSettings({ topP: Number(e.target.value) })}
            className="w-full"
            aria-label="Top P"
          />
        </SettingsField>
        <SettingsField label="Max Tokens">
          <SettingsInput
            type="number"
            min={256}
            max={32768}
            step={256}
            value={settings.maxTokens}
            onChange={(e) =>
              updateSettings({
                maxTokens: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </SettingsField>
        <SettingsField label="Writing Style">
          <SettingsSelect
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="professional">Professional</option>
            <option value="concise">Concise</option>
            <option value="friendly">Friendly</option>
            <option value="technical">Technical</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Language Preferences">
          <SettingsSelect
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="auto">Match profile language</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsField
        label="System Prompt"
        hint="Applied as the default system instruction for the AI Platform."
      >
        <SettingsTextArea
          rows={4}
          value={settings.systemPromptOverride ?? ""}
          placeholder="You are AGXORA AI — the enterprise operating assistant…"
          onChange={(value) =>
            updateSettings({
              systemPromptOverride: value || undefined,
            })
          }
        />
      </SettingsField>
      <SettingsField
        label="API Key Management"
        hint="Keys are supplied via server environment variables only."
      >
        <SettingsInput
          value=""
          readOnly
          placeholder="Configured via AGXORA_* environment variables (never in the browser)"
        />
      </SettingsField>
      <SettingsToggle
        label="Memory"
        description="Allow organization memory to inform AI replies across modules."
        checked={memory}
        onChange={setMemory}
      />
      <SettingsToggle
        label="Automation Suggestions"
        description="Surface AI workflow suggestions in Automation Engine."
        checked={automationSuggestions}
        onChange={setAutomationSuggestions}
      />
      <SettingsToggle
        label="Streaming"
        description="Stream model responses when the provider supports it."
        checked={settings.streamingEnabled}
        onChange={(v) => updateSettings({ streamingEnabled: v })}
      />
      <SaveRow
        notice={notice}
        onSave={() => setNotice(t("settings.sessionNotice", { area: "AI" }))}
      />
    </SettingsPanel>
  );
}

function AppearancePanel(): JSX.Element {
  const { mode, appearance, setMode } = useTheme();
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_APPEARANCE_PREFS);
  const [notice, setNotice] = useState(
    "Theme mode is the single source of truth via ThemeProvider. Header offers a quick toggle only.",
  );

  const modes: readonly { id: ThemeMode; label: string; hint: string }[] = [
    { id: "day", label: "Light", hint: "Pearl / ice enterprise day palette" },
    { id: "night", label: "Dark", hint: "Approved cinematic night look" },
    { id: "auto", label: "System", hint: "Follow local schedule (Auto)" },
  ];

  const t = useT();

  return (
    <SettingsPanel
      title={t("settings.appearance.title")}
      description={t("settings.appearance.panelDescription")}
    >
      <div>
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Theme
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme mode">
          {modes.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(item.id)}
                className="rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {item.hint}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Resolved appearance: <strong style={{ color: "var(--agx-text, #f8fafc)" }}>{appearance}</strong>
        </p>
      </div>

      <div>
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Accent Color
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_SWATCHES.map((swatch) => {
            const active = prefs.accentColor === swatch.value;
            return (
              <button
                key={swatch.id}
                type="button"
                aria-label={swatch.label}
                aria-pressed={active}
                onClick={() => setPrefs((p) => ({ ...p, accentColor: swatch.value }))}
                className="h-9 w-9 rounded-full border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  background: swatch.value,
                  borderColor: active ? "var(--agx-text, #f8fafc)" : "transparent",
                }}
              />
            );
          })}
        </div>
        <SettingsNotice>
          Accent preference is stored for future CSS var wiring — does not mutate the locked color system yet.
        </SettingsNotice>
      </div>

      <SettingsField label="Density">
        <SettingsSelect
          value={prefs.density}
          onChange={(e) =>
            setPrefs((p) => ({
              ...p,
              density: e.target.value as AppearancePrefs["density"],
            }))
          }
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
          <option value="spacious">Spacious</option>
        </SettingsSelect>
      </SettingsField>

      <SettingsToggle
        label="Compact Mode"
        description="Reduce padding across enterprise tables and panels."
        checked={prefs.compactMode}
        onChange={(v) => setPrefs((p) => ({ ...p, compactMode: v }))}
      />
      <SettingsToggle
        label="Animations"
        description="Section motion and hover lifts. Respects reduced-motion OS setting."
        checked={prefs.animations}
        onChange={(v) => setPrefs((p) => ({ ...p, animations: v }))}
      />
      <SettingsToggle
        label="Glass Effects"
        description="Frosted glass cards and sidebar blur intensity preference."
        checked={prefs.glassEffects}
        onChange={(v) => setPrefs((p) => ({ ...p, glassEffects: v }))}
      />
      <SaveRow
        notice={notice}
        onSave={() => setNotice(t("settings.sessionNotice", { area: "appearance" }))}
      />
    </SettingsPanel>
  );
}

function NotificationsPanel(): JSX.Element {
  const t = useT();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [notice, setNotice] = useState("Notification channels are preferences only — delivery adapters reserved.");

  const set = (key: keyof NotificationPrefs, value: boolean): void => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  return (
    <SettingsPanel title={t("settings.notifications.title")} description={t("settings.notifications.panelDescription")}>
      <SettingsToggle label="Email" checked={prefs.email} onChange={(v) => set("email", v)} />
      <SettingsToggle label="Push" checked={prefs.push} onChange={(v) => set("push", v)} />
      <SettingsToggle label="Desktop" checked={prefs.desktop} onChange={(v) => set("desktop", v)} />
      <SettingsToggle label="Mobile" checked={prefs.mobile} onChange={(v) => set("mobile", v)} />
      <SettingsToggle
        label="Workflow Alerts"
        description="Automation Engine execution and approval events."
        checked={prefs.workflowAlerts}
        onChange={(v) => set("workflowAlerts", v)}
      />
      <SettingsToggle
        label="Finance Alerts"
        checked={prefs.financeAlerts}
        onChange={(v) => set("financeAlerts", v)}
      />
      <SettingsToggle label="CRM Alerts" checked={prefs.crmAlerts} onChange={(v) => set("crmAlerts", v)} />
      <SettingsToggle
        label="Documents Alerts"
        checked={prefs.documentsAlerts}
        onChange={(v) => set("documentsAlerts", v)}
      />
      <SettingsNotice>
        Delivery adapters ship at launch. Questions:{" "}
        <Link href="/contact" className="underline-offset-2 hover:underline">
          Contact support
        </Link>
        .
      </SettingsNotice>
      <SaveRow notice={notice} onSave={() => setNotice(t("settings.sessionNotice", { area: "notifications" }))} />
    </SettingsPanel>
  );
}

function DocumentsPanel(): JSX.Element {
  const t = useT();
  const [prefs, setPrefs] = useState<DocumentsPrefs>(DEFAULT_DOCUMENTS_PREFS);
  const [notice, setNotice] = useState("Documents settings integrate with the Knowledge Hub architecture.");

  return (
    <SettingsPanel title={t("settings.documents.title")} description={t("settings.documents.panelDescription")}>
      <SettingsGrid>
        <SettingsField label="Storage Preferences">
          <SettingsSelect
            value={prefs.storagePreference}
            onChange={(e) => setPrefs((p) => ({ ...p, storagePreference: e.target.value }))}
          >
            <option value="workspace-default">Workspace default</option>
            <option value="eu-region">EU region</option>
            <option value="encrypted-vault">Encrypted vault</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Retention Policy">
          <SettingsSelect
            value={prefs.retentionPolicy}
            onChange={(e) => setPrefs((p) => ({ ...p, retentionPolicy: e.target.value }))}
          >
            <option value="30-days">30 days (scratch)</option>
            <option value="2-years">2 years</option>
            <option value="7-years">7 years</option>
            <option value="10-years">10 years</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Default Folder">
          <SettingsInput
            value={prefs.defaultFolder}
            onChange={(e) => setPrefs((p) => ({ ...p, defaultFolder: e.target.value }))}
          />
        </SettingsField>
      </SettingsGrid>
      <SettingsToggle
        label="Versioning"
        description="Keep document version history for restore/compare."
        checked={prefs.versioning}
        onChange={(v) => setPrefs((p) => ({ ...p, versioning: v }))}
      />
      <SettingsToggle
        label="Knowledge Settings"
        description="AI indexing for Knowledge Hub search."
        checked={prefs.knowledgeIndexing}
        onChange={(v) => setPrefs((p) => ({ ...p, knowledgeIndexing: v }))}
      />
      <SaveRow notice={notice} onSave={() => setNotice(t("settings.sessionNotice", { area: "documents" }))} />
    </SettingsPanel>
  );
}

function AutomationPanel(): JSX.Element {
  const t = useT();
  const [prefs, setPrefs] = useState<AutomationPrefs>(DEFAULT_AUTOMATION_PREFS);
  const [notice, setNotice] = useState("Automation defaults apply to the Workflow Engine architecture.");

  return (
    <SettingsPanel title={t("settings.automation.title")} description={t("settings.automation.panelDescription")}>
      <SettingsGrid>
        <SettingsField label="Workflow Defaults">
          <SettingsSelect
            value={prefs.workflowDefaults}
            onChange={(e) => setPrefs((p) => ({ ...p, workflowDefaults: e.target.value }))}
          >
            <option value="require-approval">Require approval gates</option>
            <option value="auto-run">Auto-run trusted flows</option>
            <option value="draft-only">Draft only</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="History Limits">
          <SettingsSelect
            value={prefs.historyLimit}
            onChange={(e) => setPrefs((p) => ({ ...p, historyLimit: e.target.value }))}
          >
            <option value="30-days">30 days</option>
            <option value="90-days">90 days</option>
            <option value="365-days">365 days</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Retry Policy">
          <SettingsSelect
            value={prefs.retryPolicy}
            onChange={(e) => setPrefs((p) => ({ ...p, retryPolicy: e.target.value }))}
          >
            <option value="none">No retries</option>
            <option value="3-exponential">3× exponential</option>
            <option value="5-linear">5× linear</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsToggle
        label="AI Suggestions"
        checked={prefs.aiSuggestions}
        onChange={(v) => setPrefs((p) => ({ ...p, aiSuggestions: v }))}
      />
      <SettingsToggle
        label="Execution Logs"
        description="Retain detailed run payloads in Workflow History."
        checked={prefs.executionLogs}
        onChange={(v) => setPrefs((p) => ({ ...p, executionLogs: v }))}
      />
      <SaveRow notice={notice} onSave={() => setNotice(t("settings.sessionNotice", { area: "automation" }))} />
    </SettingsPanel>
  );
}

function IntegrationsPanel(): JSX.Element {
  const columns = useMemo<DataTableColumn<(typeof SETTINGS_INTEGRATIONS)[number]>[]>(
    () => [
      { key: "name", header: "Integration", render: (r) => r.name },
      { key: "category", header: "Category", render: (r) => r.category },
      {
        key: "state",
        header: "Status",
        render: (r) => (
          <Badge
            tone={
              r.state === "connected"
                ? "positive"
                : r.state === "installed"
                  ? "accent"
                  : r.state === "available"
                    ? "warning"
                    : "default"
            }
          >
            {r.state}
          </Badge>
        ),
      },
      {
        key: "adapter",
        header: "Adapter",
        render: (r) => <span className="font-mono text-xs">{r.adapter}</span>,
      },
    ],
    [],
  );

  const t = useT();

  return (
    <SettingsPanel
      title={t("settings.integrations.title")}
      description={t("settings.integrations.panelDescription")}
      actions={
        <Link href="/dashboard/integrations">
          <Button size="sm" variant="primary">
            Open Integration Center
          </Button>
        </Link>
      }
    >
      <SettingsNotice>
        Enterprise Integration Platform lives in the Integration Center —
        connectors, OAuth, webhooks, API keys, and the workflow event bridge.
      </SettingsNotice>
      <DataTable columns={columns} rows={SETTINGS_INTEGRATIONS} rowKey={(r) => r.id} minWidth={680} />
    </SettingsPanel>
  );
}

function SecurityPanel(): JSX.Element {
  const t = useT();
  const identity = useIdentity();
  const [twoFa, setTwoFa] = useState(true);
  const [encryption, setEncryption] = useState(true);
  const [notice, setNotice] = useState("Session list is a local architecture store — future server sessions.");
  const [sessions, setSessions] = useState<readonly SessionRecord[]>(() => {
    if (!identity.user || !identity.session) return [];
    ensureActiveSession(identity.user.id, identity.session.sessionId);
    return listSessions(identity.user.id);
  });

  const refreshSessions = (): void => {
    if (!identity.user) return;
    setSessions(listSessions(identity.user.id));
  };

  return (
    <SettingsPanel title={t("settings.security.title")} description={t("settings.security.panelDescription")}>
      <SettingsToggle
        label="Two Factor Authentication"
        description="Require TOTP for admin roles."
        checked={twoFa}
        onChange={setTwoFa}
      />
      <SettingsToggle
        label="Encryption"
        description="At-rest encryption hooks reserved for KMS."
        checked={encryption}
        onChange={setEncryption}
      />
      <SettingsGrid>
        <SettingsField label="Password">
          <Link href="/forgot-password">
            <Button size="sm" variant="secondary">
              Change password
            </Button>
          </Link>
        </SettingsField>
        <SettingsField label="API Keys">
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Manage developer keys under API & Developers.
          </p>
        </SettingsField>
      </SettingsGrid>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Active Sessions
          </h3>
          <Button
            size="sm"
            variant="danger"
            disabled={!identity.user || !identity.session}
            onClick={() => {
              if (!identity.user || !identity.session) return;
              setSessions(revokeOtherSessions(identity.user.id, identity.session.sessionId));
              setNotice("Other devices signed out. Current session kept.");
            }}
          >
            Logout All Devices
          </Button>
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions tracked"
            description="Sign in to register the current device in the session architecture store."
          />
        ) : (
          <ul className="space-y-2">
            {sessions.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {item.deviceLabel}
                      {item.current ? " · Current Device" : ""}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {item.ipHint} · last active {item.lastActiveAt.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                  <Badge tone={item.trusted ? "positive" : "default"}>
                    {item.trusted ? "Trusted" : "Untrusted"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!identity.user) return;
                      setSessions(toggleTrustedDevice(identity.user.id, item.id, !item.trusted));
                      setNotice("Trusted device preference updated.");
                    }}
                  >
                    {item.trusted ? "Untrust" : "Trust device"}
                  </Button>
                  {!item.current ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!identity.user) return;
                        setSessions(revokeSession(identity.user.id, item.id));
                        setNotice("Session revoked.");
                        refreshSessions();
                      }}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SaveRow notice={notice} onSave={() => setNotice(t("settings.sessionNotice", { area: "security" }))} />
    </SettingsPanel>
  );
}

function BillingPanel(): JSX.Element {
  const { t } = useLocale();
  return (
    <SettingsPanel
      title={t("settings.billing.title")}
      description={t("settings.billing.panelDescription")}
      actions={
        <SaasNavLink href="/dashboard/billing" variant="primary" size="sm">
          {t("billing.openBillingPortal")}
        </SaasNavLink>
      }
    >
      <AccountBillingSection />
      <SettingsNotice>
        {t("billing.billingQuestions")}{" "}
        <Link
          href="/contact"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
        >
          {t("common.contact")}
        </Link>
        {" · "}
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
        >
          {t("pricing.navPricing")}
        </Link>
        {" · "}
        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
        >
          {t("common.terms")}
        </Link>
      </SettingsNotice>
    </SettingsPanel>
  );
}

function ApiPanel(): JSX.Element {
  const t = useT();
  const columns = useMemo<DataTableColumn<(typeof API_KEYS)[number]>[]>(
    () => [
      { key: "name", header: "Name", render: (r) => r.name },
      {
        key: "prefix",
        header: "Key",
        render: (r) => <span className="font-mono text-xs">{r.prefix}</span>,
      },
      { key: "scope", header: "Scope", render: (r) => r.scope },
      { key: "lastUsed", header: "Last used", render: (r) => r.lastUsed.slice(0, 10) },
    ],
    [],
  );

  return (
    <SettingsPanel
      title={t("settings.api.title")}
      description={t("settings.api.panelDescription")}
      actions={
        <Link href="/dashboard/integrations">
          <Button size="sm" variant="primary">
            Open developer portal
          </Button>
        </Link>
      }
    >
      <SettingsNotice>
        Generate, rotate, and revoke keys in the Integration Center. Gateway,
        webhook tester, and API explorer are available there.
      </SettingsNotice>
      <DataTable columns={columns} rows={API_KEYS} rowKey={(r) => r.id} minWidth={640} />
      <SettingsGrid>
        <SettingsField label="Webhooks">
          <SettingsInput defaultValue="https://hooks.agxora.io/v1/events" readOnly />
        </SettingsField>
        <SettingsField label="Sandbox">
          <SettingsSelect defaultValue="enabled">
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsNotice>Developer tokens never display full secrets — prefix only.</SettingsNotice>
    </SettingsPanel>
  );
}

function AuditPanel(): JSX.Element {
  const columns = useMemo<DataTableColumn<(typeof AUDIT_LOGS)[number]>[]>(
    () => [
      { key: "at", header: "When", render: (r) => r.at.replace("T", " ").slice(0, 16) },
      { key: "actor", header: "Actor", render: (r) => r.actor },
      {
        key: "category",
        header: "Category",
        render: (r) => (
          <Badge
            tone={
              r.category === "security" ? "critical" : r.category === "system" ? "warning" : "accent"
            }
          >
            {r.category === "activity"
              ? "Recent Activity"
              : r.category === "security"
                ? "Security Events"
                : "System Changes"}
          </Badge>
        ),
      },
      { key: "summary", header: "Summary", render: (r) => r.summary },
    ],
    [],
  );

  const t = useT();

  return (
    <SettingsPanel title={t("settings.audit.title")} description={t("settings.audit.panelDescription")}>
      <DataTable columns={columns} rows={AUDIT_LOGS} rowKey={(r) => r.id} minWidth={720} />
    </SettingsPanel>
  );
}

function AdvancedPanel(): JSX.Element {
  const t = useT();
  const [experimental, setExperimental] = useState(false);
  const [notice, setNotice] = useState("Advanced actions require confirmation before applying.");

  return (
    <SettingsPanel title={t("settings.advanced.title")} description={t("settings.advanced.panelDescription")}>
      <SettingsToggle
        label="Experimental Features"
        description="Opt into unfinished Control Center capabilities."
        checked={experimental}
        onChange={setExperimental}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setNotice("Export is not available yet.")}>
          Export
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setNotice("Import is not available yet.")}>
          Import
        </Button>
        <Button size="sm" variant="danger" onClick={() => setNotice("Reset is not available yet.")}>
          Reset
        </Button>
      </div>
      <SettingsNotice>{notice}</SettingsNotice>
    </SettingsPanel>
  );
}

export function SettingsSectionPanel({
  section,
}: {
  readonly section: SettingsSectionId;
}): JSX.Element {
  switch (section) {
    case "profile":
      return <ProfilePanel />;
    case "organization":
      return <OrganizationControlPanel />;
    case "workspace":
      return <WorkspaceControlPanel />;
    case "team":
      return <TeamControlPanel />;
    case "ai":
      return <AiPanel />;
    case "appearance":
      return <AppearancePanel />;
    case "notifications":
      return <NotificationsPanel />;
    case "documents":
      return <DocumentsPanel />;
    case "automation":
      return <AutomationPanel />;
    case "integrations":
      return <IntegrationsPanel />;
    case "security":
      return <SecurityPanel />;
    case "billing":
      return <BillingPanel />;
    case "api":
      return <ApiPanel />;
    case "audit":
      return <AuditPanel />;
    case "advanced":
      return <AdvancedPanel />;
    default:
      return <UnknownSettingsPanel />;
  }
}

function UnknownSettingsPanel(): JSX.Element {
  const t = useT();
  return (
    <SettingsPanel title={t("settings.unknown.title")} description={t("settings.unknown.description")}>
      <EmptyState
        title={t("settings.unknown.emptyTitle")}
        description={t("settings.unknown.emptyDescription")}
      />
    </SettingsPanel>
  );
}
