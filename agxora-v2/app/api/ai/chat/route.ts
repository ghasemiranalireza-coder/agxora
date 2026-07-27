/**
 * POST /api/ai/chat — non-streaming completion (secrets stay server-side).
 */

import { NextResponse } from "next/server";
import type { AIRuntimeContext } from "../../../lib/ai/AIContext";
import type { AIProviderId } from "../../../lib/ai/AIModel";
import type { AISettings } from "../../../lib/ai/AISettings";
import { AIError, toAIError } from "../../../lib/ai/AIErrorHandler";
import { runServerGeneration } from "../../../lib/ai/server/runGeneration";

export const runtime = "nodejs";

interface ChatBody {
  readonly context: AIRuntimeContext;
  readonly settings?: Partial<AISettings>;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.context?.userPrompt || typeof body.context.userPrompt !== "string") {
    return NextResponse.json({ error: "userPrompt required" }, { status: 400 });
  }

  try {
    const response = await runServerGeneration({
      context: body.context,
      settings: body.settings,
      providerId: body.providerId,
      modelId: body.modelId,
      signal: request.signal,
      stream: false,
    });

    return NextResponse.json({
      content: response.content,
      providerId: response.providerId,
      modelId: response.modelId,
      usage: response.usage,
      finishReason: response.finishReason,
    });
  } catch (error) {
    const aiError =
      error instanceof AIError ? error : toAIError(error, body.providerId);
    return NextResponse.json(
      {
        error: {
          code: aiError.code,
          message: aiError.message,
          retryable: aiError.retryable,
        },
      },
      { status: aiError.code === "PROVIDER_NOT_CONFIGURED" ? 400 : 502 },
    );
  }
}
