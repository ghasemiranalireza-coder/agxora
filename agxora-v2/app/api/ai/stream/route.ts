/**
 * POST /api/ai/stream — SSE token stream (secrets stay server-side).
 */

import { NextResponse } from "next/server";
import type { AIRuntimeContext } from "../../../lib/ai/AIContext";
import type { AIProviderId } from "../../../lib/ai/AIModel";
import type { AISettings } from "../../../lib/ai/AISettings";
import { AIError, toAIError } from "../../../lib/ai/AIErrorHandler";
import { runServerGeneration } from "../../../lib/ai/server/runGeneration";

export const runtime = "nodejs";

interface StreamBody {
  readonly context: AIRuntimeContext;
  readonly settings?: Partial<AISettings>;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
}

export async function POST(request: Request): Promise<Response> {
  let body: StreamBody;
  try {
    body = (await request.json()) as StreamBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.context?.userPrompt || typeof body.context.userPrompt !== "string") {
    return NextResponse.json({ error: "userPrompt required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const response = await runServerGeneration({
          context: body.context,
          settings: body.settings,
          providerId: body.providerId,
          modelId: body.modelId,
          signal: request.signal,
          stream: true,
          onEvent: (event) => {
            send(event.type, event);
          },
        });

        send("result", {
          content: response.content,
          providerId: response.providerId,
          modelId: response.modelId,
          usage: response.usage,
          finishReason: response.finishReason,
        });
        send("close", { ok: true });
      } catch (error) {
        const aiError =
          error instanceof AIError ? error : toAIError(error, body.providerId);
        send("error", {
          code: aiError.code,
          message: aiError.message,
          retryable: aiError.retryable,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
