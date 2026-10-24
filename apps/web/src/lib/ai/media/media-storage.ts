// Lesson image bytes live in a private Supabase Storage bucket; Postgres keeps
// only the media_assets metadata and the object path. Server-side only: the
// secret key never reaches the browser, which always reads image bytes through
// /api/media/assets/[assetId]. Plain REST (no Supabase SDK). When Storage is not
// configured (local dev, isolated test databases) bytes stay in Postgres.

export const DEFAULT_MEDIA_BUCKET = "lesson-media";

/** Object store boundary. Injectable so the resolve/serve flows can be tested
 * without a network. */
export interface MediaObjectStore {
  put(path: string, bytes: Uint8Array<ArrayBuffer>, contentType: string): Promise<void>;
  get(path: string): Promise<Uint8Array<ArrayBuffer>>;
}

type StorageConfig = { url: string; key: string; bucket: string };

function storageConfig(): StorageConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return { url, key, bucket: process.env.PRIMORIA_MEDIA_BUCKET?.trim() || DEFAULT_MEDIA_BUCKET };
}

export function isMediaStorageConfigured(): boolean {
  return storageConfig() !== null;
}

// New `sb_secret_` keys go only on `apikey`; a legacy service_role key is a JWT
// and is also sent as the bearer token.
export function storageHeaders(key: string): Record<string, string> {
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Object path for an asset's bytes. Keyed by the stable asset id, never by the
 * cache key, so a cache-rule change never orphans or overwrites stored bytes. */
export function mediaObjectPath(assetId: string, mimeType: string): string {
  return `lesson-images/${assetId}.${EXTENSIONS[mimeType] ?? "bin"}`;
}

const TIMEOUT_MS = 30_000;

function objectUrl(config: StorageConfig, path: string): string {
  return `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function storageError(action: string, response: Response): Promise<Error> {
  const detail = (await response.text().catch(() => "")).slice(0, 200);
  return new Error(`media storage ${action} failed (${response.status})${detail ? `: ${detail}` : ""}`);
}

function supabaseObjectStore(config: StorageConfig, fetchImpl: typeof fetch = fetch): MediaObjectStore {
  return {
    async put(path, bytes, contentType) {
      const response = await fetchImpl(objectUrl(config, path), {
        method: "POST",
        headers: {
          ...storageHeaders(config.key),
          "Content-Type": contentType,
          "Cache-Control": "31536000",
          // Uploads are keyed by asset id, so a retry rewrites the same bytes.
          "x-upsert": "true",
        },
        body: bytes,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw await storageError("upload", response);
    },
    async get(path) {
      const response = await fetchImpl(objectUrl(config, path), {
        headers: storageHeaders(config.key),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw await storageError("download", response);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

/** The configured Supabase object store, or null when Storage is not configured. */
export function getMediaObjectStore(fetchImpl?: typeof fetch): MediaObjectStore | null {
  const config = storageConfig();
  return config ? supabaseObjectStore(config, fetchImpl) : null;
}

/** Create the private media bucket when it does not exist yet (idempotent).
 * Used by operator scripts, never on the request path. */
export async function ensureMediaBucket(fetchImpl: typeof fetch = fetch): Promise<"created" | "exists"> {
  const config = storageConfig();
  if (!config) throw new Error("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)");
  const existing = await fetchImpl(`${config.url}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, {
    headers: storageHeaders(config.key),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (existing.ok) return "exists";
  const created = await fetchImpl(`${config.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...storageHeaders(config.key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: false,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: Object.keys(EXTENSIONS),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!created.ok) throw await storageError("bucket create", created);
  return "created";
}
