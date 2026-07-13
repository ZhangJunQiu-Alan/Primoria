import { chmodSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "../..");
const script = resolve(repoRoot, "scripts/pg-backup.sh");

function runBackup(failUpload = false) {
  const root = mkdtempSync(join(tmpdir(), "primoria-backup-test-"));
  const bin = join(root, "bin");
  const backupDir = join(root, "backups");
  spawnSync("mkdir", ["-p", bin, backupDir]);
  const fakeDocker = join(bin, "docker");
  writeFileSync(fakeDocker, `#!/usr/bin/env bash
set -eu
if [[ " $* " == *" compose "* ]]; then printf 'fake-custom-dump'; exit 0; fi
if [[ "${failUpload ? "1" : "0"}" == "1" && " $* " == *" s3 cp /backups/"* ]]; then exit 42; fi
if [[ " $* " == *".sha256 - --only-show-errors"* ]]; then cat "$PRIMORIA_BACKUP_DIR"/*.sha256; exit 0; fi
exit 0
`);
  chmodSync(fakeDocker, 0o755);
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      PRIMORIA_BACKUP_DIR: backupDir,
      COS_ENDPOINT_URL: "https://cos.example.test",
      COS_REGION: "ap-test",
      COS_BUCKET: "backup-test",
      COS_ACCESS_KEY_ID: "test-id",
      COS_SECRET_ACCESS_KEY: "test-key",
    },
  });
  return { backupDir, result };
}

describe("off-site backup script", () => {
  it("writes a custom dump and checksum only after remote verification", () => {
    const { backupDir, result } = runBackup();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"status":"ok"');
    const names = readdirSync(backupDir);
    expect(names.some((name) => name.endsWith(".dump"))).toBe(true);
    const checksum = names.find((name) => name.endsWith(".sha256"));
    expect(checksum && readFileSync(join(backupDir, checksum), "utf8")).toContain("primoria-");
  });

  it("returns failure and preserves the local dump when upload fails", () => {
    const { backupDir, result } = runBackup(true);
    expect(result.status).not.toBe(0);
    expect(readdirSync(backupDir).some((name) => name.endsWith(".dump"))).toBe(true);
  });
});
