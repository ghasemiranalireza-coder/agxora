"use client";

import Link from "next/link";
import { useMemo, useState, type JSX } from "react";
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
  TEAM_MEMBERS,
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
import {
  LanguageSwitcher,
  useLocale,
} from "../../lib/i18n";
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

function SaveRow({
  notice,
  onSave,
  label = "Save changes",
}: {
  readonly notice: string;
  readonly onSave: () => void;
  readonly label?: string;
}): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
      style={{ borderColor: "var(--agx-ds-border)" }}
    >
      <p className="text-xs" style={{ color: "var(--agx-ds-text-muted)" }}>
        {notice}
      </p>
      <Button size="sm" variant="primary" onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}

function ProfilePanel(): JSX.Element {
  const identity = useIdentity();
  const { mode } = useTheme();
  const { t } = useLocale();
  const [name, setName] = useState(identity.profile.fullName);
  const [email, setEmail] = useState(identity.profile.email);
  const [timezone, setTimezone] = useState(identity.profile.timezone || "Europe/Berlin");
  const [region, setRegion] = useState("EU");
  const [prefs, setPrefs] = useState("Prefer concise AI summaries and German invoice defaults.");
  const [notice, setNotice] = useState(
    "Profile is wired to the signed-in identity. Persistence is future API ready.",
  );

  return (
    <SettingsPanel
      title={t("settings.profile.title")}
      description={t("settings.profile.panelDescription")}
    >
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
          {identity.profile.avatarInitials}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Avatar
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Role: {identity.profile.roleLabel} · Theme: {mode}
          </p>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => setNotice("Avatar upload is not available yet.")}>
              Change avatar
            </Button>
          </div>
        </div>
      </div>
      <SettingsGrid>
        <SettingsField label="Full Name">
          <SettingsInput value={name} onChange={(e) => setName(e.target.value)} />
        </SettingsField>
        <SettingsField label="Email">
          <SettingsInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </SettingsField>
        <SettingsField label="Role">
          <SettingsInput value={identity.profile.roleLabel} readOnly />
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
            <option value={identity.profile.timezone}>{identity.profile.timezone}</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Theme">
          <SettingsInput value={`${mode} (resolved ${identity.profile.themeAppearance})`} readOnly />
        </SettingsField>
        <SettingsField label="Region">
          <SettingsSelect value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="EU">European Union</option>
            <option value="US">United States</option>
            <option value="MENA">MENA</option>
            <option value="APAC">APAC</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsField label="Personal Preferences" hint="Used by AI assistants across modules.">
        <SettingsTextArea value={prefs} onChange={setPrefs} />
      </SettingsField>
      <SettingsNotice>
        Appearance configuration remains under Appearance. Header provides a theme quick toggle only.
      </SettingsNotice>
      <SettingsNotice>
        Support:{" "}
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
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — profile API not connected.")} />
    </SettingsPanel>
  );
}

function OrganizationPanel(): JSX.Element {
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [tax, setTax] = useState("");
  const [departments, setDepartments] = useState("Finance, Sales, Marketing, People, Security");
  const [units, setUnits] = useState("DACH, Nordics, MENA");
  const [workspaceName, setWorkspaceName] = useState("AGXORA Core");
  const [notice, setNotice] = useState("Organization profile is architecture-ready for org APIs.");

  return (
    <SettingsPanel title="Organization" description="Company name, logo, address, tax information, departments, and business units.">
      <SettingsGrid>
        <SettingsField label="Company Name">
          <SettingsInput value={company} onChange={(e) => setCompany(e.target.value)} />
        </SettingsField>
        <SettingsField label="Workspace Name">
          <SettingsInput value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
        </SettingsField>
        <SettingsField label="Tax Information">
          <SettingsInput value={tax} onChange={(e) => setTax(e.target.value)} />
        </SettingsField>
        <SettingsField label="Logo">
          <Button size="sm" variant="secondary" onClick={() => setNotice("Logo upload is not available yet.")}>
            Upload logo
          </Button>
        </SettingsField>
      </SettingsGrid>
      <SettingsField label="Address">
        <SettingsTextArea value={address} onChange={setAddress} rows={2} />
      </SettingsField>
      <SettingsField label="Departments">
        <SettingsInput value={departments} onChange={(e) => setDepartments(e.target.value)} />
      </SettingsField>
      <SettingsField label="Business Units">
        <SettingsInput value={units} onChange={(e) => setUnits(e.target.value)} />
      </SettingsField>
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — organization settings are not persisted yet.")} />
    </SettingsPanel>
  );
}

function WorkspacePanel(): JSX.Element {
  const [dashboard, setDashboard] = useState("command-center");
  const [homepage, setHomepage] = useState("/dashboard");
  const [branding, setBranding] = useState("AGXORA Business OS");
  const [modules, setModules] = useState("dashboard,crm,finance,automation,documents,creator");
  const [notice, setNotice] = useState("Workspace settings control default modules and homepage.");

  return (
    <SettingsPanel title="Workspace" description="Workspace settings, default dashboard, branding, modules, and homepage.">
      <SettingsGrid>
        <SettingsField label="Default Dashboard">
          <SettingsSelect value={dashboard} onChange={(e) => setDashboard(e.target.value)}>
            <option value="command-center">Command Center</option>
            <option value="finance">Finance Overview</option>
            <option value="crm">CRM Pipeline</option>
            <option value="documents">Knowledge Hub</option>
          </SettingsSelect>
        </SettingsField>
        <SettingsField label="Homepage">
          <SettingsSelect value={homepage} onChange={(e) => setHomepage(e.target.value)}>
            <option value="/dashboard">/dashboard</option>
            <option value="/dashboard/crm">/dashboard/crm</option>
            <option value="/dashboard/finance">/dashboard/finance</option>
            <option value="/dashboard/documents">/dashboard/documents</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
      <SettingsField label="Workspace Branding">
        <SettingsInput value={branding} onChange={(e) => setBranding(e.target.value)} />
      </SettingsField>
      <SettingsField label="Default Modules" hint="Comma-separated module keys enabled for new members.">
        <SettingsInput value={modules} onChange={(e) => setModules(e.target.value)} />
      </SettingsField>
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — workspace settings are not persisted yet.")} />
    </SettingsPanel>
  );
}

function TeamPanel(): JSX.Element {
  const columns = useMemo<DataTableColumn<(typeof TEAM_MEMBERS)[number]>[]>(
    () => [
      { key: "name", header: "Member", render: (r) => r.name },
      { key: "email", header: "Email", render: (r) => r.email },
      { key: "role", header: "Role", render: (r) => r.role },
      {
        key: "status",
        header: "Status",
        render: (r) => (
          <Badge tone={r.status === "active" ? "positive" : r.status === "invited" ? "accent" : "default"}>
            {r.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <SettingsPanel
      title="Team"
      description="Members, roles, permissions, invitations, and groups."
      actions={
        <Button size="sm" variant="primary">
          Invite member
        </Button>
      }
    >
      <SettingsNotice>
        Roles & permissions map to RBAC (`settings.manage`, module scopes). Invitation email delivery is queued for the mail provider.
      </SettingsNotice>
      <DataTable columns={columns} rows={TEAM_MEMBERS} rowKey={(r) => r.id} minWidth={640} />
      <SettingsGrid>
        <SettingsField label="Groups">
          <SettingsInput defaultValue="Leadership, Finance Controllers, Creators" readOnly />
        </SettingsField>
        <SettingsField label="Default Role for Invites">
          <SettingsSelect defaultValue="viewer">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </SettingsSelect>
        </SettingsField>
      </SettingsGrid>
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

  return (
    <SettingsPanel
      title="AI"
      description="Provider selection, generation parameters, system prompt, streaming, and API key management."
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
        onSave={() => setNotice("Updated for this session — AI preferences are not persisted yet.")}
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

  return (
    <SettingsPanel
      title="Appearance"
      description="Complete theme configuration for AGXORA. Header quick toggle only flips Day ↔ Night."
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
        onSave={() => setNotice("Theme mode persists via ThemeProvider. Other appearance fields are not persisted yet.")}
      />
    </SettingsPanel>
  );
}

function NotificationsPanel(): JSX.Element {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [notice, setNotice] = useState("Notification channels are preferences only — delivery adapters reserved.");

  const set = (key: keyof NotificationPrefs, value: boolean): void => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  return (
    <SettingsPanel title="Notifications" description="Email, push, desktop, mobile, and module-specific alerts.">
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
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — notification preferences are not persisted yet.")} />
    </SettingsPanel>
  );
}

function DocumentsPanel(): JSX.Element {
  const [prefs, setPrefs] = useState<DocumentsPrefs>(DEFAULT_DOCUMENTS_PREFS);
  const [notice, setNotice] = useState("Documents settings integrate with the Knowledge Hub architecture.");

  return (
    <SettingsPanel title="Documents" description="Storage preferences, retention, default folder, versioning, and knowledge settings.">
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
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — documents preferences are not persisted yet.")} />
    </SettingsPanel>
  );
}

function AutomationPanel(): JSX.Element {
  const [prefs, setPrefs] = useState<AutomationPrefs>(DEFAULT_AUTOMATION_PREFS);
  const [notice, setNotice] = useState("Automation defaults apply to the Workflow Engine architecture.");

  return (
    <SettingsPanel title="Automation" description="Workflow defaults, AI suggestions, execution logs, history limits, and retry policy.">
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
      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — automation preferences are not persisted yet.")} />
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

  return (
    <SettingsPanel
      title="Integrations"
      description="Installed, connected, available, and future adapters across AGXORA."
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
    <SettingsPanel title="Security" description="Active sessions, trusted devices, password, 2FA, and encryption settings.">
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

      <SaveRow notice={notice} onSave={() => setNotice("Updated for this session — security preferences are not persisted yet.")} />
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
      title="API & Developers"
      description="API keys, webhooks, developer tokens, and sandbox."
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

  return (
    <SettingsPanel title="Audit Logs" description="Recent activity, security events, and system changes.">
      <DataTable columns={columns} rows={AUDIT_LOGS} rowKey={(r) => r.id} minWidth={720} />
    </SettingsPanel>
  );
}

function AdvancedPanel(): JSX.Element {
  const [experimental, setExperimental] = useState(false);
  const [notice, setNotice] = useState("Advanced actions require confirmation before applying.");

  return (
    <SettingsPanel title="Advanced" description="Experimental features, reset, import, and export.">
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
      return <OrganizationPanel />;
    case "workspace":
      return <WorkspacePanel />;
    case "team":
      return <TeamPanel />;
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
      return (
        <SettingsPanel title="Settings" description="Unknown section.">
          <EmptyState title="Not found" description="Select a section from the Control Center navigation." />
        </SettingsPanel>
      );
  }
}
