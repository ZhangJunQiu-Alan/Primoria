import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it.skipIf(process.platform === "win32")("forwards shutdown to nested application processes so an Agent cannot retain its port and pool", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "primoria-process-group-test-"));
  const marker = resolve(directory, "drained");
  await mkdir(resolve(directory, "scripts"));
  await copyFile(resolve(process.cwd(), "../../scripts/with-database-env.mjs"), resolve(directory, "scripts/run.mjs"));
  await writeFile(resolve(directory, "nested.mjs"), `import { spawn } from 'node:child_process';
    const worker = spawn(process.execPath, ['-e', ${JSON.stringify(`process.on('SIGTERM', () => { require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'drained'); process.exit(0); }); console.log('worker-ready:' + process.pid); setInterval(() => {}, 1000);`)}], { stdio: 'inherit' });
    process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);`);
  const wrapper = spawn(process.execPath, [resolve(directory, "scripts/run.mjs"), "runtime", process.execPath, resolve(directory, "nested.mjs")], { env: { ...process.env, PRIMORIA_DISABLE_LOCAL_ENV: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  let workerPid: number | undefined;
  try {
    workerPid = await new Promise<number>((done, reject) => {
      const timeout = setTimeout(() => reject(new Error("Nested worker did not become ready")), 5000);
      wrapper.stdout.on("data", (chunk) => { const match = String(chunk).match(/worker-ready:(\d+)/); if (match) { clearTimeout(timeout); done(Number(match[1])); } });
      wrapper.once("error", reject);
    });
    wrapper.kill("SIGTERM");
    await expect.poll(async () => readFile(marker, "utf8").catch(() => ""), { timeout: 3000 }).toBe("drained");
    await expect.poll(() => wrapper.exitCode !== null, { timeout: 3000 }).toBe(true);
  } finally {
    wrapper.kill("SIGTERM");
    if (workerPid) { try { process.kill(workerPid, "SIGTERM"); } catch {} }
    await rm(directory, { recursive: true, force: true });
  }
});
