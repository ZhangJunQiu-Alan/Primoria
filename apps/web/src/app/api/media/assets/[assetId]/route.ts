import { NextResponse } from "next/server";
import { getOptionalAuthUser } from "@/lib/auth/guard";
import { hasDatabaseUrl } from "@/lib/db/client";
import { getMediaAsset } from "@/lib/ai/media/media-assets";

// Serves cached media bytes for `image` blocks. Global assets (owner_id NULL)
// are public and immutably cacheable; owner-scoped assets require the matching
// user and are cached privately so a shared cache can't leak them.
export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await context.params;
    if (!hasDatabaseUrl()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { denied, user } = await getOptionalAuthUser("media-asset");
    if (denied) return denied;

    const asset = await getMediaAsset(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (asset.ownerId) {
      if (!user || user.id !== asset.ownerId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const body = new Uint8Array(Buffer.from(asset.dataBase64, "base64"));
    const cacheControl = asset.ownerId
      ? "private, max-age=31536000, immutable"
      : "public, max-age=31536000, immutable";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": cacheControl,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    console.error("[media/assets]", error);
    return NextResponse.json({ error: "Failed to load media asset" }, { status: 500 });
  }
}
