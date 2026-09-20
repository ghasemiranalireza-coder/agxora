import type { IncomingMessage, ServerResponse } from "node:http";
import { handleVercelRequest } from "../vercelAdapter.ts";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleVercelRequest(req, res, "/");
}
