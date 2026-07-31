/**
 * Testability helpers — mock providers for unit / integration / e2e.
 */

export type MockClock = {
  readonly now: () => number;
  readonly advance: (ms: number) => void;
};

export function createMockClock(start = Date.now()): MockClock {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

export type MockFetch = {
  readonly calls: readonly {
    readonly url: string;
    readonly init?: RequestInit;
  }[];
  readonly fetch: typeof fetch;
  readonly respondWith: (handler: typeof fetch) => void;
};

export function createMockFetch(
  defaultHandler?: typeof fetch,
): MockFetch {
  const calls: { url: string; init?: RequestInit }[] = [];
  let handler: typeof fetch =
    defaultHandler ??
    (async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));

  return {
    get calls() {
      return calls;
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      calls.push({ url, init });
      return handler(input, init);
    }) as typeof fetch,
    respondWith(next) {
      handler = next;
    },
  };
}
