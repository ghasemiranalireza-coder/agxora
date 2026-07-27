/**
 * Future vision architecture — interfaces only.
 * Image understanding, screenshot analysis, document OCR.
 * No implementation in this phase.
 */

export type AIVisionTask =
  | "understand"
  | "screenshot"
  | "ocr"
  | "document";

export interface AIVisionAnalyzeRequest {
  readonly task: AIVisionTask;
  readonly prompt?: string;
  readonly imageUrls?: readonly string[];
  readonly imageBase64?: readonly string[];
  readonly mimeType?: string;
  readonly modelId?: string;
  readonly signal?: AbortSignal;
}

export interface AIVisionAnalyzeResult {
  readonly text: string;
  readonly task: AIVisionTask;
  readonly structured?: Readonly<Record<string, unknown>>;
}

/**
 * Vision capability contract — providers may implement later.
 */
export interface AIVisionCapability {
  readonly supported: boolean;
  analyze(request: AIVisionAnalyzeRequest): Promise<AIVisionAnalyzeResult>;
}

/** Placeholder — vision is architecture-ready, not networked. */
export const visionArchitectureReady = true as const;
