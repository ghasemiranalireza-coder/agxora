/**
 * ESP adapters. The AGXORA app never receives these API keys.
 * Secrets stay in this worker's environment only.
 */

export type EspId = "resend" | "postmark";

export type EspSendInput = {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

export type EspSendResult =
  | { readonly ok: true; readonly id?: string }
  | { readonly ok: false; readonly status: number; readonly error: string };

export type EspRuntime = {
  readonly fetch: typeof fetch;
};

function readEspId(raw: string | undefined): EspId {
  const value = (raw ?? "resend").trim().toLowerCase();
  return value === "postmark" ? "postmark" : "resend";
}

export function resolveEspId(env: NodeJS.ProcessEnv): EspId {
  return readEspId(env.EMAIL_WORKER_ESP);
}

export async function sendViaEsp(
  env: NodeJS.ProcessEnv,
  input: EspSendInput,
  runtime: EspRuntime,
): Promise<EspSendResult> {
  const esp = resolveEspId(env);
  if (esp === "postmark") {
    return sendViaPostmark(env, input, runtime);
  }
  return sendViaResend(env, input, runtime);
}

async function sendViaResend(
  env: NodeJS.ProcessEnv,
  input: EspSendInput,
  runtime: EspRuntime,
): Promise<EspSendResult> {
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
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status >= 500 ? 502 : 502,
      error: "esp_rejected",
    };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id };
}

async function sendViaPostmark(
  env: NodeJS.ProcessEnv,
  input: EspSendInput,
  runtime: EspRuntime,
): Promise<EspSendResult> {
  const token = env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) {
    return { ok: false, status: 503, error: "esp_not_configured" };
  }

  const response = await runtime.fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "x-postmark-server-token": token,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      From: input.from,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      MessageStream: "outbound",
    }),
  });

  if (!response.ok) {
    return { ok: false, status: 502, error: "esp_rejected" };
  }

  const payload = (await response.json().catch(() => null)) as {
    MessageID?: string;
  } | null;
  return { ok: true, id: payload?.MessageID };
}
