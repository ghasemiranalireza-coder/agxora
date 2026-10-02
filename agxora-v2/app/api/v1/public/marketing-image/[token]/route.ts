/**
 * GET /api/v1/public/marketing-image/[token]
 * Meta fetches this URL. The token authorizes one organization asset for a few minutes.
 */

import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/app/lib/db/prisma";
import { getCreativeBlobStore } from "@/app/lib/creative/blobStore";
import { readMarketingAssetTicket } from "@/app/lib/social/instagram/assetTicket";

export const runtime = "nodejs";

type Ctx = { readonly params: Promise<{ readonly token: string }> };

export async function GET(_request: Request, context: Ctx): Promise<NextResponse> {
  const { token } = await context.params;
  const ticket = readMarketingAssetTicket(token);
  if (!ticket) return new NextResponse(null, { status: 404 });
  const asset = await prisma.creativeAsset.findFirst({
    where: { id: ticket.assetId, organizationId: ticket.organizationId },
  });
  if (!asset) return new NextResponse(null, { status: 404 });
  const prefix = `org/${ticket.organizationId}/creative/`;
  let bytes: Uint8Array | null = asset.bytes ? new Uint8Array(asset.bytes) : null;
  if (!bytes && asset.objectKey?.startsWith(prefix)) {
    try {
      bytes = await getCreativeBlobStore().getObjectBytes(asset.objectKey);
    } catch {
      bytes = null;
    }
  }
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > 8_000_000) {
    return new NextResponse(null, { status: 404 });
  }
  const mime = asset.mimeType.toLowerCase();
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const jpeg = mime === "image/jpeg" ? Buffer.from(bytes) : await sharp(bytes).jpeg({ quality: 90 }).toBuffer();
    if (jpeg.byteLength < 3 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
