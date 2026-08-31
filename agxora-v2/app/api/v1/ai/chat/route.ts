import { NextResponse } from "next/server";
import { AIError } from "@/app/lib/ai/AIErrorHandler";
import { bindChatContextToActor } from "@/app/lib/ai/chatAuth";
import type { OpenAIChatApiRequest } from "@/app/lib/ai/openaiApi";
import {
  completeOpenAIChat,
  streamOpenAIChat,
} from "@/app/lib/ai/openaiChat";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { rateLimitResponse } from "@/app/lib/security/rate-limit";
import { requireCurrentActor } from "@/app/lib/tenancy";
import { isPersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isChatRequest(value: unknown): value is OpenAIChatApiRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<OpenAIChatApiRequest>;
  const context = body.context;
  if (!context || typeof context !== "object") return false;
  if (typeof context.userPrompt !== "string") return false;
  if (!context.organization || typeof context.organization !== "object") {
    return false;
  }
  if (!Array.isArray(context.conversation)) return false;
  return true;
}

function errorResponse(error: unknown): NextResponse {
  const aiError =
    error instanceof AIError
      ? error
      : new AIError({
          code: "UNKNOWN",
          message:
            error instanceof Error ? error.message : "OpenAI chat failed",
          providerId: "openai",
          retryable: true,
        });

  const status =
    aiError.code === "PROVIDER_NOT_CONFIGURED"
      ? 503
      : aiError.code === "RATE_LIMITED"
        ? 429
        : aiError.code === "ABORTED"
          ? 499
          : aiError.code === "INVALID_REQUEST"
            ? 400
            : 502;

  return NextResponse.json(
    {
      ok: false,
      code: aiError.code,
      message: aiError.message,
      providerId: "openai",
      retryable: aiError.retryable,
    },
    { status: status === 499 ? 408 : status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireCurrentActor();

    const limited = await rateLimitResponse({
      request,
      policyId: "ai.chat",
      userId: actor.userId,
    });
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "Request body must be valid JSON",
          providerId: "openai",
        },
        { status: 400 },
      );
    }

    if (!isChatRequest(body)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "Chat request requires context.userPrompt and conversation",
          providerId: "openai",
        },
        { status: 400 },
      );
    }

    const context = bindChatContextToActor(actor, body.context);
    const stream = Boolean(body.stream);
    const input = {
      context,
      modelId: body.modelId,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      signal: request.signal,
    };

    if (!stream) {
      const result = await completeOpenAIChat(input);
      return NextResponse.json(
        {
          ok: true,
          content: result.content,
          providerId: "openai",
          modelId: result.modelId,
          usage: result.usage,
          finishReason: result.finishReason,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };
        try {
          const result = await streamOpenAIChat(input, (event) => {
            if (event.type === "delta" && event.delta) {
              send({ type: "delta", delta: event.delta, content: event.content });
            } else if (event.type === "error") {
              send({ type: "error", error: event.error });
            }
          });
          send({
            type: "done",
            content: result.content,
            modelId: result.modelId,
            providerId: "openai",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message =
            error instanceof AIError
              ? error.message
              : error instanceof Error
                ? error.message
                : "OpenAI stream failed";
          send({ type: "error", error: message });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (isPersistenceError(error)) return jsonError(error);
    return errorResponse(error);
  }
}
