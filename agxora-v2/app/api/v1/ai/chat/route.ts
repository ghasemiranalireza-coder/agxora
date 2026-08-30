/**
 * POST /api/v1/ai/chat — authenticated server-side AI chat generation.
 */

import { NextResponse } from "next/server";
import type { AIRuntimeContext } from "@/app/lib/ai/AIContext";
import { AIError } from "@/app/lib/ai/AIErrorHandler";
import type { AIProviderId } from "@/app/lib/ai/AIModel";
import type { AISettings } from "@/app/lib/ai/AISettings";
import { generateServerAiChatForActor } from "@/app/lib/ai/serverChat";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

type AiChatRequestBody = {
  readonly context: AIRuntimeContext;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
  readonly settings?: Partial<AISettings>;
  readonly preferredLocale?: string;
};

function jsonAiError(error: unknown): NextResponse {
  if (error instanceof AIError) {
    const status =
      error.code === "PROVIDER_NOT_CONFIGURED"
        ? 503
        : error.code === "RATE_LIMITED"
          ? 429
          : error.code === "ABORTED"
            ? 499
            : 502;
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
        providerId: error.providerId,
      },
      { status },
    );
  }
  return jsonError(error);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const actor = await requireCurrentActor();

    const limited = await rateLimitResponse({
      request,
      policyId: "ai.chat",
      userId: actor.userId,
    });
    if (limited) return limited;

    const body = (await request.json()) as AiChatRequestBody;
    if (!body.context?.userPrompt?.trim()) {
      return NextResponse.json(
        { ok: false, code: "validation", message: "userPrompt is required" },
        { status: 400 },
      );
    }

    const response = await generateServerAiChatForActor(actor, {
      context: body.context,
      providerId: body.providerId,
      modelId: body.modelId,
      settings: body.settings,
      preferredLocale:
        typeof body.preferredLocale === "string" ? body.preferredLocale : undefined,
    });

    return NextResponse.json({
      ok: true,
      organizationId: actor.organizationId,
      content: response.content,
      providerId: response.providerId,
      modelId: response.modelId,
      usage: response.usage,
      finishReason: response.finishReason,
    });
  } catch (error) {
    return jsonAiError(error);
  }
}
