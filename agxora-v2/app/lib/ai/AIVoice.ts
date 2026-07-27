/**
 * Future voice architecture — interfaces only.
 * Speech-to-text, text-to-speech, realtime conversation.
 * No implementation in this phase.
 */

export type AIVoiceMode = "off" | "push-to-talk" | "realtime";

export interface AISpeechToTextRequest {
  readonly audioBase64?: string;
  readonly audioUrl?: string;
  readonly mimeType?: string;
  readonly language?: string;
  readonly signal?: AbortSignal;
}

export interface AISpeechToTextResult {
  readonly text: string;
  readonly confidence?: number;
  readonly language?: string;
}

export interface AITextToSpeechRequest {
  readonly text: string;
  readonly voiceId?: string;
  readonly language?: string;
  readonly signal?: AbortSignal;
}

export interface AITextToSpeechResult {
  readonly audioBase64: string;
  readonly mimeType: string;
  readonly voiceId?: string;
}

export interface AIRealtimeSessionConfig {
  readonly conversationId: string;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly voiceId?: string;
}

export interface AIRealtimeSession {
  readonly id: string;
  readonly status: "idle" | "connecting" | "open" | "closed" | "error";
  start(): Promise<void>;
  stop(): Promise<void>;
  sendAudio?(chunk: ArrayBuffer): void;
  onTranscript?(handler: (text: string, final: boolean) => void): void;
  onAudio?(handler: (chunk: ArrayBuffer) => void): void;
}

/**
 * Voice capability contract — providers may implement later.
 */
export interface AIVoiceCapability {
  readonly supported: boolean;
  transcribe(request: AISpeechToTextRequest): Promise<AISpeechToTextResult>;
  speak(request: AITextToSpeechRequest): Promise<AITextToSpeechResult>;
  createRealtimeSession?(
    config: AIRealtimeSessionConfig,
  ): Promise<AIRealtimeSession>;
}

/** Placeholder — voice is architecture-ready, not networked. */
export const voiceArchitectureReady = true as const;
