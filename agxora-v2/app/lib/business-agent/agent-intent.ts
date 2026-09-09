/**
 * Detect which Core Agent capabilities a customer goal refers to.
 * Generic words do not select a provider. Unsupported social networks stay explicit.
 */

import { getCatalogEntry, type IntegrationProviderId } from "./catalog";

export const AGENT_INTENT_KINDS = [
  "gmail",
  "youtube",
  "linkedin",
  "campaign",
  "unsupported_social",
] as const;

export type AgentIntentKind = (typeof AGENT_INTENT_KINDS)[number];

export type DetectedAgentIntent = {
  readonly kind: AgentIntentKind;
  readonly provider: IntegrationProviderId | null;
};

const INTENT_PATTERNS: readonly {
  readonly kind: AgentIntentKind;
  readonly provider: IntegrationProviderId | null;
  readonly pattern: RegExp;
}[] = [
  { kind: "gmail", provider: "email_gmail", pattern: /\b(emails?|gmail|inbox|replies?|mailbox)\b|draft (a |the )?response/i },
  { kind: "youtube", provider: "youtube", pattern: /\byoutube\b/i },
  { kind: "linkedin", provider: "linkedin", pattern: /\blinkedin\b/i },
  {
    kind: "unsupported_social",
    provider: "instagram",
    pattern: /\binstagram\b/i,
  },
  { kind: "unsupported_social", provider: "tiktok", pattern: /\btiktok\b/i },
  { kind: "unsupported_social", provider: "facebook", pattern: /\bfacebook\b/i },
  { kind: "unsupported_social", provider: "x", pattern: /\b(?:\bx\b|twitter)\b/i },
  {
    kind: "campaign",
    provider: null,
    pattern: /\b(campaign|content calendar|content-calendar)\b/i,
  },
];

export type AgentCapabilityCode =
  | "ok"
  | "unsupported"
  | "not_connected"
  | "permission_required"
  | "approval_required";

export type AgentCapabilityResult = {
  readonly kind: AgentIntentKind;
  readonly provider: IntegrationProviderId | null;
  readonly label: string;
  readonly implemented: boolean;
  readonly connected: boolean;
  readonly code: AgentCapabilityCode;
  readonly tools: readonly string[];
  readonly requiresApproval: boolean;
  readonly message: string;
};

export type IntegrationCapabilitySnapshot = {
  readonly provider: IntegrationProviderId;
  readonly label: string;
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly connected: boolean;
  readonly canRead: boolean;
  readonly canCreateDraft: boolean;
  readonly canPublish: boolean;
  readonly canSendEmail: boolean;
};

export function detectAgentIntents(goal: string): readonly DetectedAgentIntent[] {
  const found: DetectedAgentIntent[] = [];
  for (const item of INTENT_PATTERNS) {
    if (!item.pattern.test(goal)) continue;
    if (found.some((row) => row.kind === item.kind && row.provider === item.provider)) {
      continue;
    }
    found.push({ kind: item.kind, provider: item.provider });
  }
  return found;
}

function snapshotFor(
  provider: IntegrationProviderId,
  snapshots: readonly IntegrationCapabilitySnapshot[],
): IntegrationCapabilitySnapshot | null {
  return snapshots.find((row) => row.provider === provider) ?? null;
}

export function describeGmailIntent(
  snapshot: IntegrationCapabilitySnapshot | null,
): AgentCapabilityResult {
  const catalog = getCatalogEntry("email_gmail");
  const connected = Boolean(snapshot?.connected);
  const canRead = Boolean(snapshot?.canRead);
  const canDraft = Boolean(snapshot?.canCreateDraft);
  const tools: string[] = [];
  if (connected && canRead) {
    tools.push("gmail.list_messages", "gmail.get_message");
  }
  if (connected && canDraft) {
    tools.push("gmail.create_draft");
  }
  if (!connected) {
    return {
      kind: "gmail",
      provider: "email_gmail",
      label: catalog.label,
      implemented: true,
      connected: false,
      code: "not_connected",
      tools,
      requiresApproval: true,
      message:
        "Connect Gmail to continue. AGXORA will send you to Google to approve access, then bring you back. Sending stays blocked until you approve and Gmail confirms.",
    };
  }
  if (!canRead && !canDraft) {
    return {
      kind: "gmail",
      provider: "email_gmail",
      label: catalog.label,
      implemented: true,
      connected: true,
      code: "permission_required",
      tools,
      requiresApproval: true,
      message: "Gmail is connected, but read and draft access are turned off for this workspace.",
    };
  }
  return {
    kind: "gmail",
    provider: "email_gmail",
    label: catalog.label,
    implemented: true,
    connected: true,
    code: "approval_required",
    tools,
    requiresApproval: true,
    message:
      "Gmail read and draft can run when permitted. Sending stays blocked until you approve, enable send permission, and Gmail confirms.",
  };
}

export function describeYouTubeIntent(
  snapshot: IntegrationCapabilitySnapshot | null,
): AgentCapabilityResult {
  const catalog = getCatalogEntry("youtube");
  const connected = Boolean(snapshot?.connected);
  const canPublish = Boolean(snapshot?.canPublish);
  if (!connected) {
    return {
      kind: "youtube",
      provider: "youtube",
      label: catalog.label,
      implemented: true,
      connected: false,
      code: "not_connected",
      tools: ["create_video_script"],
      requiresApproval: true,
      message:
        "Connect YouTube to continue. Publishing a video stays blocked until you approve it and YouTube confirms.",
    };
  }
  if (!canPublish) {
    return {
      kind: "youtube",
      provider: "youtube",
      label: catalog.label,
      implemented: true,
      connected: true,
      code: "permission_required",
      tools: ["create_video_script"],
      requiresApproval: true,
      message:
        "YouTube is connected, but publish permission is off. A video plan can be prepared; publishing stays blocked until you enable permission, approve, and YouTube confirms.",
    };
  }
  return {
    kind: "youtube",
    provider: "youtube",
    label: catalog.label,
    implemented: true,
    connected: true,
    code: "approval_required",
    tools: ["create_video_script", "publish_content"],
    requiresApproval: true,
    message:
      "YouTube is connected. AGXORA can prepare a video plan. Publishing stays blocked until you approve and YouTube confirms the upload.",
  };
}

export function describeLinkedInIntent(
  snapshot: IntegrationCapabilitySnapshot | null,
): AgentCapabilityResult {
  const catalog = getCatalogEntry("linkedin");
  const implemented = snapshot?.implementationStatus === "oauth_ready";
  if (!implemented) {
    return {
      kind: "linkedin",
      provider: "linkedin",
      label: catalog.label,
      implemented: false,
      connected: false,
      code: "unsupported",
      tools: [],
      requiresApproval: true,
      message:
        "LinkedIn posting is not available in this AGXORA environment yet. Nothing was published.",
    };
  }
  if (!snapshot?.connected) {
    return {
      kind: "linkedin",
      provider: "linkedin",
      label: catalog.label,
      implemented: true,
      connected: false,
      code: "not_connected",
      tools: ["create_social_post"],
      requiresApproval: true,
      message: "Connect LinkedIn to continue. Publishing stays blocked until you approve it.",
    };
  }
  return {
    kind: "linkedin",
    provider: "linkedin",
    label: catalog.label,
    implemented: true,
    connected: true,
    code: "approval_required",
    tools: ["create_social_post"],
    requiresApproval: true,
    message:
      "LinkedIn is connected. AGXORA can prepare a post. Publishing stays blocked until you approve and LinkedIn confirms.",
  };
}

export function describeUnsupportedSocialIntent(
  provider: IntegrationProviderId,
): AgentCapabilityResult {
  const catalog = getCatalogEntry(provider);
  return {
    kind: "unsupported_social",
    provider,
    label: catalog.label,
    implemented: false,
    connected: false,
    code: "unsupported",
    tools: [],
    requiresApproval: false,
    message: `${catalog.label} is not available in AGXORA yet. Nothing was connected or published.`,
  };
}

export function describeCampaignIntent(): AgentCapabilityResult {
  return {
    kind: "campaign",
    provider: null,
    label: "Campaign",
    implemented: true,
    connected: false,
    code: "approval_required",
    tools: ["plan_campaign", "create_content", "create_content_calendar"],
    requiresApproval: true,
    message:
      "A campaign plan can be created for this workspace. Content is not generated yet. Publishing stays blocked until you approve a supported provider.",
  };
}

export function resolveAgentIntentResults(input: {
  readonly goal: string;
  readonly integrations: readonly IntegrationCapabilitySnapshot[];
}): readonly AgentCapabilityResult[] {
  const intents = detectAgentIntents(input.goal);
  return intents.map((intent) => {
    if (intent.kind === "gmail") {
      return describeGmailIntent(snapshotFor("email_gmail", input.integrations));
    }
    if (intent.kind === "youtube") {
      return describeYouTubeIntent(snapshotFor("youtube", input.integrations));
    }
    if (intent.kind === "linkedin") {
      return describeLinkedInIntent(snapshotFor("linkedin", input.integrations));
    }
    if (intent.kind === "unsupported_social" && intent.provider) {
      return describeUnsupportedSocialIntent(intent.provider);
    }
    return describeCampaignIntent();
  });
}

export function agentPlanMessage(results: readonly AgentCapabilityResult[]): string {
  if (results.length === 0) {
    return "Plan created. External publish and send stay blocked until approval and a supported provider.";
  }
  return results.map((item) => item.message).join(" ");
}
