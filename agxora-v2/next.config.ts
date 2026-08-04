import type { NextConfig } from "next";
import { productionOnlyHeaders } from "./app/lib/production/securityHeaders";

/**
 * Single active AGXORA Next.js application.
 * Always run npm scripts from this package directory (agxora-v2).
 * Turbopack root is the current working directory of the app package.
 */
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: false,
  },
  turbopack: {
    // Ensures Turbopack treats agxora-v2 as the project root when
    // `npm run dev` / `npm run build` are executed from this folder.
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: productionOnlyHeaders(isProd).map(({ key, value }) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
