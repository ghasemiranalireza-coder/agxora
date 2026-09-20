import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { handleVercelRequest, incomingToFetchRequest } from "./vercelAdapter";

const TOKEN = "worker-test-token";

function fakeReq(
  method: string,
  headers: Record<string, string>,
  body?: string,
): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  req.url = "/api/send";
  req.headers = { host: "agxora-email-worker.vercel.app", ...headers };
  queueMicrotask(() => {
    if (body) req.emit("data", Buffer.from(body));
    req.emit("end");
  });
  return req;
}

function fakeRes(): ServerResponse & { body: Buffer } {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: Buffer.alloc(0),
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value;
    },
    end(chunk?: Buffer) {
      this.body = chunk ?? Buffer.alloc(0);
    },
  };
  return res as unknown as ServerResponse & { body: Buffer };
}

describe("Vercel adapter", () => {
  it("reconstructs /send so the existing handler sees the worker path", async () => {
    const request = await incomingToFetchRequest(
      fakeReq("POST", { authorization: `Bearer ${TOKEN}` }, "{}"),
      "/send",
    );
    expect(new URL(request.url).pathname).toBe("/send");
    expect(request.method).toBe("POST");
  });

  it("serves GET /health without secrets", async () => {
    const res = fakeRes();
    await handleVercelRequest(fakeReq("GET", {}), res, "/health", {
      EMAIL_WORKER_TOKEN: TOKEN,
      RESEND_API_KEY: "re_test_not_a_real_key",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body.toString("utf8")) as Record<string, unknown>;
    expect(body).toEqual({ ok: true, service: "agxora-email-worker" });
    expect(res.body.toString("utf8")).not.toContain(TOKEN);
    expect(res.body.toString("utf8")).not.toContain("re_test");
  });

  it("rejects POST /send without Authorization", async () => {
    const res = fakeRes();
    await handleVercelRequest(
      fakeReq("POST", { "content-type": "application/json" }, "{}"),
      res,
      "/send",
      {
        EMAIL_WORKER_TOKEN: TOKEN,
        EMAIL_WORKER_ESP: "resend",
        RESEND_API_KEY: "re_test_not_a_real_key",
        EMAIL_WORKER_ALLOWED_FROM: "noreply@agxora.de",
      },
    );
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body.toString("utf8"))).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });
});
