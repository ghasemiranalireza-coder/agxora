/**
 * Phase 70 — tool metadata. The LLM must not execute these.
 * Side-effect tools require server permission checks.
 */

export type AgentToolName =
  | "plan_campaign"
  | "create_content"
  | "create_email"
  | "create_social_post"
  | "create_video_script"
  | "create_content_calendar"
  | "get_connected_accounts"
  | "get_social_analytics"
  | "get_email_context"
  | "create_draft"
  | "schedule_content"
  | "publish_content"
  | "send_email"
  | "check_publish_status";

export type AgentToolDefinition = {
  readonly name: AgentToolName;
  readonly sideEffect: boolean;
  readonly requiredPermission:
    | "none"
    | "read"
    | "create_draft"
    | "schedule"
    | "publish"
    | "send_email";
  readonly description: string;
};

export const AGENT_TOOL_CATALOG: readonly AgentToolDefinition[] = [
  {
    name: "plan_campaign",
    sideEffect: false,
    requiredPermission: "none",
    description: "Create a structured campaign plan",
  },
  {
    name: "create_content",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Prepare content drafts",
  },
  {
    name: "create_email",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Prepare an email draft or campaign",
  },
  {
    name: "create_social_post",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Prepare a social post draft",
  },
  {
    name: "create_video_script",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Prepare a short-form or YouTube script",
  },
  {
    name: "create_content_calendar",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Build a dated content calendar",
  },
  {
    name: "get_connected_accounts",
    sideEffect: false,
    requiredPermission: "read",
    description: "List connected integrations (no tokens)",
  },
  {
    name: "get_social_analytics",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read official analytics when connected",
  },
  {
    name: "get_email_context",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read authorized mailbox metadata",
  },
  {
    name: "create_draft",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Persist a draft without sending",
  },
  {
    name: "schedule_content",
    sideEffect: true,
    requiredPermission: "schedule",
    description: "Schedule approved content via official API",
  },
  {
    name: "publish_content",
    sideEffect: true,
    requiredPermission: "publish",
    description: "Publish approved content via official API",
  },
  {
    name: "send_email",
    sideEffect: true,
    requiredPermission: "send_email",
    description: "Send an approved email via official API",
  },
  {
    name: "check_publish_status",
    sideEffect: false,
    requiredPermission: "read",
    description: "Verify an external publish/send result",
  },
];
