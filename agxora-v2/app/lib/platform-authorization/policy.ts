/**
 * External-platform authorization policy.
 *
 * AGB acceptance, privacy acknowledgement, marketing consent, platform OAuth,
 * AI content, and automatic publishing are separate decisions. This module
 * never stores passwords or tokens.
 */

import { toCanonicalProviderId } from "@/app/lib/integrations/ids";
import type { WorkspacePermissionFlags } from "@/app/lib/integrations/permission-flags";
import { getProviderDefinition } from "@/app/lib/integrations/registry";
import type { ProviderCapability } from "@/app/lib/integrations/types";

export const LEGAL_FRAMEWORK_DOCUMENT = "agxora-legal-framework";
export const LEGAL_FRAMEWORK_VERSION = "1.1";
export const PLATFORM_AUTHORIZATION_VERSION = "1.0";

export const AUTHORIZATION_TYPES = [
  "agb",
  "privacy",
  "platform",
  "ai_content",
  "automatic_publishing",
  "marketing",
] as const;

export type AuthorizationType = (typeof AUTHORIZATION_TYPES)[number];

export const PLATFORM_PERMISSION_KEYS = [
  "connect_account",
  "read_content",
  "create_content",
  "publish_posts",
  "schedule_posts",
  "edit_posts",
  "delete_posts",
  "read_comments",
  "reply_comments",
  "read_messages",
  "reply_messages",
  "read_analytics",
  "use_media",
  "send_email",
  "create_ai_content",
  "auto_publish_ai",
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSION_KEYS)[number];

const PERMISSION_LABELS_DE: Record<PlatformPermissionKey, string> = {
  connect_account: "Konto verbinden",
  read_content: "Inhalte lesen",
  create_content: "Inhalte erstellen",
  publish_posts: "Beiträge veröffentlichen",
  schedule_posts: "Beiträge planen",
  edit_posts: "Beiträge bearbeiten",
  delete_posts: "Beiträge löschen",
  read_comments: "Kommentare lesen",
  reply_comments: "Kommentare beantworten",
  read_messages: "Nachrichten lesen",
  reply_messages: "Nachrichten beantworten",
  read_analytics: "Analytics/Statistiken lesen",
  use_media: "Medien verwenden",
  send_email: "E-Mails senden",
  create_ai_content: "KI-Inhalte erstellen",
  auto_publish_ai: "KI-Inhalte automatisch veröffentlichen",
};

const SECRET_KEY = /password|passwd|secret|token|verifier|credential/i;

type CapabilityRule = {
  readonly capability: ProviderCapability;
  readonly key: PlatformPermissionKey;
  readonly communicationKey?: PlatformPermissionKey;
};

const CAPABILITY_RULES: readonly CapabilityRule[] = [
  { capability: "connect", key: "connect_account" },
  { capability: "read", key: "read_content", communicationKey: "read_messages" },
  { capability: "create", key: "create_content" },
  { capability: "publish", key: "publish_posts" },
  { capability: "schedule", key: "schedule_posts" },
  { capability: "update", key: "edit_posts" },
  { capability: "delete", key: "delete_posts" },
  { capability: "analyze", key: "read_analytics" },
  { capability: "upload", key: "use_media" },
  { capability: "send", key: "send_email", communicationKey: "send_email" },
];

export type ExplicitAuthorizationInput = {
  readonly confirmed: boolean;
  readonly permissions: readonly string[];
  readonly aiContent: boolean;
  readonly automaticPublishing: boolean;
  readonly automaticPublishingConfirmed: boolean;
  readonly accountLabel: string | null;
};

export type AuthorizationDecision =
  | {
      readonly ok: true;
      readonly permissions: readonly PlatformPermissionKey[];
      readonly aiContent: boolean;
      readonly automaticPublishing: boolean;
      readonly confirmationText: string;
      readonly aiConfirmationText: string | null;
      readonly automaticPublishingText: string | null;
      readonly oauthScopes: readonly string[];
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly message: string;
    };

export function permissionLabel(key: PlatformPermissionKey): string {
  return PERMISSION_LABELS_DE[key];
}

export function isPlatformPermissionKey(value: string): value is PlatformPermissionKey {
  return (PLATFORM_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function supportedPermissionKeys(provider: string): readonly PlatformPermissionKey[] {
  const canonical = toCanonicalProviderId(provider);
  if (!canonical) return [];
  if (canonical === "instagram") {
    return ["connect_account", "read_content", "publish_posts"];
  }
  let definition;
  try {
    definition = getProviderDefinition(canonical);
  } catch {
    return [];
  }
  const implemented = new Set(definition.implementedCapabilities);
  const keys: PlatformPermissionKey[] = [];
  for (const rule of CAPABILITY_RULES) {
    if (!implemented.has(rule.capability)) continue;
    const key =
      definition.category === "communication" && rule.communicationKey
        ? rule.communicationKey
        : rule.key;
    if (!keys.includes(key)) keys.push(key);
  }
  if (implemented.has("create") || implemented.has("publish")) {
    keys.push("create_ai_content");
  }
  if (implemented.has("publish")) {
    keys.push("auto_publish_ai");
  }
  return keys;
}

export function flagsFromPermissionKeys(
  keys: readonly string[],
): WorkspacePermissionFlags {
  const set = new Set(keys);
  return {
    canRead:
      set.has("read_content") ||
      set.has("read_messages") ||
      set.has("read_comments") ||
      set.has("read_analytics"),
    canCreateDraft: set.has("create_content"),
    canSchedule: set.has("schedule_posts"),
    canPublish: set.has("publish_posts"),
    canSendEmail: set.has("send_email") || set.has("reply_messages"),
    canDelete: set.has("delete_posts"),
  };
}

export function permissionKeysFromFlags(
  provider: string,
  flags: WorkspacePermissionFlags,
): readonly PlatformPermissionKey[] {
  const supported = new Set(supportedPermissionKeys(provider));
  const selected: PlatformPermissionKey[] = [];
  const consider = (key: PlatformPermissionKey, enabled: boolean) => {
    if (enabled && supported.has(key)) selected.push(key);
  };
  consider("connect_account", true);
  consider("read_content", flags.canRead);
  consider("read_messages", flags.canRead);
  consider("create_content", flags.canCreateDraft);
  consider("schedule_posts", flags.canSchedule);
  consider("publish_posts", flags.canPublish);
  consider("send_email", flags.canSendEmail);
  consider("delete_posts", flags.canDelete);
  return selected;
}

const GMAIL_SCOPE = {
  identity: "openid email",
  read: "https://www.googleapis.com/auth/gmail.readonly",
  create: "https://www.googleapis.com/auth/gmail.compose",
  send: "https://www.googleapis.com/auth/gmail.send",
} as const;

const YOUTUBE_SCOPE = {
  read: "https://www.googleapis.com/auth/youtube.readonly",
  upload: "https://www.googleapis.com/auth/youtube.upload",
} as const;

const INSTAGRAM_SCOPE = {
  basic: "instagram_business_basic",
  publish: "instagram_business_content_publish",
} as const;

export function oauthScopesForPermissions(
  provider: string,
  keys: readonly string[],
): readonly string[] {
  const canonical = toCanonicalProviderId(provider);
  const set = new Set(keys);
  if (canonical === "gmail") {
    const scopes = new Set<string>();
    if (set.has("read_messages") || set.has("read_content")) scopes.add(GMAIL_SCOPE.read);
    if (set.has("create_content")) scopes.add(GMAIL_SCOPE.create);
    if (set.has("send_email") || set.has("reply_messages")) scopes.add(GMAIL_SCOPE.send);
    if (scopes.size === 0) {
      for (const scope of GMAIL_SCOPE.identity.split(" ")) scopes.add(scope);
    }
    return [...scopes];
  }
  if (canonical === "youtube") {
    const scopes = new Set<string>();
    if (set.has("read_content") || set.has("read_analytics")) scopes.add(YOUTUBE_SCOPE.read);
    if (
      set.has("create_content") ||
      set.has("publish_posts") ||
      set.has("use_media")
    ) {
      scopes.add(YOUTUBE_SCOPE.upload);
    }
    if (scopes.size === 0) scopes.add(YOUTUBE_SCOPE.read);
    return [...scopes];
  }
  if (canonical === "instagram") {
    const scopes = new Set<string>();
    if (set.has("connect_account") || set.has("read_content")) scopes.add(INSTAGRAM_SCOPE.basic);
    if (set.has("publish_posts") || set.has("create_content") || set.has("use_media")) {
      scopes.add(INSTAGRAM_SCOPE.publish);
    }
    return [...scopes];
  }
  return [];
}

export function intersectWithOAuthScopes(
  provider: string,
  granted: readonly PlatformPermissionKey[],
  oauthScopes: readonly string[],
): readonly PlatformPermissionKey[] {
  if (oauthScopes.length === 0) return granted;
  const haystack = oauthScopes.join(" ");
  const covers = (fragment: string) => haystack.includes(fragment);
  return granted.filter((key) => {
    if (key === "create_ai_content" || key === "auto_publish_ai" || key === "connect_account") {
      return true;
    }
    const canonical = toCanonicalProviderId(provider);
    if (canonical === "gmail") {
      if (key === "read_messages" || key === "read_content") return covers("gmail.readonly") || covers("gmail.modify");
      if (key === "create_content") return covers("gmail.compose") || covers("gmail.modify");
      if (key === "send_email" || key === "reply_messages") return covers("gmail.send") || covers("gmail.modify");
    }
    if (canonical === "youtube") {
      if (key === "read_content" || key === "read_analytics") return covers("youtube.readonly");
      if (key === "publish_posts" || key === "create_content" || key === "use_media") {
        return covers("youtube.upload");
      }
    }
    if (canonical === "instagram") {
      if (key === "read_content") return covers("instagram_business_basic");
      if (key === "publish_posts" || key === "create_content" || key === "use_media") {
        return covers("instagram_business_content_publish");
      }
    }
    return true;
  });
}

export function containsSecretMaterial(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) return true;
    if (containsSecretMaterial(nested)) return true;
  }
  return false;
}

export function redactAuthorizationMetadata(
  value: unknown,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) continue;
    if (nested && typeof nested === "object") {
      output[key] = redactAuthorizationMetadata(nested);
    } else {
      output[key] = nested;
    }
  }
  return output;
}

function providerDisplayName(provider: string): string {
  const canonical = toCanonicalProviderId(provider);
  if (!canonical) return provider;
  try {
    return getProviderDefinition(canonical).displayName;
  } catch {
    return provider;
  }
}

export function buildPlatformConfirmation(input: {
  readonly provider: string;
  readonly accountLabel: string | null;
  readonly permissions: readonly PlatformPermissionKey[];
  readonly aiContent: boolean;
  readonly automaticPublishing: boolean;
}): string {
  const platform = providerDisplayName(input.provider);
  const account = input.accountLabel ? ` (${input.accountLabel})` : "";
  const labels = input.permissions.map((key) => permissionLabel(key)).join(", ");
  return [
    `Ich erteile AGXORA ausdrücklich die Berechtigung, das von mir ausgewählte Konto${account} auf ${platform} über die von der Plattform bereitgestellte API/OAuth-Schnittstelle zu verbinden und ausschließlich die von mir freigegebenen Funktionen und Berechtigungen zu verwenden: ${labels}.`,
    `KI-generierte Inhalte: ${input.aiContent ? "ja" : "nein"}.`,
    `Automatische Veröffentlichung: ${input.automaticPublishing ? "ja" : "nein"}.`,
    "Diese Berechtigung ist unabhängig von der Annahme der AGXORA-AGB und kann jederzeit widerrufen werden.",
  ].join(" ");
}

export function buildAiContentConfirmation(provider: string): string {
  return `Ich erlaube AGXORA, auf Grundlage meiner Einstellungen und meiner freigegebenen Inhalte KI-generierte Inhalte für ${providerDisplayName(provider)} zu erstellen.`;
}

export function buildAutomaticPublishingConfirmation(input: {
  readonly provider: string;
  readonly accountLabel: string | null;
  readonly contentTypes: readonly string[];
  readonly frequency: string | null;
}): string {
  const account = input.accountLabel ? ` (${input.accountLabel})` : "";
  const types = input.contentTypes.length > 0 ? input.contentTypes.join(", ") : "freigegebene Inhalte";
  const frequency = input.frequency ? ` Häufigkeit/Einstellungen: ${input.frequency}.` : "";
  return `Ich erlaube AGXORA, von meinen Einstellungen erfasste bzw. von mir freigegebene KI-generierte Inhalte automatisch auf ${providerDisplayName(input.provider)}${account} zu veröffentlichen. Inhaltsarten: ${types}.${frequency}`;
}

export function parseExplicitAuthorization(
  body: unknown,
): ExplicitAuthorizationInput | null {
  if (!body || typeof body !== "object") return null;
  if (containsSecretMaterial(body)) return null;
  const record = body as Record<string, unknown>;
  const permissions = Array.isArray(record.permissions)
    ? record.permissions.filter((item): item is string => typeof item === "string")
    : [];
  return {
    confirmed: record.confirmed === true,
    permissions,
    aiContent: record.aiContent === true,
    automaticPublishing: record.automaticPublishing === true,
    automaticPublishingConfirmed: record.automaticPublishingConfirmed === true,
    accountLabel: typeof record.accountLabel === "string" ? record.accountLabel : null,
  };
}

export function evaluateConnectAuthorization(input: {
  readonly provider: string;
  readonly request: ExplicitAuthorizationInput | null;
}): AuthorizationDecision {
  if (!input.request) {
    return {
      ok: false,
      code: "explicit_authorization_required",
      message:
        "Explicit platform authorization is required and is separate from AGB acceptance.",
    };
  }
  if (containsSecretMaterial(input.request)) {
    return {
      ok: false,
      code: "secret_material_rejected",
      message: "External passwords and tokens must not be submitted.",
    };
  }
  if (!input.request.confirmed) {
    return {
      ok: false,
      code: "explicit_authorization_required",
      message:
        "Explicit platform authorization is required and is separate from AGB acceptance.",
    };
  }

  const supported = supportedPermissionKeys(input.provider);
  const supportedSet = new Set<string>(supported);
  const unknown = input.request.permissions.filter((key) => !supportedSet.has(key));
  if (unknown.length > 0) {
    return {
      ok: false,
      code: "permission_not_supported",
      message: `Permission is not supported by this platform: ${unknown.join(", ")}`,
    };
  }
  if (!input.request.permissions.includes("connect_account")) {
    return {
      ok: false,
      code: "connect_permission_required",
      message: "Connecting an account requires the connect permission.",
    };
  }

  const permissions = input.request.permissions.filter(isPlatformPermissionKey);
  const aiContent = input.request.aiContent && supportedSet.has("create_ai_content");
  if (input.request.aiContent && !supportedSet.has("create_ai_content")) {
    return {
      ok: false,
      code: "ai_not_supported",
      message: "AI content is not available for this platform integration.",
    };
  }
  if (input.request.automaticPublishing) {
    if (!input.request.automaticPublishingConfirmed) {
      return {
        ok: false,
        code: "automatic_publishing_confirmation_required",
        message: "Automatic publishing requires a separate explicit confirmation.",
      };
    }
    if (!supportedSet.has("publish_posts") || !permissions.includes("publish_posts")) {
      return {
        ok: false,
        code: "automatic_publishing_not_authorized",
        message: "Automatic publishing requires an explicit publish permission for this platform.",
      };
    }
  }

  const granted = [
    ...permissions,
    ...(aiContent ? (["create_ai_content"] as const) : []),
    ...(input.request.automaticPublishing ? (["auto_publish_ai"] as const) : []),
  ];
  const unique = [...new Set(granted)];
  return {
    ok: true,
    permissions: unique,
    aiContent,
    automaticPublishing: input.request.automaticPublishing,
    confirmationText: buildPlatformConfirmation({
      provider: input.provider,
      accountLabel: input.request.accountLabel,
      permissions: unique,
      aiContent,
      automaticPublishing: input.request.automaticPublishing,
    }),
    aiConfirmationText: aiContent ? buildAiContentConfirmation(input.provider) : null,
    automaticPublishingText: input.request.automaticPublishing
      ? buildAutomaticPublishingConfirmation({
          provider: input.provider,
          accountLabel: input.request.accountLabel,
          contentTypes: ["freigegebene Beiträge"],
          frequency: null,
        })
      : null,
    oauthScopes: oauthScopesForPermissions(input.provider, unique),
  };
}

export function assertSameTenant(
  actorOrganizationId: string,
  recordOrganizationId: string,
): boolean {
  return actorOrganizationId.length > 0 && actorOrganizationId === recordOrganizationId;
}

export function tenantScopedWhere(input: {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly provider: string;
}): {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly provider: string;
} {
  return {
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    provider: input.provider,
  };
}

export type PublicConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "revoked"
  | "error"
  | "pending"
  | "not_connected";

export function classifyConnectionStatus(input: {
  readonly authorizationStatus: string | null;
  readonly connectionStatus: string | null;
  readonly revokedAt: Date | null;
  readonly accessTokenExpiresAt: Date | null;
  readonly hasRefreshToken: boolean;
  readonly now: Date;
}): PublicConnectionStatus {
  if (input.authorizationStatus === "revoked" || input.revokedAt) return "revoked";
  if (input.authorizationStatus === "expired") return "expired";
  if (
    input.accessTokenExpiresAt &&
    input.accessTokenExpiresAt.getTime() <= input.now.getTime() &&
    !input.hasRefreshToken
  ) {
    return "expired";
  }
  if (input.authorizationStatus === "error" || input.connectionStatus === "error") {
    return "error";
  }
  if (
    input.authorizationStatus === "disconnected" ||
    input.connectionStatus === "disconnected"
  ) {
    return "disconnected";
  }
  if (input.authorizationStatus === "connected" || input.connectionStatus === "connected") {
    return "connected";
  }
  if (input.authorizationStatus === "pending") return "pending";
  return "not_connected";
}

export function canExecuteAutomaticPublishing(input: {
  readonly status: PublicConnectionStatus;
  readonly automaticPublishingAuthorized: boolean;
  readonly publishGranted: boolean;
  readonly sameTenant: boolean;
}): boolean {
  return (
    input.sameTenant &&
    input.status === "connected" &&
    input.automaticPublishingAuthorized &&
    input.publishGranted
  );
}

export function needsLegalReacceptance(input: {
  readonly acceptedVersion: string | null;
  readonly currentVersion: string;
}): boolean {
  return input.acceptedVersion !== input.currentVersion;
}

export function agbAcceptanceGrantsPlatformAccess(): false {
  return false;
}

export function unsupportedFlagUpdates(input: {
  readonly provider: string;
  readonly flags: Partial<WorkspacePermissionFlags>;
}): readonly string[] {
  const supported = new Set(supportedPermissionKeys(input.provider));
  const rejected: string[] = [];
  const check = (flag: boolean | undefined, key: PlatformPermissionKey, name: string) => {
    if (flag === true && !supported.has(key)) rejected.push(name);
  };
  if (
    input.flags.canRead === true &&
    !supported.has("read_content") &&
    !supported.has("read_messages") &&
    !supported.has("read_comments") &&
    !supported.has("read_analytics")
  ) {
    rejected.push("canRead");
  }
  check(input.flags.canCreateDraft, "create_content", "canCreateDraft");
  check(input.flags.canSchedule, "schedule_posts", "canSchedule");
  check(input.flags.canPublish, "publish_posts", "canPublish");
  check(input.flags.canSendEmail, "send_email", "canSendEmail");
  check(input.flags.canDelete, "delete_posts", "canDelete");
  return rejected;
}
