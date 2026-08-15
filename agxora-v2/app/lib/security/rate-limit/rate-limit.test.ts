/**
 * Phase 46-A — rate limiting unit + HTTP integration tests.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  MemoryRateLimitStore,
  RATE_LIMIT_POLICIES,
  enforceRateLimit,
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

beforeEach(() => {
  process.env.AGXORA_RATE_LIMIT_ENABLED = "true";
  process.env.AGXORA_TRUST_PROXY = "true";
  process.env.AGXORA_RATE_LIMIT_MAX_KEYS = "100";
  setRateLimitStoreForTests(new MemoryRateLimitStore(100));
});

afterEach(() => {
  resetRateLimitStore();
  setRateLimitStoreForTests(null);
  delete process.env.AGXORA_RATE_LIMIT_ENABLED;
  delete process.env.AGXORA_TRUST_PROXY;
  delete process.env.AGXORA_RATE_LIMIT_MAX_KEYS;
  delete process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX;
});

describe("Phase 46-A memory store", () => {
  it("allows requests below the limit and rejects above", () => {
    const store = new MemoryRateLimitStore(100);
    const key = "auth.login:ip:1.1.1.1";
    for (let i = 0; i < 3; i++) {
      const d = store.consume({ key, max: 3, windowMs: 60_000, now: 1_000 + i });
      expect(d.allowed).toBe(true);
    }
    const blocked = store.consume({
      key,
      max: 3,
      windowMs: 60_000,
      now: 1_010,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates separate keys", () => {
    const store = new MemoryRateLimitStore(100);
    expect(
      store.consume({ key: "a", max: 1, windowMs: 60_000, now: 1 }).allowed,
    ).toBe(true);
    expect(
      store.consume({ key: "b", max: 1, windowMs: 60_000, now: 1 }).allowed,
    ).toBe(true);
    expect(
      store.consume({ key: "a", max: 1, windowMs: 60_000, now: 2 }).allowed,
    ).toBe(false);
  });

  it("fails closed when capacity is exceeded", () => {
    const store = new MemoryRateLimitStore(1);
    store.consume({ key: "k1", max: 5, windowMs: 60_000, now: 1 });
    expect(() =>
      store.consume({ key: "k2", max: 5, windowMs: 60_000, now: 1 }),
    ).toThrow(/capacity_exceeded/);
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
  it("rejects after max for IP-keyed login policy", () => {
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "2";
    const req = requestWithIp("http://localhost/api/v1/auth/login", {
      ip: "198.51.100.1",
      method: "POST",
    });
    enforceRateLimit({ request: req, policyId: "auth.login" });
    enforceRateLimit({ request: req, policyId: "auth.login" });
    expect(() =>
      enforceRateLimit({ request: req, policyId: "auth.login" }),
    ).toThrow(PersistenceError);
    try {
      enforceRateLimit({ request: req, policyId: "auth.login" });
    } catch (error) {
      expect(error).toBeInstanceOf(PersistenceError);
      expect((error as PersistenceError).code).toBe("rate_limited");
      expect((error as PersistenceError).status).toBe(429);
      expect((error as PersistenceError).message).not.toMatch(/user|email|account/i);
    }
  });

  it("does not share user buckets across different users", () => {
    process.env.AGXORA_RATE_LIMIT_CONTROL_INVITE_MAX = "1";
    const reqA = requestWithIp("http://localhost/api", { ip: "1.1.1.1" });
    enforceRateLimit({
      request: reqA,
      policyId: "control.invite",
      userId: "user-a",
    });
    expect(() =>
      enforceRateLimit({
        request: reqA,
        policyId: "control.invite",
        userId: "user-a",
      }),
    ).toThrow(/Too many requests/);
    // Different user still allowed
    enforceRateLimit({
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
    expect(rateLimitResponse({ request: req, policyId: "auth.login" })).toBeNull();
    const limited = rateLimitResponse({ request: req, policyId: "auth.login" });
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

  it("disabled limiter allows all requests", () => {
    process.env.AGXORA_RATE_LIMIT_ENABLED = "false";
    process.env.AGXORA_RATE_LIMIT_AUTH_LOGIN_MAX = "1";
    const req = requestWithIp("http://localhost/api", { ip: "198.51.100.4" });
    enforceRateLimit({ request: req, policyId: "auth.login" });
    enforceRateLimit({ request: req, policyId: "auth.login" });
    enforceRateLimit({ request: req, policyId: "auth.login" });
  });

  it("fail-closed maps store capacity errors to rate_limited", () => {
    setRateLimitStoreForTests(new MemoryRateLimitStore(1));
    const req1 = requestWithIp("http://localhost/api", { ip: "10.0.0.1" });
    const req2 = requestWithIp("http://localhost/api", { ip: "10.0.0.2" });
    enforceRateLimit({ request: req1, policyId: "auth.login" });
    expect(() =>
      enforceRateLimit({ request: req2, policyId: "auth.login" }),
    ).toThrow(PersistenceError);
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
    // May be 401 unauthorized from bad credentials — still counted.
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
    await loginPost(loginReq); // 429 on login

    const orgRes = await getOrgRoute();
    // Unauthenticated org read → 401, not 429
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
