# AGXORA Enterprise Integration Platform

## Architecture

```
features/integrations/
  connectors/      # Catalog + provider registry (M365, Google, Slack, …)
  oauth/           # Provider-independent OAuth adapters
  gateway/         # REST · GraphQL/WS/gRPC placeholders · webhook routes
  webhooks/        # Incoming / outgoing · retries · signing placeholders
  api-keys/        # Generate · rotate · revoke · scopes · usage
  mapping/         # Field transforms · defaults · validation · script hook
  sync/            # One-way · two-way · manual · scheduled · conflicts
  security/        # Encrypted credential / vault abstraction
  event-bridge/    # Publishes/subscribes via Workflow Automation event bus
  observability/   # Connector · API · webhook · sync metrics
  repositories/    # LocalStorage now · REST placeholder
  store/           # Persisted integration state
  services/        # integrationService (UI-independent)
  hooks/           # useIntegrationPlatform
  providers/       # IntegrationBridge
  components/      # IntegrationCenter
```

UI never stores raw OAuth tokens or API secrets — only vault references and key prefixes.

## Connector model

Register runtime adapters with `registerConnectorProvider`. Catalog entries define auth, protocols, scopes, and event types. Adding a connector = catalog row + optional provider implementation.

## OAuth flow

1. `integrationService.connect` → `beginOAuth` → placeholder authorize URL + PKCE challenge.
2. Token exchange stores a vault ref via `getSecretVault()`.
3. Swap adapters with `registerOAuthProvider` for live Google / Microsoft / GitHub / Slack / Dropbox.

## API Gateway

`invokeApiGateway` handles REST today. GraphQL, WebSocket, and gRPC routes exist as disabled placeholders. Inject `setApiGatewayHandler` for backend forwarding.

## Webhook Engine

- Outgoing: `deliverOutgoingWebhook` with retry status.
- Incoming: `receiveIncomingWebhook` with signature placeholder verification.
- Secrets: `createWebhookSecretRef` → vault abstraction.

## Event bridge

`publishIntegrationEvent` / `bridgeConnectorToWorkflows` emit onto `@/features/automation` event bus so workflows can subscribe to connector events.

## Extension points

1. New connector — catalog + `registerConnectorProvider`.
2. Live OAuth — `registerOAuthProvider`.
3. Backend persistence — `setIntegrationsRepository(new RestIntegrationsRepository(url))`.
4. Custom mapping scripts — `transform: "custom"` + `customScriptPlaceholder`.
5. Real HTTP webhook delivery — replace stub in `webhooks/`.

## Developer guide

- Route: `/dashboard/automation` remains Workflow Engine; Integration Center is `/dashboard/integrations`.
- Settings → Integrations / API link into the Center.
- Generate keys in **API Keys**; explore REST in **Developer**; test hooks in **Webhooks**.

## Shell safety

Dashboard layout, sidebar, header, hero, globe, theme, and navigation are unchanged.
