import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildSnapshotInventory,
  currentInputHashes,
  requireSnapshotAuthorization,
  snapshotSha256,
  verifySnapshotDirectory,
} from "../scripts/kg-embedding-snapshot-common.mjs";
import { graphPath, readJson } from "../scripts/kg-db-common.mjs";

const inventory = buildSnapshotInventory();
const vector = Array.from({ length: 1536 }, (_, index) => index === 0 ? 1 : 0);
const rows = inventory.nodes.map((node: object) => ({ ...node, embedding: vector }));
const queries = [{ query_id: "synthetic-en-1", language: "en", embedding: vector, top_k: 1, expected: [inventory.nodes[0]] }];
const authorization = {
  decision_id: "synthetic-unit-test-only",
  status: "approved",
  approved_by_role: "synthetic test fixture",
  approved_at: "2026-08-28",
  external_evidence_reference: "https://example.invalid/synthetic-test-only",
  covered_graph_ids: inventory.graphIds.filter((id: string) => readJson(graphPath(id)).review_status === "needs_review"),
  allowed_artifact_contents: ["fixed_query_vectors", "manifest", "model_metadata", "stable_node_keys", "vectors"],
};
let directory: string;
let snapshotDirectory: string;
let authorizationPath: string;

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value));
}

function writeSnapshot(payloadRows = rows, fixedQueries = queries) {
  const payload = payloadRows.map((row: object) => JSON.stringify(row)).join("\n") + "\n";
  const fixedPayload = fixedQueries.map((row: object) => JSON.stringify(row)).join("\n") + "\n";
  const manifest = {
    schema_version: 1,
    snapshot_id: "synthetic-unit-test-only",
    created_at: "2026-08-28T00:00:00Z",
    provider: "synthetic",
    model: "synthetic",
    model_version: "ci:unit-test:1536",
    dimension: 1536,
    authorization_decision_id: authorization.decision_id,
    counts: inventory.counts,
    input_hashes: { ...currentInputHashes(authorizationPath), node_keys_sha256: inventory.nodeKeysSha256 },
    payload: { file: "embeddings.jsonl", sha256: snapshotSha256(payload), bytes: Buffer.byteLength(payload) },
    fixed_queries: { file: "fixed-query-vectors.jsonl", sha256: snapshotSha256(fixedPayload), bytes: Buffer.byteLength(fixedPayload), count: fixedQueries.length },
  };
  writeFileSync(join(snapshotDirectory, manifest.payload.file), payload);
  writeFileSync(join(snapshotDirectory, manifest.fixed_queries.file), fixedPayload);
  writeJson(join(snapshotDirectory, "manifest.json"), manifest);
  return manifest;
}

function verify() {
  return verifySnapshotDirectory(snapshotDirectory, { authorizationPath });
}

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "primoria-snapshot-unit-"));
  snapshotDirectory = join(directory, "snapshot");
  mkdirSync(snapshotDirectory);
  authorizationPath = join(directory, "synthetic-authorization.json");
});
beforeEach(() => writeJson(authorizationPath, authorization));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("KG snapshot authorization and integrity", () => {
  it("requires external authorization and exact reviewed graph coverage", () => {
    expect(() => requireSnapshotAuthorization(join(directory, "missing.json"))).toThrow("missing authorization decision");
    writeJson(authorizationPath, { ...authorization, covered_graph_ids: [] });
    expect(() => requireSnapshotAuthorization(authorizationPath)).toThrow("must cover exactly");
  });

  it("rejects unapproved, invalid-date, and source-text permissions", () => {
    for (const patch of [
      { status: "pending" },
      { approved_at: "not-a-date" },
      { allowed_artifact_contents: [...authorization.allowed_artifact_contents, "embed_text"] },
    ]) {
      writeJson(authorizationPath, { ...authorization, ...patch });
      expect(() => requireSnapshotAuthorization(authorizationPath)).toThrow();
    }
  });

  it("verifies all graph keys, vectors, input hashes, and fixed queries", () => {
    writeSnapshot();
    const result = verify();
    expect(result.inventory.counts.graphs).toBe(31);
    expect(result.rows).toHaveLength(inventory.counts.embeddings);
    expect(result.queries).toHaveLength(1);
  });

  it("rejects tampering even when the byte count is unchanged", () => {
    const manifest = writeSnapshot();
    manifest.payload.sha256 = "0".repeat(64);
    writeJson(join(snapshotDirectory, "manifest.json"), manifest);
    expect(verify).toThrow("checksum or byte count mismatch");
  });

  it("rejects stale source hashes", () => {
    const manifest = writeSnapshot();
    manifest.input_hashes.kg_source_sha256 = "0".repeat(64);
    writeJson(join(snapshotDirectory, "manifest.json"), manifest);
    expect(verify).toThrow("snapshot input hash is stale");
  });

  it("rejects duplicate and missing stable keys", () => {
    writeSnapshot([rows[0], ...rows.slice(0, -1)]);
    expect(verify).toThrow("duplicate node key");
    writeSnapshot(rows.slice(1));
    expect(verify).toThrow("embeddings; expected");
  });

  it("rejects wrong dimensions, non-finite values, and zero vectors", () => {
    for (const embedding of [vector.slice(1), vector.map(() => 0), vector.map(() => Infinity)]) {
      writeSnapshot([{ ...rows[0], embedding }, ...rows.slice(1)]);
      expect(verify).toThrow(/exactly 1536|zero vector|non-finite/);
    }
  });

  it("rejects source text in embedding rows and expected query keys", () => {
    writeSnapshot([{ ...rows[0], embed_text: "not allowed" }, ...rows.slice(1)]);
    expect(verify).toThrow("unexpected fields");
    writeSnapshot(rows, [{ ...queries[0], expected: [{ ...inventory.nodes[0], embed_text: "not allowed" }] }]);
    expect(verify).toThrow("unexpected fields");
  });

  it("does not resolve payload paths outside the snapshot directory", () => {
    const manifest = writeSnapshot();
    manifest.payload.file = "../embeddings.jsonl";
    writeJson(join(snapshotDirectory, "manifest.json"), manifest);
    expect(verify).toThrow("snapshot payload must be embeddings.jsonl");
  });

  it("rejects unknown query targets and duplicate query IDs", () => {
    writeSnapshot(rows, [{ ...queries[0], expected: [{ ...inventory.nodes[0], node_id: "missing" }] }]);
    expect(verify).toThrow("expects unknown node key");
    writeSnapshot(rows, [queries[0], queries[0]]);
    expect(verify).toThrow("missing or duplicated");
  });
});
