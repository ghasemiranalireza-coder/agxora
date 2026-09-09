/**
 * Phase 3C — GET /api/v1/integrations/amazon_seller/[resource]
 * Official SP-API reads. Never returns LWA tokens.
 */

import { NextResponse } from "next/server";
import { requireDatabase } from "@/app/lib/auth/server/http";
import { executeAmazonToolForActor, isAmazonToolName } from "@/app/lib/business-agent/amazon-tools";
import { resolveAmazonCapabilityForActor } from "@/app/lib/business-agent/capabilities";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { requireCurrentActor } from "@/app/lib/tenancy";

export const runtime = "nodejs";

const RESOURCE_TOOLS = {
  marketplaces: "amazon.list_marketplaces",
  listings: "amazon.list_listings",
  inventory: "amazon.list_inventory",
  orders: "amazon.list_orders",
  sales: "amazon.list_sales",
  pricing: "amazon.list_pricing",
  analyze: "amazon.analyze",
  reports: "amazon.list_marketplaces",
  status: "amazon.list_marketplaces",
} as const;

type Resource = keyof typeof RESOURCE_TOOLS;
type Ctx = { readonly params: Promise<{ readonly resource: string }> };

function isResource(value: string): value is Resource {
  return value in RESOURCE_TOOLS;
}

export async function GET(
  request: Request,
  context: Ctx,
): Promise<NextResponse> {
  try {
    requireDatabase();
    const actor = await requireCurrentActor();
    const { resource } = await context.params;
    if (!isResource(resource)) {
      throw new PersistenceError("validation", "Unknown Amazon resource");
    }
    if (resource === "reports") {
      return NextResponse.json(
        { ok: false, kind: "unsupported", reason: "amazon_reports_not_implemented" },
        { status: 501 },
      );
    }
    if (resource === "status") {
      const capability = await resolveAmazonCapabilityForActor(actor);
      const serialized = JSON.stringify(capability);
      if (/access_token|refresh_token|client_secret|Atza\||Atzr\|/i.test(serialized)) {
        return NextResponse.json(
          { ok: false, message: "Refusing to return credential material" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, ...capability });
    }
    const tool = RESOURCE_TOOLS[resource];
    if (!isAmazonToolName(tool)) {
      throw new PersistenceError("validation", "Unknown Amazon tool");
    }
    const url = new URL(request.url);
    const skusRaw = url.searchParams.get("skus") ?? "";
    const result = await executeAmazonToolForActor(actor, tool, {
      marketplaceId: url.searchParams.get("marketplaceId") ?? undefined,
      createdAfter: url.searchParams.get("createdAfter") ?? undefined,
      pageSize: url.searchParams.get("pageSize")
        ? Number.parseInt(url.searchParams.get("pageSize") ?? "", 10)
        : undefined,
      skus: skusRaw ? skusRaw.split(",").map((sku) => sku.trim()).filter(Boolean) : undefined,
      lowInventoryThreshold: url.searchParams.get("lowInventoryThreshold")
        ? Number.parseInt(url.searchParams.get("lowInventoryThreshold") ?? "", 10)
        : undefined,
    });
    const serialized = JSON.stringify(result);
    if (/access_token|refresh_token|client_secret|Atza\||Atzr\|/i.test(serialized)) {
      return NextResponse.json(
        { ok: false, message: "Refusing to return credential material" },
        { status: 500 },
      );
    }
    if (result && typeof result === "object" && "kind" in result) {
      const kind = (result as { kind?: string }).kind;
      if (kind === "unsupported") {
        return NextResponse.json({ ok: false, ...(result as object) }, { status: 501 });
      }
      if (kind === "failed") {
        return NextResponse.json({ ok: false, ...(result as object) }, { status: 502 });
      }
    }
    return NextResponse.json({ ok: true, ...(typeof result === "object" && result ? result : { result }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: false,
      kind: "unsupported",
      reason: "amazon_write_not_implemented",
      message: "Amazon Seller writes are not implemented",
    },
    { status: 501 },
  );
}
