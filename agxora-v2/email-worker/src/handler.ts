/**
 * AGXORA email worker HTTP handler.
 *
 * Accepts the existing Phase 45 HTTP provider payload and forwards it to an ESP.
 * Does not import Prisma, does not read AGXORA database credentials, and does not
 * log API keys, bearer tokens, or one-time action URLs.
 */

import { timingSafeEqual } from "node:crypto";
import { sendViaEsp } from "./esp.ts";

export const EMAIL_KINDS = [
  "invitation",
  "password_reset",
  "email_verification",
  "ownership_transfer",
  "customer_message",
] as const;

export type EmailKind = (typeof EMAIL_KINDS)[number];

export type WorkerPayload = {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly kind: string;
  readonly actionUrl: string;
  readonly idempotencyKey?: string;
};

export type WorkerLogEvent = {
  readonly type: string;
  readonly method?: string;
  readonly path?: string;
  readonly status?: number;
  readonly kind?: string;
  readonly error?: string;
};

export type WorkerRuntime = {
  readonly env: NodeJS.ProcessEnv;
  readonly fetch: typeof fetch;
  readonly log?: (event: WorkerLogEvent) => void;
};

const DEFAULT_MAX_BYTES = 65_536;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_RE = /^(?:(.+?)\s*<([^>]+)>|([^<>\s]+))$/;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function maxBytes(env: NodeJS.ProcessEnv): number {
  const raw = Number(env.EMAIL_WORKER_MAX_BYTES ?? DEFAULT_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

function timingSafeTokenMatch(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.byteLength !== providedBuf.byteLength) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

function authorize(request: Request, env: NodeJS.ProcessEnv): Response | null {
  const expected = env.EMAIL_WORKER_TOKEN?.trim() ?? "";
  if (!expected) {
    return json(503, { ok: false, error: "worker_not_configured" });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  const provided = header.slice("Bearer ".length).trim();
  if (!timingSafeTokenMatch(expected, provided)) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  return null;
}

function extractEmail(value: string): string | null {
  const trimmed = value.trim();
  const match = FROM_RE.exec(trimmed);
  if (!match) return null;
  const email = (match[2] ?? match[3] ?? "").trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

function isEmailKind(value: string): value is EmailKind {
  return (EMAIL_KINDS as readonly string[]).includes(value);
}

function validatePayload(
  value: unknown,
  env: NodeJS.ProcessEnv,
): { ok: true; payload: WorkerPayload } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_json" };
  }
  const record = value as Record<string, unknown>;
  const required = ["from", "to", "subject", "text", "kind", "actionUrl"] as const;
  for (const key of required) {
    if (typeof record[key] !== "string" || record[key].trim() === "") {
      return { ok: false, error: "invalid_fields" };
    }
  }

  const from = String(record.from).trim();
  const to = String(record.to).trim();
  const fromEmail = extractEmail(from);
  const toEmail = extractEmail(to);
  if (!fromEmail || !toEmail) {
    return { ok: false, error: "invalid_email" };
  }

  const allowedFrom = env.EMAIL_WORKER_ALLOWED_FROM?.trim().toLowerCase();
  if (allowedFrom && fromEmail !== allowedFrom) {
    return { ok: false, error: "from_not_allowed" };
  }

  const kind = String(record.kind).trim();
  if (!isEmailKind(kind)) {
    return { ok: false, error: "invalid_kind" };
  }

  const actionUrl = String(record.actionUrl).trim();
  if (!/^https?:\/\//i.test(actionUrl)) {
    return { ok: false, error: "invalid_action_url" };
  }

  const idempotencyKey =
    typeof record.idempotencyKey === "string" && record.idempotencyKey.trim()
      ? record.idempotencyKey.trim()
      : undefined;
  if (record.idempotencyKey != null && !idempotencyKey) {
    return { ok: false, error: "invalid_fields" };
  }

  return {
    ok: true,
    payload: {
      from,
      to,
      subject: String(record.subject).trim(),
      text: String(record.text),
      kind,
      actionUrl,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  };
}

function requestPath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/";
  }
}

export async function handleEmailWorkerRequest(
  request: Request,
  runtime: WorkerRuntime,
): Promise<Response> {
  const path = requestPath(request);
  const method = request.method.toUpperCase();
  const log = runtime.log ?? (() => undefined);

  if (method === "GET" && (path === "/health" || path === "/")) {
    return json(200, { ok: true, service: "agxora-email-worker" });
  }

  if (method !== "POST" || (path !== "/send" && path !== "/")) {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const authError = authorize(request, runtime.env);
  if (authError) {
    log({ type: "auth_rejected", method, path, status: authError.status });
    return authError;
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const limit = maxBytes(runtime.env);
  if (contentLength > limit) {
    return json(413, { ok: false, error: "payload_too_large" });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, error: "invalid_body" });
  }
  if (raw.length > limit) {
    return json(413, { ok: false, error: "payload_too_large" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const validated = validatePayload(parsed, runtime.env);
  if (!validated.ok) {
    log({ type: "validation_rejected", method, path, status: 400, error: validated.error });
    return json(400, { ok: false, error: validated.error });
  }

  try {
    const result = await sendViaEsp(
      runtime.env,
      {
        from: validated.payload.from,
        to: validated.payload.to,
        subject: validated.payload.subject,
        text: validated.payload.text,
        idempotencyKey: validated.payload.idempotencyKey,
      },
      { fetch: runtime.fetch },
    );
    if (!result.ok) {
      log({
        type: "esp_failed",
        method,
        path,
        status: result.status,
        kind: validated.payload.kind,
        error: result.error,
      });
      return json(result.status, { ok: false, error: result.error });
    }
    log({
      type: "queued",
      method,
      path,
      status: 200,
      kind: validated.payload.kind,
    });
    return json(200, { ok: true, id: result.id ?? null });
  } catch {
    log({ type: "esp_failed", method, path, status: 502, kind: validated.payload.kind, error: "esp_unreachable" });
    return json(502, { ok: false, error: "esp_unreachable" });
  }
}
