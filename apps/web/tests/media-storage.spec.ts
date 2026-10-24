import { afterEach, describe, expect, it, vi } from "vitest";

import type { ImageBrief } from "../src/lib/ai/media/image-brief";
import { readMediaAssetBytes, resolveImageAsset, type MediaAssetStore, type NewMediaAsset } from "../src/lib/ai/media/media-assets";
import {
  getMediaObjectStore,
  mediaObjectPath,
  storageHeaders,
  type MediaObjectStore,
} from "../src/lib/ai/media/media-storage";
import type { MediaAssetRow } from "../src/lib/db/schema";

const brief = (overrides: Partial<ImageBrief> = {}): ImageBrief => ({
  conceptIds: ["bio.membrane"],
  learningGoal: "See how a membrane lets some molecules through",
  imageKind: "structure_diagram",
  prompt: "A cell membrane with channel proteins",
  alt: "Cell membrane cross-section",
  caption: "Notice the channel proteins.",
  language: "zh",
  ...overrides,
});

function memoryAssets(): MediaAssetStore & { rows: NewMediaAsset[] } {
  const rows: NewMediaAsset[] = [];
  const toRow = (a: NewMediaAsset) => ({ ...a, createdAt: new Date(), updatedAt: new Date() }) as unknown as MediaAssetRow;
  return {
    rows,
    async findByCacheKey(key) { const r = rows.find((x) => x.cacheKey === key); return r ? toRow(r) : null; },
    async getById(id) { const r = rows.find((x) => x.id === id); return r ? toRow(r) : null; },
    async insert(asset) { rows.push(asset); return toRow(asset); },
  };
}

function memoryObjects(): MediaObjectStore & { objects: Map<string, { bytes: Uint8Array<ArrayBuffer>; contentType: string }> } {
  const objects = new Map<string, { bytes: Uint8Array<ArrayBuffer>; contentType: string }>();
  return {
    objects,
    async put(path, bytes, contentType) { objects.set(path, { bytes, contentType }); },
    async get(path) {
      const hit = objects.get(path);
      if (!hit) throw new Error("missing object");
      return hit.bytes;
    },
  };
}

const PIXEL = Buffer.from("fake-webp-bytes").toString("base64");
const generate = async () => ({ mimeType: "image/webp", dataBase64: PIXEL, model: "gpt-image-2" });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("media bytes in Supabase Storage", () => {
  it("uploads new bytes to Storage and keeps only the path in Postgres", async () => {
    const assets = memoryAssets();
    const objects = memoryObjects();
    const first = await resolveImageAsset({ brief: brief(), model: "gpt-image-2", ownerId: null, generate, objects }, assets);

    const row = assets.rows[0];
    expect(row.dataBase64).toBeNull();
    expect(row.storagePath).toBe(mediaObjectPath(first.assetId, "image/webp"));
    expect(row.storagePath).toMatch(/^lesson-images\/media_[a-z0-9]+\.webp$/);
    expect(row.byteLength).toBe(Buffer.from(PIXEL, "base64").byteLength);
    expect(objects.objects.get(row.storagePath!)?.contentType).toBe("image/webp");

    const bytes = await readMediaAssetBytes(row, objects);
    expect(Buffer.from(bytes).toString("base64")).toBe(PIXEL);
  });

  it("keeps bytes in Postgres when Storage is not configured", async () => {
    const assets = memoryAssets();
    await resolveImageAsset({ brief: brief(), model: "m", ownerId: null, generate, objects: null }, assets);
    expect(assets.rows[0].storagePath).toBeNull();
    expect(assets.rows[0].dataBase64).toBe(PIXEL);
    expect(Buffer.from(await readMediaAssetBytes(assets.rows[0], null)).toString("base64")).toBe(PIXEL);
  });

  it("reuses one image per concept with the stored kind and text", async () => {
    const assets = memoryAssets();
    const objects = memoryObjects();
    await resolveImageAsset({ brief: brief(), model: "gpt-image-2", ownerId: null, generate, objects }, assets);
    const reuse = await resolveImageAsset({
      brief: brief({ imageKind: "realistic_scene", learningGoal: "another lesson", caption: "new caption" }),
      model: "gemini-3.1-flash-lite-image",
      ownerId: null,
      generate: () => { throw new Error("must not regenerate"); },
      objects,
    }, assets);
    expect(reuse.reused).toBe(true);
    expect(reuse.imageKind).toBe("structure_diagram");
    expect(reuse.caption).toBe("Notice the channel proteins.");
  });

  it("fails loudly when a Storage-backed row is read without Storage configured", async () => {
    await expect(readMediaAssetBytes({ storagePath: "lesson-images/x.webp", dataBase64: null }, null)).rejects.toThrow(/not configured/);
  });

  it("sends new secret keys only on apikey and legacy JWT keys as bearer too", () => {
    expect(storageHeaders("sb_secret_abc")).toEqual({ apikey: "sb_secret_abc" });
    expect(storageHeaders("eyJhbGciOi.x.y")).toEqual({ apikey: "eyJhbGciOi.x.y", Authorization: "Bearer eyJhbGciOi.x.y" });
  });

  it("talks to the Storage REST API with upsert uploads and authenticated reads", async () => {
    vi.stubEnv("SUPABASE_URL", "https://ref.supabase.co/");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_abc");
    vi.stubEnv("PRIMORIA_MEDIA_BUCKET", "lesson-media");
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(init?.method === "POST" ? "{}" : new Uint8Array([1, 2, 3]), { status: 200 });
    }) as unknown as typeof fetch;
    const store = getMediaObjectStore(fetchImpl)!;

    await store.put("lesson-images/media_a.webp", new Uint8Array([9]), "image/webp");
    const got = await store.get("lesson-images/media_a.webp");

    expect(calls[0].url).toBe("https://ref.supabase.co/storage/v1/object/lesson-media/lesson-images/media_a.webp");
    expect(calls[0].init?.method).toBe("POST");
    expect((calls[0].init?.headers as Record<string, string>)["x-upsert"]).toBe("true");
    expect((calls[0].init?.headers as Record<string, string>).apikey).toBe("sb_secret_abc");
    expect(calls[1].url).toBe(calls[0].url);
    expect(Array.from(got)).toEqual([1, 2, 3]);
  });

  it("is off when the Storage env is incomplete", () => {
    vi.stubEnv("SUPABASE_URL", "https://ref.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(getMediaObjectStore()).toBeNull();
  });
});
