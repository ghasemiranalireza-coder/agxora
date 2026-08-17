"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useAISettings } from "../../lib/ai";
import type { AIProviderId } from "../../lib/ai";
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
import { SecurityPanel } from "./SecurityPanel";

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
            value={t("settings.profile.themeResolved", { mode, appearance })}
            readOnly
            aria-readonly="true"
          />
        </SettingsField>
        <SettingsField label={t("settings.profile.region")}>
          <SettingsSelect value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="EU">{t("settings.profile.regions.EU")}</option>
            <option value="US">{t("settings.profile.regions.US")}</option>
            <option value="MENA">{t("settings.profile.regions.MENA")}</option>
            <option value="APAC">{t("settings.profile.regions.APAC")}</option>
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
  const t = useT();
  const [notice, setNotice] = useState(t("settings.ai.noticeSync"));

  return (
    <SettingsPanel
      title={t("settings.ai.title")}
      description={t("settings.ai.panelDescription")}
      actions={
        <>
          <Link href="/dashboard/agents">
            <Button size="sm" variant="primary">
              {t("settings.ai.openAgentOs")}
            </Button>
          </Link>
          <Link href="/dashboard/ai">
            <Button size="sm" variant="secondary">
              {t("settings.ai.openAiWorkspace")}
            </Button>
          </Link>
        </>
      }
    >
      <SettingsNotice>{t("settings.ai.noticeProvider")}</SettingsNotice>
      <SettingsGrid>
        <SettingsField label={t("settings.ai.preferredProvider")}>
          <SettingsSelect
            value={settings.defaultProviderId}
            onChange={(e) => setProvider(e.target.value as AIProviderId)}
          >
            <option value="mock">{t("settings.ai.providers.mock")}</option>
            <option value="openai">{t("settings.ai.providers.openai")}</option>
            <option value="azure">{t("settings.ai.providers.azure")}</option>
            <option value="anthropic">{t("settings.ai.providers.anthropic")}</option>
            <option value="google">{t("settings.ai.providers.google")}</option>
            <option value="openrouter">{t("settings.ai.providers.openrouter")}</option>
            <option value="ollama">{t("settings.ai.providers.ollama")}</option>
            <option value="local">{t("settings.ai.providers.local")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.ai.defaultModel")}>
          <SettingsInput
            value={settings.defaultModelId}
            onChange={(e) => updateSettings({ defaultModelId: e.target.value })}
          />
        </SettingsField>
        <SettingsField
          label={t("settings.ai.temperature")}
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
            aria-label={t("settings.ai.temperature")}
          />
        </SettingsField>
        <SettingsField label={t("settings.ai.topP")} hint={`${settings.topP.toFixed(2)}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.topP}
            onChange={(e) => updateSettings({ topP: Number(e.target.value) })}
            className="w-full"
            aria-label={t("settings.ai.topP")}
          />
        </SettingsField>
        <SettingsField label={t("settings.ai.maxTokens")}>
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
        <SettingsField label={t("settings.ai.writingStyle")}>
          <SettingsSelect
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="professional">{t("settings.ai.writingStyles.professional")}</option>
            <option value="concise">{t("settings.ai.writingStyles.concise")}</option>
            <option value="friendly">{t("settings.ai.writingStyles.friendly")}</option>
            <option value="technical">{t("settings.ai.writingStyles.technical")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.ai.languagePreferences")}>
          <SettingsSelect
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="auto">{t("settings.ai.languages.auto")}</option>
            <option value="en">{t("settings.ai.languages.en")}</option>
            <option value="de">{t("settings.ai.languages.de")}</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsField
        label={t("settings.ai.systemPrompt")}
        hint={t("settings.ai.systemPromptHint")}
      >
        <SettingsTextArea
          rows={4}
          value={settings.systemPromptOverride ?? ""}
          placeholder={t("settings.ai.systemPromptPlaceholder")}
          onChange={(value) =>
            updateSettings({
              systemPromptOverride: value || undefined,
            })
          }
        />
      </SettingsField>
      <SettingsField
        label={t("settings.ai.apiKeyManagement")}
        hint={t("settings.ai.apiKeyHint")}
      >
        <SettingsInput
          value=""
          readOnly
          placeholder={t("settings.ai.apiKeyPlaceholder")}
        />
      </SettingsField>
      <SettingsToggle
        label={t("settings.ai.memory")}
        description={t("settings.ai.memoryDescription")}
        checked={memory}
        onChange={setMemory}
      />
      <SettingsToggle
        label={t("settings.ai.automationSuggestions")}
        description={t("settings.ai.automationSuggestionsDescription")}
        checked={automationSuggestions}
        onChange={setAutomationSuggestions}
      />
      <SettingsToggle
        label={t("settings.ai.streaming")}
        description={t("settings.ai.streamingDescription")}
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
  const t = useT();
  const [notice, setNotice] = useState(t("settings.appearance.noticeTheme"));

  const modes: readonly { id: ThemeMode; labelKey: string; hintKey: string }[] = [
    { id: "day", labelKey: "settings.appearance.modes.day.label", hintKey: "settings.appearance.modes.day.hint" },
    { id: "night", labelKey: "settings.appearance.modes.night.label", hintKey: "settings.appearance.modes.night.hint" },
    { id: "auto", labelKey: "settings.appearance.modes.auto.label", hintKey: "settings.appearance.modes.auto.hint" },
  ];

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
          {t("settings.appearance.themeLabel")}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("settings.appearance.themeModeAria")}>
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
                  {t(item.labelKey)}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t(item.hintKey)}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("settings.appearance.resolvedAppearance")}{" "}
          <strong style={{ color: "var(--agx-text, #f8fafc)" }}>{appearance}</strong>
        </p>
      </div>

      <div>
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("settings.appearance.accentColor")}
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
        <SettingsNotice>{t("settings.appearance.accentNotice")}</SettingsNotice>
      </div>

      <SettingsField label={t("settings.appearance.density")}>
        <SettingsSelect
          value={prefs.density}
          onChange={(e) =>
            setPrefs((p) => ({
              ...p,
              density: e.target.value as AppearancePrefs["density"],
            }))
          }
        >
          <option value="comfortable">{t("settings.appearance.densities.comfortable")}</option>
          <option value="compact">{t("settings.appearance.densities.compact")}</option>
          <option value="spacious">{t("settings.appearance.densities.spacious")}</option>
        </SettingsSelect>
      </SettingsField>

      <SettingsToggle
        label={t("settings.appearance.compactMode")}
        description={t("settings.appearance.compactModeDescription")}
        checked={prefs.compactMode}
        onChange={(v) => setPrefs((p) => ({ ...p, compactMode: v }))}
      />
      <SettingsToggle
        label={t("settings.appearance.animations")}
        description={t("settings.appearance.animationsDescription")}
        checked={prefs.animations}
        onChange={(v) => setPrefs((p) => ({ ...p, animations: v }))}
      />
      <SettingsToggle
        label={t("settings.appearance.glassEffects")}
        description={t("settings.appearance.glassEffectsDescription")}
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
  const [notice, setNotice] = useState(t("settings.notifications.notice"));

  const set = (key: keyof NotificationPrefs, value: boolean): void => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  return (
    <SettingsPanel title={t("settings.notifications.title")} description={t("settings.notifications.panelDescription")}>
      <SettingsToggle label={t("settings.notifications.email")} checked={prefs.email} onChange={(v) => set("email", v)} />
      <SettingsToggle label={t("settings.notifications.push")} checked={prefs.push} onChange={(v) => set("push", v)} />
      <SettingsToggle label={t("settings.notifications.desktop")} checked={prefs.desktop} onChange={(v) => set("desktop", v)} />
      <SettingsToggle label={t("settings.notifications.mobile")} checked={prefs.mobile} onChange={(v) => set("mobile", v)} />
      <SettingsToggle
        label={t("settings.notifications.workflowAlerts")}
        description={t("settings.notifications.workflowAlertsDescription")}
        checked={prefs.workflowAlerts}
        onChange={(v) => set("workflowAlerts", v)}
      />
      <SettingsToggle
        label={t("settings.notifications.financeAlerts")}
        checked={prefs.financeAlerts}
        onChange={(v) => set("financeAlerts", v)}
      />
      <SettingsToggle label={t("settings.notifications.crmAlerts")} checked={prefs.crmAlerts} onChange={(v) => set("crmAlerts", v)} />
      <SettingsToggle
        label={t("settings.notifications.documentsAlerts")}
        checked={prefs.documentsAlerts}
        onChange={(v) => set("documentsAlerts", v)}
      />
      <SettingsNotice>
        {t("settings.notifications.deliveryNotice")}{" "}
        <Link href="/contact" className="underline-offset-2 hover:underline">
          {t("settings.notifications.contactSupport")}
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
  const [notice, setNotice] = useState(t("settings.documents.notice"));

  return (
    <SettingsPanel title={t("settings.documents.title")} description={t("settings.documents.panelDescription")}>
      <SettingsGrid>
        <SettingsField label={t("settings.documents.storagePreferences")}>
          <SettingsSelect
            value={prefs.storagePreference}
            onChange={(e) => setPrefs((p) => ({ ...p, storagePreference: e.target.value }))}
          >
            <option value="workspace-default">{t("settings.documents.storageOptions.workspace-default")}</option>
            <option value="eu-region">{t("settings.documents.storageOptions.eu-region")}</option>
            <option value="encrypted-vault">{t("settings.documents.storageOptions.encrypted-vault")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.documents.retentionPolicy")}>
          <SettingsSelect
            value={prefs.retentionPolicy}
            onChange={(e) => setPrefs((p) => ({ ...p, retentionPolicy: e.target.value }))}
          >
            <option value="30-days">{t("settings.documents.retentionOptions.30-days")}</option>
            <option value="2-years">{t("settings.documents.retentionOptions.2-years")}</option>
            <option value="7-years">{t("settings.documents.retentionOptions.7-years")}</option>
            <option value="10-years">{t("settings.documents.retentionOptions.10-years")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.documents.defaultFolder")}>
          <SettingsInput
            value={prefs.defaultFolder}
            onChange={(e) => setPrefs((p) => ({ ...p, defaultFolder: e.target.value }))}
          />
        </SettingsField>
      </SettingsGrid>
      <SettingsToggle
        label={t("settings.documents.versioning")}
        description={t("settings.documents.versioningDescription")}
        checked={prefs.versioning}
        onChange={(v) => setPrefs((p) => ({ ...p, versioning: v }))}
      />
      <SettingsToggle
        label={t("settings.documents.knowledgeSettings")}
        description={t("settings.documents.knowledgeDescription")}
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
  const [notice, setNotice] = useState(t("settings.automation.notice"));

  return (
    <SettingsPanel title={t("settings.automation.title")} description={t("settings.automation.panelDescription")}>
      <SettingsGrid>
        <SettingsField label={t("settings.automation.workflowDefaults")}>
          <SettingsSelect
            value={prefs.workflowDefaults}
            onChange={(e) => setPrefs((p) => ({ ...p, workflowDefaults: e.target.value }))}
          >
            <option value="require-approval">{t("settings.automation.workflowOptions.require-approval")}</option>
            <option value="auto-run">{t("settings.automation.workflowOptions.auto-run")}</option>
            <option value="draft-only">{t("settings.automation.workflowOptions.draft-only")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.automation.historyLimits")}>
          <SettingsSelect
            value={prefs.historyLimit}
            onChange={(e) => setPrefs((p) => ({ ...p, historyLimit: e.target.value }))}
          >
            <option value="30-days">{t("settings.automation.historyOptions.30-days")}</option>
            <option value="90-days">{t("settings.automation.historyOptions.90-days")}</option>
            <option value="365-days">{t("settings.automation.historyOptions.365-days")}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label={t("settings.automation.retryPolicy")}>
          <SettingsSelect
            value={prefs.retryPolicy}
            onChange={(e) => setPrefs((p) => ({ ...p, retryPolicy: e.target.value }))}
          >
            <option value="none">{t("settings.automation.retryOptions.none")}</option>
            <option value="3-exponential">{t("settings.automation.retryOptions.3-exponential")}</option>
            <option value="5-linear">{t("settings.automation.retryOptions.5-linear")}</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsToggle
        label={t("settings.automation.aiSuggestions")}
        checked={prefs.aiSuggestions}
        onChange={(v) => setPrefs((p) => ({ ...p, aiSuggestions: v }))}
      />
      <SettingsToggle
        label={t("settings.automation.executionLogs")}
        description={t("settings.automation.executionLogsDescription")}
        checked={prefs.executionLogs}
        onChange={(v) => setPrefs((p) => ({ ...p, executionLogs: v }))}
      />
      <SaveRow notice={notice} onSave={() => setNotice(t("settings.sessionNotice", { area: "automation" }))} />
    </SettingsPanel>
  );
}

function IntegrationsPanel(): JSX.Element {
  const t = useT();
  const columns = useMemo<DataTableColumn<(typeof SETTINGS_INTEGRATIONS)[number]>[]>(
    () => [
      { key: "name", header: t("settings.integrations.columns.integration"), render: (r) => r.name },
      { key: "category", header: t("settings.integrations.columns.category"), render: (r) => r.category },
      {
        key: "state",
        header: t("settings.integrations.columns.status"),
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
        header: t("settings.integrations.columns.adapter"),
        render: (r) => <span className="font-mono text-xs">{r.adapter}</span>,
      },
    ],
    [t],
  );

  return (
    <SettingsPanel
      title={t("settings.integrations.title")}
      description={t("settings.integrations.panelDescription")}
      actions={
        <Link href="/dashboard/integrations">
          <Button size="sm" variant="primary">
            {t("settings.integrations.openCenter")}
          </Button>
        </Link>
      }
    >
      <SettingsNotice>{t("settings.integrations.notice")}</SettingsNotice>
      <DataTable columns={columns} rows={SETTINGS_INTEGRATIONS} rowKey={(r) => r.id} minWidth={680} />
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
      { key: "name", header: t("settings.api.columns.name"), render: (r) => r.name },
      {
        key: "prefix",
        header: t("settings.api.columns.key"),
        render: (r) => <span className="font-mono text-xs">{r.prefix}</span>,
      },
      { key: "scope", header: t("settings.api.columns.scope"), render: (r) => r.scope },
      { key: "lastUsed", header: t("settings.api.columns.lastUsed"), render: (r) => r.lastUsed.slice(0, 10) },
    ],
    [t],
  );

  return (
    <SettingsPanel
      title={t("settings.api.title")}
      description={t("settings.api.panelDescription")}
      actions={
        <Link href="/dashboard/integrations">
          <Button size="sm" variant="primary">
            {t("settings.api.openPortal")}
          </Button>
        </Link>
      }
    >
      <SettingsNotice>{t("settings.api.notice")}</SettingsNotice>
      <DataTable columns={columns} rows={API_KEYS} rowKey={(r) => r.id} minWidth={640} />
      <SettingsGrid>
        <SettingsField label={t("settings.api.webhooks")}>
          <SettingsInput defaultValue="https://hooks.agxora.io/v1/events" readOnly />
        </SettingsField>
        <SettingsField label={t("settings.api.sandbox")}>
          <SettingsSelect defaultValue="enabled">
            <option value="enabled">{t("settings.api.sandboxEnabled")}</option>
            <option value="disabled">{t("settings.api.sandboxDisabled")}</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsNotice>{t("settings.api.tokensNotice")}</SettingsNotice>
    </SettingsPanel>
  );
}

function AuditPanel(): JSX.Element {
  const t = useT();
  const columns = useMemo<DataTableColumn<(typeof AUDIT_LOGS)[number]>[]>(
    () => [
      { key: "at", header: t("settings.audit.columns.when"), render: (r) => r.at.replace("T", " ").slice(0, 16) },
      { key: "actor", header: t("settings.audit.columns.actor"), render: (r) => r.actor },
      {
        key: "category",
        header: t("settings.audit.columns.category"),
        render: (r) => (
          <Badge
            tone={
              r.category === "security" ? "critical" : r.category === "system" ? "warning" : "accent"
            }
          >
            {r.category === "activity"
              ? t("settings.audit.categories.activity")
              : r.category === "security"
                ? t("settings.audit.categories.security")
                : t("settings.audit.categories.system")}
          </Badge>
        ),
      },
      { key: "summary", header: t("settings.audit.columns.summary"), render: (r) => r.summary },
    ],
    [t],
  );

  return (
    <SettingsPanel title={t("settings.audit.title")} description={t("settings.audit.panelDescription")}>
      <DataTable columns={columns} rows={AUDIT_LOGS} rowKey={(r) => r.id} minWidth={720} />
    </SettingsPanel>
  );
}

function AdvancedPanel(): JSX.Element {
  const t = useT();
  const [experimental, setExperimental] = useState(false);
  const [notice, setNotice] = useState(t("settings.advanced.notice"));

  return (
    <SettingsPanel title={t("settings.advanced.title")} description={t("settings.advanced.panelDescription")}>
      <SettingsToggle
        label={t("settings.advanced.experimentalFeatures")}
        description={t("settings.advanced.experimentalDescription")}
        checked={experimental}
        onChange={setExperimental}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setNotice(t("settings.advanced.exportUnavailable"))}>
          {t("settings.advanced.export")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setNotice(t("settings.advanced.importUnavailable"))}>
          {t("settings.advanced.import")}
        </Button>
        <Button size="sm" variant="danger" onClick={() => setNotice(t("settings.advanced.resetUnavailable"))}>
          {t("settings.advanced.reset")}
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
