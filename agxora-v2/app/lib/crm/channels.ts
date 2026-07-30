import type { ChannelAdapterPlan } from "./types";

/**
 * Communication Hub — scalable channel adapter registry.
 * Placeholders only. No fake live integrations.
 * Future: Email, WhatsApp, Instagram, Facebook, TikTok, LinkedIn,
 * Telegram, Voice, Video via provider adapters.
 */
export const COMMUNICATION_CHANNELS: readonly ChannelAdapterPlan[] = [
  {
    id: "email",
    channel: "Email",
    category: "email",
    status: "ready",
    adapter: "EmailAdapter",
    notes: "IMAP / SMTP / Microsoft Graph / Gmail API hooks reserved.",
  },
  {
    id: "whatsapp",
    channel: "WhatsApp",
    category: "messaging",
    status: "planned",
    adapter: "WhatsAppBusinessAdapter",
    notes: "Meta Cloud API adapter interface reserved.",
  },
  {
    id: "instagram",
    channel: "Instagram",
    category: "social",
    status: "planned",
    adapter: "InstagramMessagingAdapter",
    notes: "DM + comments inbox adapter reserved.",
  },
  {
    id: "facebook",
    channel: "Facebook",
    category: "social",
    status: "planned",
    adapter: "FacebookPagesAdapter",
    notes: "Pages messaging adapter reserved.",
  },
  {
    id: "tiktok",
    channel: "TikTok",
    category: "social",
    status: "planned",
    adapter: "TikTokBusinessAdapter",
    notes: "Business messaging / inbox adapter reserved.",
  },
  {
    id: "linkedin",
    channel: "LinkedIn",
    category: "social",
    status: "planned",
    adapter: "LinkedInMessagingAdapter",
    notes: "Conversations API adapter reserved.",
  },
  {
    id: "telegram",
    channel: "Telegram",
    category: "messaging",
    status: "planned",
    adapter: "TelegramBotAdapter",
    notes: "Bot API adapter reserved.",
  },
  {
    id: "voice",
    channel: "Voice Calls",
    category: "voice",
    status: "planned",
    adapter: "VoiceCallAdapter",
    notes: "PSTN / VoIP provider adapter reserved.",
  },
  {
    id: "video",
    channel: "Video Calls",
    category: "video",
    status: "planned",
    adapter: "VideoCallAdapter",
    notes: "WebRTC / meeting provider adapter reserved.",
  },
] as const;

/** Contract every channel adapter must implement later. */
export interface ChannelAdapterContract {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<"ok" | "degraded" | "down">;
}
