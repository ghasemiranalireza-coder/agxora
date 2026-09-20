import { handleEmailWorkerRequest } from "./handler.ts";

export function createVercelHandler(pathname: "/health" | "/send") {
  return async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    url.pathname = pathname;

    return handleEmailWorkerRequest(new Request(url, request), {
      env: process.env,
      fetch: globalThis.fetch,
      log: (event) => console.info("[agxora.email-worker]", event),
    });
  };
}
