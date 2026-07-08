#!/usr/bin/env tsx

import { imageCacheKey, STYLE_VERSION, type ImageBrief } from "../src/lib/ai/media/image-brief.ts";
import {
  imageAssetUrl,
  resolveImageAsset,
  type GeneratedImage,
  type MediaAssetStore,
  type NewMediaAsset,
} from "../src/lib/ai/media/media-assets.ts";
import type { MediaAssetRow } from "../src/lib/db/schema.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function brief(overrides: Partial<ImageBrief> = {}): ImageBrief {
  return {
    conceptIds: ["c2", "c1"],
    learningGoal: "Recognize the chloroplast structure",
    imageKind: "structure_diagram",
    prompt: "A labelled-free flat illustration of a chloroplast",
    alt: "Chloroplast cross-section",
    caption: "Notice the stacked thylakoids inside the stroma.",
    ...overrides,
  };
}

function memoryStore(): MediaAssetStore & { rows: NewMediaAsset[] } {
  const rows: NewMediaAsset[] = [];
  const toRow = (a: NewMediaAsset): MediaAssetRow => ({
    ...a,
    brief: a.brief as unknown,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as MediaAssetRow;
  return {
    rows,
    async findByCacheKey(cacheKey) {
      const found = rows.find((r) => r.cacheKey === cacheKey);
      return found ? toRow(found) : null;
    },
    async getById(assetId) {
      const found = rows.find((r) => r.id === assetId);
      return found ? toRow(found) : null;
    },
    async insert(asset) {
      if (rows.some((r) => r.cacheKey === asset.cacheKey)) {
        return toRow(rows.find((r) => r.cacheKey === asset.cacheKey)!);
      }
      rows.push(asset);
      return toRow(asset);
    },
  };
}

const MODEL = "gemini-3.1-flash-image";

function testCacheKeyStability() {
  // conceptId ordering must not fork the cache.
  const a = imageCacheKey(brief({ conceptIds: ["c1", "c2"] }), MODEL);
  const b = imageCacheKey(brief({ conceptIds: ["c2", "c1"] }), MODEL);
  assert(a === b, "cacheKey ignores conceptId ordering");

  // Reworded prompt/alt/caption with the same semantics reuses the asset.
  const reworded = imageCacheKey(brief({ prompt: "totally different prompt text", alt: "x", caption: "y" }), MODEL);
  assert(a === reworded, "cacheKey hashes brief semantics, not rendered prompt text");

  // Semantic changes fork the cache.
  assert(imageCacheKey(brief({ learningGoal: "something else" }), MODEL) !== a, "learningGoal change forks the cache");
  assert(imageCacheKey(brief({ imageKind: "realistic_scene" }), MODEL) !== a, "imageKind change forks the cache");
  assert(imageCacheKey(brief({ resolution: "2K" }), MODEL) !== a, "resolution change forks the cache");
  assert(imageCacheKey(brief(), "other-model") !== a, "model change forks the cache");
  assert(imageCacheKey(brief({ styleVersion: `${STYLE_VERSION}-next` }), MODEL) !== a, "styleVersion change forks the cache");

  // Defaults are applied, not left undefined.
  assert(imageCacheKey(brief({ resolution: "1K", aspectRatio: "4:3", language: "en" }), MODEL) === a, "defaults match explicit default values");
}

async function testReuseDoesNotRegenerate() {
  const store = memoryStore();
  let generateCalls = 0;
  const generate = async (): Promise<GeneratedImage> => {
    generateCalls += 1;
    return { mimeType: "image/jpeg", dataBase64: Buffer.from("fake-bytes").toString("base64"), model: MODEL };
  };

  const first = await resolveImageAsset({ brief: brief(), model: MODEL, ownerId: "user_1", generate }, store);
  const second = await resolveImageAsset({ brief: brief({ prompt: "reworded same brief" }), model: MODEL, ownerId: "user_1", generate }, store);

  assert(generateCalls === 1, "identical brief generates exactly once");
  assert(first.reused === false, "first resolve generates a fresh asset");
  assert(second.reused === true, "second resolve reuses the cached asset");
  assert(first.assetId === second.assetId, "reuse returns the same asset id");
  assert(store.rows.length === 1, "only one asset row is stored");
  assert(first.imageUrl === imageAssetUrl(first.assetId), "resolved url matches the asset url helper");
  assert(first.mimeType === "image/jpeg", "mime type comes from the generated image");
}

async function testOwnerScopeAndBytes() {
  const store = memoryStore();
  const dataBase64 = Buffer.from("a-larger-fake-payload").toString("base64");
  await resolveImageAsset({
    brief: brief(),
    model: MODEL,
    ownerId: null, // global asset
    generate: async () => ({ mimeType: "image/png", dataBase64, model: MODEL, width: 1024, height: 768 }),
  }, store);

  const row = store.rows[0];
  assert(row.ownerId === null, "null ownerId persists as a global asset");
  assert(row.byteLength === Buffer.from(dataBase64, "base64").byteLength, "byteLength is derived from decoded bytes");
  assert(row.width === 1024 && row.height === 768, "dimensions persist when provided");
  assert(row.provider === "google", "provider defaults to google");
}

function testAssetUrl() {
  assert(imageAssetUrl("media_abc") === "/api/media/assets/media_abc", "asset url uses the media API path");
}

// Regression: the brief-keyed cache is shared across users. Images are stored
// global (ownerId null) so every user who reuses a cached asset can read it — an
// owner-scoped asset would 404 for everyone after the first generator.
async function testCrossUserGlobalReuse() {
  const store = memoryStore();
  let generateCalls = 0;
  const generate = async (): Promise<GeneratedImage> => {
    generateCalls += 1;
    return { mimeType: "image/jpeg", dataBase64: Buffer.from("shared").toString("base64"), model: MODEL };
  };

  // First user generates the asset (global).
  const first = await resolveImageAsset({ brief: brief(), model: MODEL, ownerId: null, generate }, store);
  // A different user, same brief → cache hit on the SAME global asset, no regeneration.
  const second = await resolveImageAsset({ brief: brief(), model: MODEL, ownerId: null, generate }, store);

  assert(generateCalls === 1, "second user reuses the cached asset instead of regenerating");
  assert(first.assetId === second.assetId, "both users reference the same global asset");
  assert(store.rows[0].ownerId === null, "the shared asset is global (publicly readable, never 404)");
}

async function main() {
  testCacheKeyStability();
  await testReuseDoesNotRegenerate();
  await testOwnerScopeAndBytes();
  await testCrossUserGlobalReuse();
  testAssetUrl();
  process.stdout.write("[media-assets.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
