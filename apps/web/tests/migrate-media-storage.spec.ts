import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rows = [{ id: "media_test", mimeType: "image/png", dataBase64: Buffer.from([1, 2, 3]).toString("base64") }];
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return {
    rows, where, set, update,
    put: vi.fn(), get: vi.fn(), bucket: vi.fn(),
    db: { select: () => ({ from: () => ({ where: async () => rows }) }), update },
  };
});

vi.mock("../scripts/load-local-env", () => ({ loadLocalEnv: vi.fn() }));
vi.mock("../src/lib/db/client", () => ({ getDb: () => mocks.db, closeDb: vi.fn() }));
vi.mock("../src/lib/ai/media/media-storage", () => ({
  ensureMediaBucket: mocks.bucket,
  getMediaObjectStore: () => ({ put: mocks.put, get: mocks.get }),
  mediaObjectPath: (id: string) => `lesson-images/${id}.png`,
}));

import { migrateMediaToStorage } from "../scripts/migrate-media-to-storage";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(new Uint8Array([1, 2, 3]));
  mocks.bucket.mockResolvedValue("exists");
});

describe("legacy image migration", () => {
  it("clears inline bytes only after an exact read-back match", async () => {
    await migrateMediaToStorage(true);
    expect(mocks.put).toHaveBeenCalledWith("lesson-images/media_test.png", new Uint8Array([1, 2, 3]), "image/png");
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ storagePath: "lesson-images/media_test.png", dataBase64: null }));
    expect(mocks.get.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  });

  it("preserves inline bytes when equally sized Storage content differs", async () => {
    mocks.get.mockResolvedValue(new Uint8Array([3, 2, 1]));
    await expect(migrateMediaToStorage(true)).rejects.toThrow("read-back bytes mismatch");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves inline bytes when the read-back size differs", async () => {
    mocks.get.mockResolvedValue(new Uint8Array([1, 2]));
    await expect(migrateMediaToStorage(true)).rejects.toThrow("read-back size mismatch");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not write objects, the bucket or database during a dry run", async () => {
    await migrateMediaToStorage();
    expect(mocks.bucket).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
