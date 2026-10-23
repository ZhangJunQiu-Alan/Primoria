import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright";

const out = await mkdtemp(join(tmpdir(), "primoria-replay-test-"));
const manifest = process.env.VISUALIZATION_REPLAY_MANIFEST;
const exporter = spawn("pnpm", ["visualization:replay", ...(manifest ? ["--manifest", manifest] : ["--gallery-only"]), "--out", out], { cwd: process.cwd(), stdio: "inherit" });
const code = await new Promise((done, reject) => { exporter.once("error", reject); exporter.once("exit", done); });
assert.equal(code, 0, "production replay exporter must succeed");
const data = JSON.parse(await readFile(join(out, "results.json"), "utf8"));
const html = await readFile(join(out, "index.html"), "utf8");
assert.match(html, /connect-src 'none'/);
if (!manifest) assert.equal(data.manifest.cases.length, 0, "gallery fixtures must never be counted as real prompt runs");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (request, response) => {
  const path = resolve(out, `.${new URL(request.url, "http://localhost").pathname === "/" ? "/index.html" : new URL(request.url, "http://localhost").pathname}`);
  if (!path.startsWith(`${out}${sep}`)) { response.writeHead(403).end(); return; }
  try { response.setHeader("Content-Type", mime[extname(path)] ?? "application/octet-stream"); response.end(await readFile(path)); }
  catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const report = { status: "running", origin, components: data.gallery.length, viewports: [], errors: [], apiRequests: [], checks: [] };
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) report.apiRequests.push(request.url()); });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin);
    assert.match(await page.title(), /Primoria/);
    assert.equal(await page.locator('input[type="text"], textarea').count(), 0, "review never requires a new prompt");
    for (const [index, entry] of data.manifest.cases.entries()) {
      await page.locator("aside .case-link").nth(index).click();
      const attempt = entry.attempts.at(-1);
      if (attempt?.payload) await page.locator(`[data-component-id="${attempt.payload.componentId}"] svg, [data-component-id="${attempt.payload.componentId}"] section`).first().waitFor({ state: "visible" });
      else assert.match(await page.locator(".empty-scene").textContent(), /\S/, "a failed or pending capture retains its explanation");
      for (const widget of data.fallbackWidgets?.[`${entry.caseId}:${entry.attempts.length - 1}`] ?? []) {
        const frame = page.frameLocator(`iframe[title=${JSON.stringify(widget.title)}]`);
        await frame.locator("body").waitFor({ state: "visible" });
        const slider = frame.getByRole("slider").first();
        if (await slider.count()) {
          const before = await slider.inputValue();
          await slider.press("ArrowLeft");
          assert.notEqual(await slider.inputValue(), before, "captured fallback controls execute locally");
        }
      }
    }
    if (data.manifest.cases.length) await page.getByRole("button", { name: "组件全库", exact: true }).click();
    const renders = [];
    report.viewports.push({ width, renders });
    for (const entry of data.gallery) {
      const started = performance.now();
      await page.locator("aside .case-link").filter({ hasText: entry.title }).click();
      await page.locator(`[data-component-id="${entry.payload.componentId}"] svg, [data-component-id="${entry.payload.componentId}"] section`).first().waitFor({ state: "visible" });
      assert.equal(await page.locator('[role="alert"]').count(), 0, `${entry.payload.componentId} failed to render`);
      const dimensions = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.inner + 1, `${entry.payload.componentId} overflows at ${width}px`);
      renders.push({ componentId: entry.payload.componentId, readyMs: Math.round(performance.now() - started) });
    }
    const calculus = data.gallery.find((entry) => entry.payload.componentId === "math.calculus-lab");
    if (calculus) {
      await page.locator("aside .case-link").filter({ hasText: calculus.title }).click();
      const slider = page.getByRole("slider", { name: /^Δx/ });
      await slider.waitFor();
      const before = await slider.inputValue();
      await slider.press("ArrowLeft");
      assert.notEqual(await slider.inputValue(), before, "captured visualization controls remain live without a model call");
      await page.getByRole("button", { name: "重置样例 ↺", exact: true }).click();
      assert.equal(await slider.inputValue(), before, "replay reset restores captured parameters");
    }
    await page.screenshot({ path: join(out, `replay-${width}.png`), fullPage: true });
  }
  assert.equal(report.errors.length, 0, report.errors.join(" | "));
  assert.equal(report.apiRequests.length, 0, "static playback must not request authenticated APIs or models");
  report.checks.push("all registered widgets render at three widths", "local controls and reset respond", "no new prompt input", "no API requests", "no browser runtime errors");
  report.status = "passed";
  console.log(`[visualization-replay.smoke] PASS ${data.gallery.length} components × 3 viewports; evidence=${out}`);
} catch (error) {
  report.status = "failed";
  report.errors.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  await writeFile(join(out, "browser-checks.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((done) => server.close(done));
}
