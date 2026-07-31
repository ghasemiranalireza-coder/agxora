/**
 * Backend route-guard helpers for Next.js proxy / edge.
 * Canonical catalog: app/lib/production/routes.
 */

export {
  PUBLIC_ROUTE_PATHS,
  PRIVATE_ROUTE_PREFIXES,
  ADMIN_ROUTE_PREFIXES,
  type RouteClass,
  matchesPrefix,
  classifyRoute,
  isPublicPath,
} from "@/app/lib/production/routes";
