import { createVercelHandler } from "../src/vercel.ts";

export default { fetch: createVercelHandler("/send") };
