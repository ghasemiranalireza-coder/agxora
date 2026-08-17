/**
 * Phase 46-A / 46-B — rate limiting unit + HTTP integration tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  MemoryRateLimitStore,
  RATE_LIMIT_POLICIES,
  enforceRateLimit,
  getRateLimitStoreConfig,
  parseHttpRateLimitResponse,
  rateLimitResponse,
  resetRateLimitStore,
  resolveClientIpKey,
  setRateLimitStoreForTests,
  UNTRUSTED_IP_KEY,
} from "@/app/lib/security/rate-limit";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as getOrgRoute } from "@/app/api/v1/organizations/current/route";

function requestWithIp(
  url: string,
  init?: RequestInit & { ip?: string; trustHeaders?: boolean },
): Request {
  const headers = new Headers(init?.headers);
  if (init?.ip) {
    headers.set("x-forwarded-for", init.ip);
  }
  return new Request(url, { ...init, headers });
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.AGXORA_RATE_LIMIT_ENABLED = "true";
  process.env.AGXORA_TRUST_PROXY = "true";
  process.env.AGXORA_RATE_LIMIT_MAX_KEYS = "100";
  delete process.env.AGXORA_RATE_LIMIT_STORE;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_URL;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_TOKEN;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS;
  setRateLimitStoreForTests(new MemoryRateLimitStore(100));
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  resetRateLimitStore();
  setRateLimitStoreForTests(null);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  delete process.env.AGXORA_RATE_LIMIT_ENABLED;
  delete process.env.AGXORA_TRUST_PROXY;
  delete process.env.AGXORA_RATE_LIMIT_MAX_KEYS;
  delete process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX;
  delete process.env.AGXORA_RATE_LIMIT_STORE;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_URL;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_TOKEN;
  delete process.env.AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS;
});

describe("Phase 46-A memory store", () => {
  it("allows requests below the limit and rejects above", async () => {
    const store = new MemoryRateLimitStore(100);
    const key = "auth.login:ip:1.1.1.1";
    for (let i = 0; i < 3; i++) {
      const d = await store.consume({ key, max: 3, windowMs: 60_000, now: 1_000 + i });
      expect(d.allowed).toBe(true);
    }
    const blocked = await store.consume({
      key,
      max: 3,
      windowMs: 60_000,
      now: 1_010,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates separate keys", async () => {
    const store = new MemoryRateLimitStore(100);
    expect(
      (await store.consume({ key: "a", max: 1, windowMs: 60_000, now: 1 })).allowed,
    ).toBe(true);
    expect(
      (await store.consume({ key: "b", max: 1, windowMs: 60_000, now: 1 })).allowed,
    ).toBe(true);
    expect(
      (await store.consume({ key: "a", max: 1, windowMs: 60_000, now: 2 })).allowed,
    ).toBe(false);
  });

  it("fails closed when capacity is exceeded", async () => {
    const store = new MemoryRateLimitStore(1);
    await store.consume({ key: "k1", max: 5, windowMs: 60_000, now: 1 });
    await expect(
      store.consume({ key: "k2", max: 5, windowMs: 60_000, now: 1 }),
    ).rejects.toThrow(/capacity_exceeded/);
  });
});

describe("Phase 46-A client IP trust", () => {
  it("ignores forwarded headers when trust proxy is off", () => {
    process.env.AGXORA_TRUST_PROXY = "false";
    const req = requestWithIp("http://localhost/api", { ip: "9.9.9.9" });
    expect(resolveClientIpKey(req)).toBe(UNTRUSTED_IP_KEY);
  });

  it("uses first X-Forwarded-For hop when trust proxy is on", () => {
    process.env.AGXORA_TRUST_PROXY = "true";
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(resolveClientIpKey(req)).toBe("203.0.113.10");
  });
});

describe("Phase 46-A enforceRateLimit", () => {
  it("rejects after max for IP-keyed login policy", async () => {
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "2";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "198.51.100.1",
      method: "POST",
    });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    await expect(
      enforceRateLimit({ request: req, policyId: "auth.login" }),
    ).rejects.toThrow(PersistenceError);
    try {
      await enforceRateLimit({ request: req, policyId: "auth.login" });
    } catch (error) {
      expect(error).toBeInstanceOf(PersistenceError);
      expect((error as PersistenceError).code).toBe("rate_limited");
      expect((error as PersistenceError).status).toBe(429);
      expect((error as PersistenceError).message).not.toMatch(/user|email|account/i);
    }
  });

  it("does not share user buckets across different users", async () => {
    process.env.AGXORA_RATE_LIMIT_CONTROL_INVITE_MAX = "1";
    const reqA = requestWithIp("http://localhost/api", { ip: "1.1.1.1" });
    await enforceRateLimit({
      request: reqA,
      policyId: "control.invite",
      userId: "user-a",
    });
    await expect(
      enforceRateLimit({
        request: reqA,
        policyId: "control.invite",
        userId: "user-a",
      }),
    ).rejects.toThrow(/Too many requests/);
    await enforceRateLimit({
      request: reqA,
      policyId: "control.invite",
      userId: "user-b",
    });
  });

  it("rateLimitResponse sets Retry-After and omits internals", async () => {
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "1";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "198.51.100.3",
      method: "POST",
    });
    expect(await rateLimitResponse({ request: req, policyId: "auth.login" })).toBeNull();
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.headers.get("Retry-After")).toBeTruthy();
    const body = (await limited!.json()) as {
      code: string;
      message: string;
      details?: unknown;
    };
    expect(body.code).toBe("rate_limited");
    expect(body.details).toBeUndefined();
    expect(body.message).toBe("Too many requests. Try again later.");
  });

  it("disabled limiter allows all requests", async () => {
    process.env.AGXORA_RATE_LIMIT_ENABLED = "false";
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "1";
    const req = requestWithIp("http://localhost/api", { ip: "198.51.100.4" });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
  });

  it("fail-closed maps store capacity errors to rate_limited", async () => {
    setRateLimitStoreForTests(new MemoryRateLimitStore(1));
    const req1 = requestWithIp("http://localhost/api", { ip: "10.0.0.1" });
    const req2 = requestWithIp("http://localhost/api", { ip: "10.0.0.2" });
    await enforceRateLimit({ request: req1, policyId: "auth.login" });
    await expect(
      enforceRateLimit({ request: req2, policyId: "auth.login" }),
    ).rejects.toThrow(PersistenceError);
  });
});

describe("Phase 46-B HTTP shared store", () => {
  function mockFetchResponse(payload: unknown, status = 200): void {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
  }

  beforeEach(() => {
    setRateLimitStoreForTests(null);
    process.env.AGXORA_RATE_LIMIT_STORE = "http";
    process.env.AGXORA_RATE_LIMIT_HTTP_URL = "https://rate-limit-worker.example/consume";
    process.env.AGXORA_RATE_LIMIT_HTTP_TOKEN = "secret-token";
    process.env.AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS = "2500";
  });

  it("defaults store config to memory when env is unset", () => {
    delete process.env.AGXORA_RATE_LIMIT_STORE;
    expect(getRateLimitStoreConfig().store).toBe("memory");
  });

  it("test override takes precedence over http store env", async () => {
    mockFetchResponse({ allowed: true, remaining: 1, limit: 20, retryAfterSec: 0 });
    setRateLimitStoreForTests(new MemoryRateLimitStore(100));
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "5";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "198.51.100.9",
      method: "POST",
    });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    await enforceRateLimit({ request: req, policyId: "auth.login" });
    expect(vi.isMockFunction(globalThis.fetch) ? globalThis.fetch : null).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("allows via HTTP store and sends contract payload with bearer auth", async () => {
    mockFetchResponse({ allowed: true, remaining: 18, limit: 20, retryAfterSec: 0 });
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "20";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.99",
      method: "POST",
      body: JSON.stringify({ email: "secret@example.test", password: "super-secret" }),
    });

    await enforceRateLimit({ request: req, policyId: "auth.login" });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://rate-limit-worker.example/consume");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer secret-token",
    );
    const body = JSON.parse(String(init.body)) as {
      key: string;
      max: number;
      windowMs: number;
      now: number;
    };
    expect(body.key).toBe("auth.login:ip:203.0.113.99");
    expect(body.max).toBe(20);
    expect(body.windowMs).toBeGreaterThan(0);
    expect(typeof body.now).toBe("number");
    expect(JSON.stringify(body)).not.toContain("super-secret");
    expect(JSON.stringify(body)).not.toContain("secret@example.test");
  });

  it("denies via HTTP store with Retry-After", async () => {
    mockFetchResponse({
      allowed: false,
      remaining: 0,
      limit: 20,
      retryAfterSec: 847,
    });
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.100",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.headers.get("Retry-After")).toBe("847");
  });

  it("fail-closed on HTTP 500", async () => {
    mockFetchResponse({ error: "boom" }, 500);
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.101",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
  });

  it("fail-closed on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as typeof fetch;
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.102",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
  });

  it("fail-closed on invalid JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.103",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
  });

  it("fail-closed on invalid response shape", async () => {
    mockFetchResponse({ remaining: 1, limit: 20, retryAfterSec: 0 });
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.104",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
  });

  it("fail-closed on timeout", async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }) as typeof fetch;
    process.env.AGXORA_RATE_LIMIT_HTTP_TIMEOUT_MS = "5";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.105",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
  });

  it("fail-closed when http store is selected without URL", async () => {
    delete process.env.AGXORA_RATE_LIMIT_HTTP_URL;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "203.0.113.106",
      method: "POST",
    });
    const limited = await rateLimitResponse({ request: req, policyId: "auth.login" });
    expect(limited?.status).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("parses valid HTTP responses strictly", () => {
    expect(
      parseHttpRateLimitResponse(
        { allowed: true, remaining: 3, limit: 10, retryAfterSec: 0 },
        10,
      ),
    ).toEqual({
      allowed: true,
      remaining: 3,
      limit: 10,
      retryAfterSec: 0,
    });
    expect(() => parseHttpRateLimitResponse(null, 10)).toThrow(
      /invalid_response/,
    );
  });
});

describe("Phase 46-A route wiring", () => {
  it("login route returns 429 after exceeding policy", async () => {
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "2";
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://agxora:agxora_dev@127.0.0.1:5432/agxora_test";

    const make = () =>
      loginPost(
        requestWithIp("http://localhost/api/v1/auth/login", {
          method: "POST",
          ip: "203.0.113.50",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "nobody@example.test",
            password: "wrong-password",
          }),
        }),
      );

    const first = await make();
    const second = await make();
    expect([401, 400, 503, 200].includes(first.status) || first.status < 500).toBe(
      true,
    );
    expect(second.status).not.toBe(429);

    const third = await make();
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBeTruthy();
    const body = (await third.json()) as { code: string };
    expect(body.code).toBe("rate_limited");
  });

  it("organization GET remains unaffected by login limiter", async () => {
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "1";
    const loginReq = requestWithIp("http://localhost/api/v1/auth/login", {
      method: "POST",
      ip: "203.0.113.60",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "x" }),
    });
    await loginPost(loginReq);
    await loginPost(loginReq);

    const orgRes = await getOrgRoute();
    expect(orgRes.status).toBe(401);
    const body = (await orgRes.json()) as { code: string };
    expect(body.code).not.toBe("rate_limited");
  });

  it("exposes default policies for documented routes", () => {
    expect(RATE_LIMIT_POLICIES["auth.forgot_password"].max).toBe(5);
    expect(RATE_LIMIT_POLICIES["control.ownership_transfer_initiate"].keyKind).toBe(
      "user",
    );
    expect(RATE_LIMIT_POLICIES["control.ownership_transfer_confirm"].keyKind).toBe(
      "ip_user",
    );
  });
});
