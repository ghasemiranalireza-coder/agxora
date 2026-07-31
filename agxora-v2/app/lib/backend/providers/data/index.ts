/**
 * Data provider factory — select Local / REST / GraphQL / Database / Mock.
 */

import { backendConfig } from "../../config";
import { futureDatabaseProvider } from "./FutureDatabaseProvider";
import { graphQLDataProvider } from "./GraphQLDataProvider";
import { localDataProvider } from "./LocalDataProvider";
import { mockDataProvider } from "./MockDataProvider";
import { restDataProvider } from "./RestDataProvider";
import type { DataProvider, DataProviderId } from "./types";

const registry = new Map<DataProviderId, DataProvider>([
  ["local", localDataProvider],
  ["rest", restDataProvider],
  ["graphql", graphQLDataProvider],
  ["database", futureDatabaseProvider],
  ["mock", mockDataProvider],
]);

export function registerDataProvider(provider: DataProvider): void {
  registry.set(provider.id, provider);
}

export function getDataProvider(id?: DataProviderId): DataProvider {
  const resolved =
    id ??
    (backendConfig.enableMockRepositories
      ? ("local" as const)
      : ("rest" as const));
  const provider = registry.get(resolved);
  if (!provider) {
    throw new Error(`Unknown data provider: ${resolved}`);
  }
  return provider;
}

export function listDataProviders(): readonly DataProvider[] {
  return [...registry.values()];
}

let activeProviderId: DataProviderId = backendConfig.enableMockRepositories
  ? "local"
  : "rest";

export function setActiveDataProvider(id: DataProviderId): DataProvider {
  const provider = getDataProvider(id);
  activeProviderId = id;
  return provider;
}

export function getActiveDataProvider(): DataProvider {
  return getDataProvider(activeProviderId);
}

export {
  localDataProvider,
  restDataProvider,
  graphQLDataProvider,
  futureDatabaseProvider,
  mockDataProvider,
};
export type {
  DataProvider,
  DataProviderId,
  DataProviderCapabilities,
  DataProviderHealth,
  DataProviderFactory,
} from "./types";
