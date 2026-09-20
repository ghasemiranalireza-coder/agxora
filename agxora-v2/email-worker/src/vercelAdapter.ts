/**
 * Vercel Node adapter for the existing email worker.
 *
 * Vercel cannot run src/server.ts (persistent listen()). This adapter reuses
 * handleEmailWorkerRequest unchanged and reconstructs /send, /health, and /.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { handleEmailWorkerRequest } from "./handler.ts";

const MAX_BYTES_DEFAULT = 65_536;

function maxBytes(env: NodeJS.ProcessEnv): number {
  const raw = Number(env.EMAIL_WORKER_MAX_BYTES ?? MAX_BYTES_DEFAULT);
  return Number.isFinite(raw) && raw > 0 ? raw : MAX_BYTES_DEFAULT;
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("payload_too_large"), { code: "payload_too_large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function incomingToFetchRequest(
  req: IncomingMessage,
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Request> {
  const host = String(req.headers.host ?? "localhost");
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const method = (req.method ?? "GET").toUpperCase();
  const url = `https://${host}${pathname}`;
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  const body = await readBody(req, maxBytes(env));
  return new Request(url, { method, headers, body });
}

export async function handleVercelRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  try {
    const request = await incomingToFetchRequest(req, pathname, env);
    const response = await handleEmailWorkerRequest(request, {
      env,
      fetch,
      log: (event) => {
        console.info("[agxora.email-worker]", event);
      },
    });
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const tooLarge =
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "payload_too_large";
    res.statusCode = tooLarge ? 413 : 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        ok: false,
        error: tooLarge ? "payload_too_large" : "internal_error",
      }),
    );
  }
}
