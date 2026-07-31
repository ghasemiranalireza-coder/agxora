/**
 * Provider-independent OAuth architecture (placeholders).
 */

import type {
  OAuthAuthorizationRequest,
  OAuthAuthorizationResult,
  OAuthProviderId,
} from "../types";

export interface OAuthProviderAdapter {
  readonly id: OAuthProviderId;
  readonly displayName: string;
  readonly authorize: (
    req: OAuthAuthorizationRequest,
  ) => Promise<OAuthAuthorizationResult>;
  readonly exchangeCodePlaceholder: (
    code: string,
    state: string,
  ) => Promise<{ vaultRef: string; expiresAt?: string }>;
}

function createAdapter(
  id: OAuthProviderId,
  displayName: string,
): OAuthProviderAdapter {
  return {
    id,
    displayName,
    async authorize(req) {
      const params = new URLSearchParams({
        client_id: "agxora_placeholder",
        redirect_uri: req.redirectUri,
        response_type: "code",
        scope: req.scopes.join(" "),
        state: req.state,
      });
      if (req.codeChallenge) {
        params.set("code_challenge", req.codeChallenge);
        params.set("code_challenge_method", "S256");
      }
      return {
        authorizationUrl: `https://oauth.placeholder.local/${id}/authorize?${params.toString()}`,
        state: req.state,
        placeholder: true,
      };
    },
    async exchangeCodePlaceholder(code, state) {
      void code;
      return {
        vaultRef: `vault_oauth_${id}_${state.slice(0, 8)}`,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      };
    },
  };
}

const adapters = new Map<OAuthProviderId, OAuthProviderAdapter>([
  ["google", createAdapter("google", "Google")],
  ["microsoft", createAdapter("microsoft", "Microsoft")],
  ["github", createAdapter("github", "GitHub")],
  ["slack", createAdapter("slack", "Slack")],
  ["dropbox", createAdapter("dropbox", "Dropbox")],
  ["custom", createAdapter("custom", "Custom OAuth")],
]);

export function getOAuthProvider(
  id: OAuthProviderId,
): OAuthProviderAdapter {
  return adapters.get(id) ?? adapters.get("custom")!;
}

export function listOAuthProviders(): readonly OAuthProviderAdapter[] {
  return Array.from(adapters.values());
}

export function registerOAuthProvider(adapter: OAuthProviderAdapter): void {
  adapters.set(adapter.id, adapter);
}

export async function beginOAuth(
  req: OAuthAuthorizationRequest,
): Promise<OAuthAuthorizationResult> {
  return getOAuthProvider(req.providerId).authorize(req);
}
