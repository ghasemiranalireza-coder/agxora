import type { NextConfig } from "next";

/**
 * Single active AGXORA Next.js application.
 * Always run npm scripts from this package directory (agxora-v2).
 * Turbopack root is the current working directory of the app package.
 */
const nextConfig: NextConfig = {
  turbopack: {
    // Ensures Turbopack treats agxora-v2 as the project root when
    // `npm run dev` / `npm run build` are executed from this folder.
    root: process.cwd(),
  },
};

export default nextConfig;
