import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaAssets, type MediaAssetRow } from "@/lib/db/schema";
import { imageCacheKey, type ImageBrief } from "./image-brief";

/** Public URL a block references. Bytes are served by the media API, never
 * embedded in the block JSONB or React props. */
export function imageAssetUrl(assetId: string): string {
  return `/api/media/assets/${assetId}`;
}

function randomAssetId(): string {
  return `media_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Raw output of a generation call (provider-agnostic). */
export type GeneratedImage = {
  mimeType: string;
  dataBase64: string;
  model: string;
  width?: number | null;
  height?: number | null;
  /** Token usage for cost tracking, when the provider reports it. */
  usage?: { totalTokens?: number; imageTokens?: number };
};

export type NewMediaAsset = {
  id: string;
  ownerId: string | null;
  cacheKey: string;
  provider: string;
  model: string;
  mimeType: string;
  dataBase64: string;
  prompt: string;
  brief: ImageBrief;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  byteLength: number;
};

/** Cache + persistence boundary. Injectable so the resolve flow can be unit
 * tested against an in-memory store with no database. */
export interface MediaAssetStore {
  findByCacheKey(cacheKey: string): Promise<MediaAssetRow | null>;
  getById(assetId: string): Promise<MediaAssetRow | null>;
  insert(asset: NewMediaAsset): Promise<MediaAssetRow>;
}

export const dbMediaAssetStore: MediaAssetStore = {
  async findByCacheKey(cacheKey) {
    const rows = await getDb().select().from(mediaAssets).where(eq(mediaAssets.cacheKey, cacheKey)).limit(1);
    return rows[0] ?? null;
  },
  async getById(assetId) {
    const rows = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1);
    return rows[0] ?? null;
  },
  async insert(asset) {
    // onConflictDoNothing absorbs a concurrent insert that already claimed this
    // cache_key; the caller re-reads by cacheKey to converge on one asset.
    const rows = await getDb().insert(mediaAssets).values(asset).onConflictDoNothing({ target: mediaAssets.cacheKey }).returning();
    if (rows[0]) return rows[0];
    const existing = await this.findByCacheKey(asset.cacheKey);
    if (!existing) throw new Error("media asset insert failed without a conflicting row");
    return existing;
  },
};

export async function getMediaAsset(assetId: string, store: MediaAssetStore = dbMediaAssetStore): Promise<MediaAssetRow | null> {
  return store.getById(assetId);
}

export type ResolveImageInput = {
  brief: ImageBrief;
  model: string;
  provider?: string;
  /** null → globally reusable asset; otherwise owner-scoped. */
  ownerId: string | null;
  /** Called only on a cache miss. */
  generate: () => Promise<GeneratedImage>;
};

export type ResolvedImageAsset = {
  assetId: string;
  imageUrl: string;
  mimeType: string;
  /** True when an existing cached asset satisfied the brief (no generation). */
  reused: boolean;
};

/** Reuse-or-generate: identical briefs (by cacheKey) return the same asset and
 * never call `generate` twice. */
export async function resolveImageAsset(
  input: ResolveImageInput,
  store: MediaAssetStore = dbMediaAssetStore,
): Promise<ResolvedImageAsset> {
  const cacheKey = imageCacheKey(input.brief, input.model);
  const cached = await store.findByCacheKey(cacheKey);
  if (cached) {
    return { assetId: cached.id, imageUrl: imageAssetUrl(cached.id), mimeType: cached.mimeType, reused: true };
  }

  const generated = await input.generate();
  const byteLength = Buffer.from(generated.dataBase64, "base64").byteLength;
  const row = await store.insert({
    id: randomAssetId(),
    ownerId: input.ownerId,
    cacheKey,
    provider: input.provider ?? "google",
    model: generated.model || input.model,
    mimeType: generated.mimeType,
    dataBase64: generated.dataBase64,
    prompt: input.brief.prompt,
    brief: input.brief,
    alt: input.brief.alt,
    caption: input.brief.caption,
    width: generated.width ?? null,
    height: generated.height ?? null,
    byteLength,
  });
  return { assetId: row.id, imageUrl: imageAssetUrl(row.id), mimeType: row.mimeType, reused: false };
}
