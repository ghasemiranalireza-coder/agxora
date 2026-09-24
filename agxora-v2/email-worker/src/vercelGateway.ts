/**
 * Vercel has no route for the standalone Node listener in src/server.ts.
 * This module is bundled to api/gateway.js so production does not import .ts at runtime.
 * The path is set here because a rewrite would otherwise hide /send.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { handleEmailWorkerRequest } from "./handler.ts";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

export function workerPathForMethod(method: string): "/health" | "/send" {
  return method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD" ? "/health" : "/send";
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const path = workerPathForMethod(method);
  const host = req.headers.host ?? "agxora-email-worker.vercel.app";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readBody(req, 65_536) : undefined;
  const request = new Request(`https://${host}${path}`, {
    method,
    headers,
    body,
  });
  const response = await handleEmailWorkerRequest(request, {
    env: process.env,
    fetch,
    log: (event) => {
      console.info("[agxora.email-worker]", event);
    },
  });
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  res.writeHead(response.status, responseHeaders);
  res.end(Buffer.from(await response.arrayBuffer()));
}
