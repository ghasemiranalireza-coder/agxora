/**
 * Server-only provider adapter factory.
 *
 * providerId → adapter
 * gmail → GmailProviderAdapter
 * youtube → YouTubeProviderAdapter
 * every other canonical id → UnimplementedProviderAdapter
 */

import "server-only";

import "./register";

export {
  getProviderAdapter,
  listRegisteredProviderAdapters,
  registerProviderAdapter,
  UnimplementedProviderAdapter,
  ADAPTER_RESULT_CODES,
  type AdapterConnectResult,
  type AdapterContext,
  type AdapterDisconnectResult,
  type AdapterExecuteResult,
  type AdapterHealthResult,
  type AdapterResultCode,
  type ProviderAdapter,
} from "../adapter";
export { adapterContextFromActor, requireAdapterActor } from "../adapter-context";
export {
  executeProviderCapabilityForActor,
  executeProviderCapabilityOrThrow,
  requireCanonicalProviderId,
} from "./execute";
export { gmailAdapter, GmailProviderAdapter } from "./gmail";
export { youtubeAdapter, YouTubeProviderAdapter } from "./youtube";
