import "server-only";

import { registerProviderAdapter } from "../adapter";
import { gmailAdapter } from "./gmail";
import { youtubeAdapter } from "./youtube";

registerProviderAdapter(gmailAdapter);
registerProviderAdapter(youtubeAdapter);
