/**
 * Official Instagram image publish calls.
 * The fetch implementation is injectable so tests never hit Meta.
 */

import "server-only";

import { INSTAGRAM_GRAPH_HOST, type InstagramOAuthConfig } from "./config";

export type InstagramFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type InstagramAccount = {
  readonly id: string;
  readonly username: string;
};

function graphUrl(config: InstagramOAuthConfig, path: string): string {
  return `${INSTAGRAM_GRAPH_HOST}/${config.graphVersion}/${path.replace(/^\//, "")}`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function exchangeInstagramCode(input: {
  readonly config: InstagramOAuthConfig;
  readonly code: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly accessToken: string; readonly userId: string; readonly scopes: readonly string[]; readonly expiresAt?: Date } | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: input.config.redirectUri,
    code: input.code,
  });
  let response: Response;
  try {
    response = await fetchImpl("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return null;
  }
  const payload = await readJson(response);
  if (!response.ok) return null;
  const token = readToken(payload);
  if (!token) return null;
  const longLived = await exchangeLongLivedToken({
    config: input.config,
    accessToken: token.accessToken,
    fetchImpl,
  });
  if (!longLived) return token;
  return {
    accessToken: longLived.accessToken,
    userId: token.userId,
    scopes: token.scopes,
    expiresAt: longLived.expiresAt,
  };
}

async function exchangeLongLivedToken(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly fetchImpl: InstagramFetch;
}): Promise<{ readonly accessToken: string; readonly userId: string; readonly scopes: readonly string[]; readonly expiresAt?: Date } | null> {
  const url = new URL(`${INSTAGRAM_GRAPH_HOST}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", input.config.clientSecret);
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await input.fetchImpl(url.toString(), { method: "GET" });
    const payload = await readJson(response);
    if (!response.ok || !payload || typeof payload !== "object") return null;
    const accessToken = (payload as { access_token?: unknown }).access_token;
    const expiresIn = (payload as { expires_in?: unknown }).expires_in;
    if (typeof accessToken !== "string" || !accessToken) return null;
    const expiresAt = typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : undefined;
    return { accessToken, userId: "", scopes: [], expiresAt };
  } catch {
    return null;
  }
}

export async function refreshInstagramAccessToken(input: {
  readonly accessToken: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly accessToken: string; readonly expiresAt?: Date } | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(`${INSTAGRAM_GRAPH_HOST}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await fetchImpl(url.toString(), { method: "GET" });
    const payload = await readJson(response);
    if (!response.ok || !payload || typeof payload !== "object") return null;
    const accessToken = (payload as { access_token?: unknown }).access_token;
    const expiresIn = (payload as { expires_in?: unknown }).expires_in;
    if (typeof accessToken !== "string" || !accessToken) return null;
    return {
      accessToken,
      expiresAt: typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : undefined,
    };
  } catch {
    return null;
  }
}

export async function readInstagramAccount(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<InstagramAccount | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(graphUrl(input.config, "me"));
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await fetchImpl(url.toString(), { method: "GET" });
    const payload = await readJson(response);
    if (!response.ok || !payload || typeof payload !== "object") return null;
    const record = payload as { user_id?: unknown; id?: unknown; username?: unknown };
    const id = typeof record.user_id === "string" ? record.user_id : typeof record.id === "string" ? record.id : "";
    const username = typeof record.username === "string" ? record.username : "";
    if (!id || !username) return null;
    return { id, username };
  } catch {
    return null;
  }
}

export async function createImageContainer(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly igUserId: string;
  readonly imageUrl: string;
  readonly caption: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly httpStatus: number; readonly body: unknown; readonly transportError: boolean }> {
  return postGraph({
    config: input.config,
    accessToken: input.accessToken,
    path: `${input.igUserId}/media`,
    payload: { image_url: input.imageUrl, caption: input.caption },
    fetchImpl: input.fetchImpl,
  });
}

export async function readContainerStatus(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly containerId: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly statusCode: string | null; readonly transportError: boolean }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(graphUrl(input.config, input.containerId));
  url.searchParams.set("fields", "status_code");
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await fetchImpl(url.toString(), { method: "GET" });
    const payload = await readJson(response);
    const statusCode = payload && typeof payload === "object" && typeof (payload as { status_code?: unknown }).status_code === "string"
      ? (payload as { status_code: string }).status_code
      : null;
    if (!response.ok) return { statusCode: null, transportError: response.status >= 500 };
    return { statusCode, transportError: false };
  } catch {
    return { statusCode: null, transportError: true };
  }
}

export async function publishContainer(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly igUserId: string;
  readonly creationId: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly httpStatus: number; readonly body: unknown; readonly transportError: boolean }> {
  return postGraph({
    config: input.config,
    accessToken: input.accessToken,
    path: `${input.igUserId}/media_publish`,
    payload: { creation_id: input.creationId },
    fetchImpl: input.fetchImpl,
  });
}

export async function readPublishedMedia(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly mediaId: string;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{
  readonly ok: boolean;
  readonly transportError: boolean;
  readonly id: string | null;
  readonly caption: string | null;
  readonly username: string | null;
  readonly accountId: string | null;
  readonly permalink: string | null;
}> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(graphUrl(input.config, input.mediaId));
  url.searchParams.set("fields", "id,caption,permalink,username,timestamp");
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await fetchImpl(url.toString(), { method: "GET" });
    const payload = await readJson(response);
    if (!response.ok || !payload || typeof payload !== "object") {
      return { ok: false, transportError: response.status >= 500, id: null, caption: null, username: null, accountId: null, permalink: null };
    }
    const record = payload as { id?: unknown; caption?: unknown; permalink?: unknown; username?: unknown };
    return {
      ok: true,
      transportError: false,
      id: typeof record.id === "string" ? record.id : null,
      caption: typeof record.caption === "string" ? record.caption : null,
      username: typeof record.username === "string" ? record.username : null,
      accountId: null,
      permalink: typeof record.permalink === "string" ? record.permalink : null,
    };
  } catch {
    return { ok: false, transportError: true, id: null, caption: null, username: null, accountId: null, permalink: null };
  }
}

async function postGraph(input: {
  readonly config: InstagramOAuthConfig;
  readonly accessToken: string;
  readonly path: string;
  readonly payload: Record<string, string>;
  readonly fetchImpl?: InstagramFetch;
}): Promise<{ readonly httpStatus: number; readonly body: unknown; readonly transportError: boolean }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL(graphUrl(input.config, input.path));
  url.searchParams.set("access_token", input.accessToken);
  try {
    const response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input.payload),
    });
    return { httpStatus: response.status, body: await readJson(response), transportError: false };
  } catch {
    return { httpStatus: 0, body: null, transportError: true };
  }
}

function readToken(payload: unknown): { readonly accessToken: string; readonly userId: string; readonly scopes: readonly string[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { access_token?: unknown; user_id?: unknown; permissions?: unknown; data?: unknown };
  if (typeof record.access_token === "string") {
    return {
      accessToken: record.access_token,
      userId: typeof record.user_id === "string" || typeof record.user_id === "number" ? String(record.user_id) : "",
      scopes: readScopes(record.permissions),
    };
  }
  const first = Array.isArray(record.data) ? record.data[0] : null;
  if (!first || typeof first !== "object") return null;
  const row = first as { access_token?: unknown; user_id?: unknown; permissions?: unknown };
  if (typeof row.access_token !== "string") return null;
  return {
    accessToken: row.access_token,
    userId: typeof row.user_id === "string" || typeof row.user_id === "number" ? String(row.user_id) : "",
    scopes: readScopes(row.permissions),
  };
}

function readScopes(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
