/**
 * Phase 60.1 — bounded allowlisted HTTPS provider asset fetch tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { MAX_CREATIVE_ASSET_DECODED_BYTES } from "@/app/lib/creative/assets";
import {
  assertTrustedProviderAssetUrl,
  fetchTrustedHttpsAsset,
  setTrustedHttpsAssetFetchForTests,
  __testReadBoundedResponseBody,
} from "@/app/lib/creative/httpsAssetFetch";
import { persistProviderAssetsDurably } from "@/app/lib/creative/persistAssets";
import {
  createMemoryCreativeAssetStore,
  getCreativeAssetStore,
  setCreativeAssetStoreForTests,
} from "@/app/lib/creative/assetStore";
import { parseDurableCreativeAssetUrl } from "@/app/lib/creative/assetStorePaths";

const TRUSTED_HOST = "oaidalleapiprodscus.blob.core.windows.net";
const TRUSTED_URL = `https://${TRUSTED_HOST}/generated/test.png`;

function mockFetchResponse(
  init: {
    status?: number;
    headers?: Record<string, string>;
    body?: Uint8Array | ReadableStream<Uint8Array>;
  },
): Response {
  const headers = new Headers(init.headers ?? {});
  let body: BodyInit | null = null;
  if (init.body instanceof ReadableStream) {
    body = init.body;
  } else if (init.body) {
    body = init.body;
    if (!headers.has("content-length")) {
      headers.set("content-length", String(init.body.byteLength));
    }
  }
  return new Response(body, { status: init.status ?? 200, headers });
}

afterEach(() => {
  setTrustedHttpsAssetFetchForTests(null);
  setCreativeAssetStoreForTests(null);
  vi.restoreAllMocks();
});

describe("Phase 60.1 trusted HTTPS asset fetch", () => {
  it("accepts allowlisted OpenAI blob host before fetch", () => {
    const url = assertTrustedProviderAssetUrl(TRUSTED_URL);
    expect(url.hostname).toBe(TRUSTED_HOST);
  });

  it("rejects untrusted HTTPS host before fetch", () => {
    expect(() =>
      assertTrustedProviderAssetUrl("https://evil.example.com/image.png"),
    ).toThrow(PersistenceError);
    expect(() =>
      assertTrustedProviderAssetUrl("https://evil.example.com/image.png"),
    ).toThrow(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({ message: "provider_asset_url_not_trusted" }),
        ]),
      }),
    );
  });

  it("rejects localhost and private hosts before fetch", () => {
    for (const url of [
      "http://127.0.0.1/image.png",
      "https://127.0.0.1/image.png",
      "https://localhost/image.png",
      "https://10.0.0.5/image.png",
      "https://192.168.1.10/image.png",
      "https://172.16.0.2/image.png",
    ]) {
      expect(() => assertTrustedProviderAssetUrl(url)).toThrow(PersistenceError);
    }
  });

  it("rejects Content-Length above max before buffering body", async () => {
    setTrustedHttpsAssetFetchForTests(async () =>
      mockFetchResponse({
        headers: {
          "content-type": "image/png",
          "content-length": String(MAX_CREATIVE_ASSET_DECODED_BYTES + 1),
        },
        body: new Uint8Array(16),
      }),
    );

    await expect(fetchTrustedHttpsAsset(TRUSTED_URL)).rejects.toMatchObject({
      code: "validation",
      details: [{ message: "provider_asset_too_large" }],
    });
  });

  it("rejects chunked/unknown-length responses exceeding max without storing", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024));
        controller.enqueue(new Uint8Array(MAX_CREATIVE_ASSET_DECODED_BYTES));
        controller.close();
      },
    });
    setTrustedHttpsAssetFetchForTests(async () =>
      mockFetchResponse({
        headers: { "content-type": "image/png" },
        body: stream,
      }),
    );

    await expect(fetchTrustedHttpsAsset(TRUSTED_URL)).rejects.toMatchObject({
      code: "validation",
      details: [{ message: "provider_asset_too_large" }],
    });
  });

  it("stores a valid bounded HTTPS response via persistProviderAssetsDurably", async () => {
    const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    setTrustedHttpsAssetFetchForTests(async () =>
      mockFetchResponse({
        headers: {
          "content-type": "image/png",
          "content-length": String(payload.byteLength),
        },
        body: payload,
      }),
    );
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());

    const out = await persistProviderAssetsDurably({
      organizationId: "org_a",
      creativeProjectId: "creative_1",
      providerId: "openai",
      replaceExisting: false,
      assets: [
        {
          providerId: "openai",
          url: TRUSTED_URL,
          mimeType: "image/png",
        },
      ],
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.durableAssets[0]?.url).toMatch(
      /^\/api\/v1\/agents\/creative\/assets\//,
    );

    const parsed = parseDurableCreativeAssetUrl(out.durableAssets[0]?.url ?? "");
    expect(parsed).not.toBeNull();
    const record = await getCreativeAssetStore().get({
      organizationId: "org_a",
      creativeProjectId: parsed!.creativeProjectId,
      assetId: parsed!.assetId,
    });
    expect(record?.bytes.byteLength).toBe(payload.byteLength);
  });

  it("readBoundedResponseBody honors limit on synthetic Response", async () => {
    const small = new Uint8Array([1, 2, 3]);
    const response = mockFetchResponse({
      headers: { "content-length": "3" },
      body: small,
    });
    const read = await __testReadBoundedResponseBody(response, 10);
    expect(read.byteLength).toBe(3);
  });
});
