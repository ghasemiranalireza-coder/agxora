// src/handler.ts
import { timingSafeEqual } from "node:crypto";

// src/esp.ts
function readEspId(raw) {
  const value = (raw ?? "resend").trim().toLowerCase();
  return value === "postmark" ? "postmark" : "resend";
}
function resolveEspId(env) {
  return readEspId(env.EMAIL_WORKER_ESP);
}
async function sendViaEsp(env, input, runtime) {
  const esp = resolveEspId(env);
  if (esp === "postmark") {
    return sendViaPostmark(env, input, runtime);
  }
  return sendViaResend(env, input, runtime);
}
async function sendViaResend(env, input, runtime) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, status: 503, error: "esp_not_configured" };
  }
  const response = await runtime.fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
      ...input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {}
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text
    })
  });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status >= 500 ? 502 : 502,
      error: "esp_rejected"
    };
  }
  const payload = await response.json().catch(() => null);
  return { ok: true, id: payload?.id };
}
async function sendViaPostmark(env, input, runtime) {
  const token = env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) {
    return { ok: false, status: 503, error: "esp_not_configured" };
  }
  const response = await runtime.fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "x-postmark-server-token": token,
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      From: input.from,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      MessageStream: "outbound"
    })
  });
  if (!response.ok) {
    return { ok: false, status: 502, error: "esp_rejected" };
  }
  const payload = await response.json().catch(() => null);
  return { ok: true, id: payload?.MessageID };
}

// src/handler.ts
var EMAIL_KINDS = [
  "invitation",
  "password_reset",
  "email_verification",
  "ownership_transfer",
  "customer_message"
];
var DEFAULT_MAX_BYTES = 65536;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var FROM_RE = /^(?:(.+?)\s*<([^>]+)>|([^<>\s]+))$/;
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
function maxBytes(env) {
  const raw = Number(env.EMAIL_WORKER_MAX_BYTES ?? DEFAULT_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}
function timingSafeTokenMatch(expected, provided) {
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.byteLength !== providedBuf.byteLength) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}
function authorize(request, env) {
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
function extractEmail(value) {
  const trimmed = value.trim();
  const match = FROM_RE.exec(trimmed);
  if (!match) return null;
  const email = (match[2] ?? match[3] ?? "").trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}
function isEmailKind(value) {
  return EMAIL_KINDS.includes(value);
}
function validatePayload(value, env) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_json" };
  }
  const record = value;
  const required = ["from", "to", "subject", "text", "kind", "actionUrl"];
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
  const idempotencyKey = typeof record.idempotencyKey === "string" && record.idempotencyKey.trim() ? record.idempotencyKey.trim() : void 0;
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
      ...idempotencyKey ? { idempotencyKey } : {}
    }
  };
}
function requestPath(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/";
  }
}
async function handleEmailWorkerRequest(request, runtime) {
  const path = requestPath(request);
  const method = request.method.toUpperCase();
  const log = runtime.log ?? (() => void 0);
  if (method === "GET" && (path === "/health" || path === "/")) {
    return json(200, { ok: true, service: "agxora-email-worker" });
  }
  if (method !== "POST" || path !== "/send" && path !== "/") {
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
  let raw;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, error: "invalid_body" });
  }
  if (raw.length > limit) {
    return json(413, { ok: false, error: "payload_too_large" });
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
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
        idempotencyKey: validated.payload.idempotencyKey
      },
      { fetch: runtime.fetch }
    );
    if (!result.ok) {
      log({
        type: "esp_failed",
        method,
        path,
        status: result.status,
        kind: validated.payload.kind,
        error: result.error
      });
      return json(result.status, { ok: false, error: result.error });
    }
    log({
      type: "queued",
      method,
      path,
      status: 200,
      kind: validated.payload.kind
    });
    return json(200, { ok: true, id: result.id ?? null });
  } catch {
    log({ type: "esp_failed", method, path, status: 502, kind: validated.payload.kind, error: "esp_unreachable" });
    return json(502, { ok: false, error: "esp_unreachable" });
  }
}

// src/vercelGateway.ts
var config = {
  api: {
    bodyParser: false
  }
};
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
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
function workerPathForMethod(method) {
  return method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD" ? "/health" : "/send";
}
async function handler(req, res) {
  const method = (req.method ?? "GET").toUpperCase();
  const path = workerPathForMethod(method);
  const host = req.headers.host ?? "agxora-email-worker.vercel.app";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readBody(req, 65536) : void 0;
  const request = new Request(`https://${host}${path}`, {
    method,
    headers,
    body
  });
  const response = await handleEmailWorkerRequest(request, {
    env: process.env,
    fetch,
    log: (event) => {
      console.info("[agxora.email-worker]", event);
    }
  });
  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  res.writeHead(response.status, responseHeaders);
  res.end(Buffer.from(await response.arrayBuffer()));
}
export {
  config,
  handler as default,
  workerPathForMethod
};
