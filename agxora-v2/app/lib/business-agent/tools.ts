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
  | "check_publish_status"
  | "gmail.list_messages"
  | "gmail.get_message"
  | "gmail.create_draft"
  | "gmail.send_message"
  | "amazon.list_marketplaces"
  | "amazon.list_listings"
  | "amazon.list_inventory"
  | "amazon.list_orders"
  | "amazon.list_sales"
  | "amazon.list_pricing"
  | "amazon.analyze"
  | "amazon.update_price"
  | "amazon.update_inventory"
  | "amazon.update_listing";

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
  {
    name: "gmail.list_messages",
    sideEffect: false,
    requiredPermission: "read",
    description: "List or search Gmail messages via the official Gmail API",
  },
  {
    name: "gmail.get_message",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read one Gmail message via the official Gmail API",
  },
  {
    name: "gmail.create_draft",
    sideEffect: false,
    requiredPermission: "create_draft",
    description: "Create a Gmail draft via the official Gmail API (does not send)",
  },
  {
    name: "gmail.send_message",
    sideEffect: true,
    requiredPermission: "send_email",
    description:
      "Send email via Gmail only after approval, canSendEmail, and Gmail confirmation",
  },
  {
    name: "amazon.list_marketplaces",
    sideEffect: false,
    requiredPermission: "read",
    description: "List Amazon marketplaces the seller participates in via SP-API",
  },
  {
    name: "amazon.list_listings",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read Amazon listings via the official Listings Items API",
  },
  {
    name: "amazon.list_inventory",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read FBA inventory summaries via the official SP-API",
  },
  {
    name: "amazon.list_orders",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read Amazon orders without buyer PII via the official Orders API",
  },
  {
    name: "amazon.list_sales",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read aggregated Amazon sales metrics via the official Sales API",
  },
  {
    name: "amazon.list_pricing",
    sideEffect: false,
    requiredPermission: "read",
    description: "Read Amazon listing prices via the official Product Pricing API",
  },
  {
    name: "amazon.analyze",
    sideEffect: false,
    requiredPermission: "read",
    description: "Analyze real Amazon seller data for low inventory and listing issues",
  },
  {
    name: "amazon.update_price",
    sideEffect: true,
    requiredPermission: "publish",
    description: "Amazon price changes are not implemented",
  },
  {
    name: "amazon.update_inventory",
    sideEffect: true,
    requiredPermission: "publish",
    description: "Amazon inventory changes are not implemented",
  },
  {
    name: "amazon.update_listing",
    sideEffect: true,
    requiredPermission: "publish",
    description: "Amazon listing changes are not implemented",
  },
];
