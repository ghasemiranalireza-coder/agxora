/**
 * Standalone Node HTTP server for the AGXORA email worker.
 * Run with: node --experimental-strip-types src/server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleEmailWorkerRequest } from "./handler";

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

function clientUrl(req: IncomingMessage): string {
  const host = req.headers.host ?? "127.0.0.1";
  return `http://${host}${req.url ?? "/"}`;
}

async function toRequest(req: IncomingMessage, limit: number): Promise<Request> {
  const method = req.method ?? "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  if (method === "GET" || method === "HEAD") {
    return new Request(clientUrl(req), { method, headers });
  }
  const body = await readBody(req, limit);
  return new Request(clientUrl(req), { method, headers, body });
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function maxBytes(): number {
  const raw = Number(process.env.EMAIL_WORKER_MAX_BYTES ?? 65_536);
  return Number.isFinite(raw) && raw > 0 ? raw : 65_536;
}

const host = process.env.EMAIL_WORKER_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.EMAIL_WORKER_PORT ?? 8787) || 8787;

const server = createServer((req, res) => {
  void (async () => {
    try {
      const request = await toRequest(req, maxBytes());
      const response = await handleEmailWorkerRequest(request, {
        env: process.env,
        fetch,
        log: (event) => {
          console.info("[agxora.email-worker]", event);
        },
      });
      await writeResponse(res, response);
    } catch (error) {
      const tooLarge =
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "payload_too_large";
      res.writeHead(tooLarge ? 413 : 500, { "content-type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          ok: false,
          error: tooLarge ? "payload_too_large" : "internal_error",
        }),
      );
    }
  })();
});

server.listen(port, host, () => {
  console.info("[agxora.email-worker]", {
    type: "listening",
    host,
    port,
  });
});
