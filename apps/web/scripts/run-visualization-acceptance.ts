import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { loadLocalEnv } from "./load-local-env";
import { getDb, closeDb } from "../src/lib/db/client";
import { users, learnerProfiles } from "../src/lib/db/schema";
import { createSessionRecord } from "../src/lib/auth/session";
import { SESSION_COOKIE } from "../src/lib/auth/constants";
import { parseInteractivePayload } from "../src/lib/interactive/payload";
import { AcceptanceManifestSchema, validateAcceptanceDistribution, type AcceptanceAttempt } from "../src/lib/interactive/acceptance";
import { INTERACTIVE_CATALOG_HASH } from "@primoria/contracts/artifacts/interactive-catalog";
import { visualizationSourceFingerprint } from "./visualization-source-fingerprint";
import postgres from "postgres";
import { ACCEPTANCE_OWNER_PREFIX, copyKgEmbeddings, isIsolatedTestDatabase, removeAcceptanceOwners, startIsolatedApp, sweepStaleAcceptanceOwners } from "./visualization-acceptance-env";

const args = process.argv.slice(2);
const argument = (key: string) => { const at = args.indexOf(key); return at < 0 ? null : args[at + 1]; };
async function main() {
  loadLocalEnv();
  const root = resolve(process.cwd(), "../..");
  // Default (`pnpm visualization:eval`): a cloned test database with its own
  // Agent + Web. Attaching to an already running app is allowed only against a
  // test database unless the operator explicitly accepts shared-database writes.
  const startApp = args.includes("--start-app");
  if (startApp) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!isIsolatedTestDatabase(testUrl)) throw new Error("--start-app requires TEST_DATABASE_URL from scripts/with-isolated-test-db.ts");
    const sourceUrl = process.env.DATABASE_URL;
    if (sourceUrl && sourceUrl !== testUrl) console.log(`[acceptance] copied ${await copyKgEmbeddings(sourceUrl, testUrl!)} KG embeddings into the isolated database`);
    process.env.DATABASE_URL = testUrl;
  } else if (!isIsolatedTestDatabase(process.env.DATABASE_URL) && !args.includes("--allow-shared-database")) {
    throw new Error("Refusing to create synthetic acceptance users in a non-test database. Run `pnpm visualization:eval` (isolated), or pass --allow-shared-database deliberately.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const attachBase = new URL(argument("--base-url") ?? "http://localhost:3000");
  if (!startApp && !["localhost", "127.0.0.1"].includes(attachBase.hostname)) throw new Error("Acceptance runner is limited to a local application endpoint");
  const fixturePath = resolve(root, argument("--fixture") ?? "apps/web/tests/fixtures/visualization-acceptance.prompts.v1.json");
  const manifest = AcceptanceManifestSchema.parse(JSON.parse(await readFile(fixturePath, "utf8")));
  const errors = validateAcceptanceDistribution(manifest);
  if (errors.length || manifest.catalogHash !== INTERACTIVE_CATALOG_HASH) throw new Error(errors.join("\n") || "Fixture catalog is stale; freeze a reviewed fixture for this code/catalog");
  const selected = argument("--case")?.split(",");
  if (selected?.some((id) => !manifest.cases.some((entry) => entry.caseId === id))) throw new Error("Unknown selected case ID");
  const isSelected = (entry: typeof manifest.cases[number]) => !selected || selected.includes(entry.caseId) || manifest.cases.some((child) => selected.includes(child.caseId) && child.parentCaseId === entry.caseId);
  const out = resolve(root, argument("--out") ?? `artifacts/visualization-acceptance/${manifest.runId}`);
  await mkdir(out, { recursive: true });
  const resultsPath = resolve(out, "captured-results.json");
  async function saveResults() {
    const temporary = `${resultsPath}.tmp`;
    await writeFile(temporary, JSON.stringify(manifest, null, 2));
    await rename(temporary, resultsPath);
  }
  try {
    const prior = AcceptanceManifestSchema.parse(JSON.parse(await readFile(resultsPath, "utf8")));
    const inputs = (value: typeof manifest) => value.cases.map(({ attempts: _attempts, ...entry }) => entry);
    if (prior.catalogHash !== manifest.catalogHash || JSON.stringify(inputs(prior)) !== JSON.stringify(inputs(manifest))) throw new Error("Existing results do not match frozen inputs; use a new run directory");
    for (const entry of manifest.cases) entry.attempts = prior.cases.find((item) => item.caseId === entry.caseId)!.attempts;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

  let app: Awaited<ReturnType<typeof startIsolatedApp>> | null = null;
  const cleanupSql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
  const ownerId = `${ACCEPTANCE_OWNER_PREFIX}${randomUUID()}`;
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await removeAcceptanceOwners(cleanupSql, [ownerId]).catch((error) => console.error("[acceptance] cleanup failed", error));
    await cleanupSql.end({ timeout: 5 });
    app?.stop();
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => { void cleanup().finally(() => process.exit(130)); });
  }
  try {
    app = startApp ? await startIsolatedApp({ databaseUrl: process.env.DATABASE_URL, webPort: Number(argument("--web-port") ?? 3124), agentPort: Number(argument("--agent-port") ?? 3218) }) : null;
    const base = app ? new URL(app.baseUrl) : attachBase;
    const swept = await sweepStaleAcceptanceOwners(cleanupSql);
    if (swept) console.log(`[acceptance] removed ${swept} synthetic owner(s) left by interrupted runs`);
    const now = new Date();
    await getDb().insert(users).values({ id: ownerId, displayName: "Visualization acceptance (synthetic)" });
    await getDb().insert(learnerProfiles).values({ ownerId, onboardingCompletedAt: now, goalSkippedAt: now, factsIntakeStatus: "skipped", factsIntakeUpdatedAt: now, tutorStyleSkippedAt: now, educationStage: "high_school", curriculumSystem: "mainland_china_senior_high", educationContextSource: "user_selected", educationContextConfirmedAt: now });
    const session = await createSessionRecord(ownerId);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: SESSION_COOKIE, value: session.token, url: base.origin, httpOnly: true, sameSite: "Lax" }]);
    const pages = new Map<string, Page>();
    async function isolatedPage() {
      const isolated = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await isolated.addCookies([{ name: SESSION_COOKIE, value: session.token, url: base.origin, httpOnly: true, sameSite: "Lax" }]);
      return isolated.newPage();
    }
    try {
      for (const entry of manifest.cases) {
        if (!isSelected(entry)) continue;
        const neededForAdjustment = manifest.cases.some((child) => child.parentCaseId === entry.caseId && (!selected || selected.includes(child.caseId)) && child.attempts.at(-1)?.status !== "passed");
        if (!selected && entry.attempts.at(-1)?.status === "passed" && args.includes("--resume") && !neededForAdjustment) continue;
        const activePage = entry.kind === "adjust" ? pages.get(entry.parentCaseId!) : await isolatedPage();
        const startedAt = new Date().toISOString();
        const attempt: AcceptanceAttempt = { startedAt, finishedAt: startedAt, status: "failed", explanation: "", latencyMs: 0, modelCalls: [], runIds: [], toolCalls: [], assertions: [], codeRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), workingTreeHash: await visualizationSourceFingerprint(resolve(process.cwd(), "../..")), catalogHash: INTERACTIVE_CATALOG_HASH };
        console.log(`START ${entry.caseId}: ${entry.kind}`);
        const pendingReads: Promise<void>[] = [];
        const explanations = new Map<string, string>();
        let configResponse: Record<string, unknown> | null = null;
        let courseId: string | null = null;
        let historyPath: string | null = null;
        let generationRequests = 0;
        let tutorFinished = false;
        const pageErrors: string[] = [];
        const onError = (error: Error) => pageErrors.push(error.message);
        const onResponse = (response: import("playwright").Response) => {
          const url = new URL(response.url());
          if (/^\/api\/copilot-threads\/[^/]+\/messages$/.test(url.pathname)) historyPath = url.pathname;
          if (entry.kind === "course" && url.pathname === "/api/knowledge-graph/position" && response.request().method() === "POST") pendingReads.push((async () => {
            const body = await response.json();
            attempt.positioningOutput = body;
            if (!response.ok() || ["clarify_subject", "fallback"].includes(body.plan?.branch)) {
              if (typeof body.plan?.message === "string") attempt.explanation = body.plan.message;
              pageErrors.push(`Course positioning ended without generation: ${body.plan?.branch ?? response.status()}`);
            }
          })().catch((error) => { pageErrors.push(`Positioning capture: ${String(error)}`); }));
          if (url.pathname === "/api/interactive-component" && response.request().method() === "POST") pendingReads.push((async () => {
            generationRequests += 1;
            attempt.configurationRequest = response.request().postDataJSON()?.prompt;
            const body = await response.json();
            if (Array.isArray(body.modelCalls)) attempt.modelCalls.push(...body.modelCalls);
            if (body.ok) { configResponse = body; }
            else pageErrors.push(`Configuration request failed (${response.status()}): ${body.error ?? "unknown error"}`);
          })().catch((error) => { pageErrors.push(`Configuration capture: ${String(error)}`); }));
          if (url.pathname === "/api/learning/course" && response.request().method() === "POST") pendingReads.push((async () => {
            const body = await response.json();
            if (body.courseId) { courseId = body.courseId; attempt.courseId = body.courseId; }
            else if (!response.ok()) pageErrors.push(`Course creation failed (${response.status()}): ${body.error ?? "unknown error"}`);
          })().catch((error) => { pageErrors.push(`Course capture: ${String(error)}`); }));
          if (url.pathname.startsWith("/api/copilotkit") && response.headers()["content-type"]?.includes("text/event-stream")) pendingReads.push((async () => {
            const text = (await response.body()).toString("utf8");
            const calls = new Map<string, { name: string; id: string; arguments: string }>();
            const responseTexts = new Map<string, string>();
            for (const line of text.split(/\r?\n/)) {
              if (!line.startsWith("data:")) continue;
              let event;
              try { event = JSON.parse(line.slice(5)); } catch { continue; }
              if (event.type === "RUN_STARTED" && event.runId) attempt.runIds.push(event.runId);
              if (event.type === "RUN_FINISHED") tutorFinished = true;
              if (event.type === "RUN_ERROR") pageErrors.push(`Tutor run failed: ${event.message ?? "unknown error"}`);
              if (event.type === "TEXT_MESSAGE_CONTENT") responseTexts.set(event.messageId, (responseTexts.get(event.messageId) ?? "") + (event.delta ?? ""));
              if (event.type === "TOOL_CALL_START") calls.set(event.toolCallId, { id: event.toolCallId, name: event.toolCallName, arguments: "" });
              if (event.type === "TOOL_CALL_ARGS" && calls.has(event.toolCallId)) calls.get(event.toolCallId)!.arguments += event.delta;
            }
            for (const call of calls.values()) { try { attempt.toolCalls.push({ id: call.id, name: call.name, args: JSON.parse(call.arguments || "{}") }); } catch { /* Partial calls remain a failed run, never a synthesized result. */ } }
            for (const [id, content] of responseTexts) explanations.set(id, content);
            if (explanations.size) attempt.explanation = [...explanations.values()].join("\n\n");
          })().catch((error) => { pageErrors.push(`Tutor event capture: ${String(error)}`); }));
        };
        try {
          if (!activePage) throw new Error("Adjustment parent was not executed in this session; rerun the parent with --case");
          activePage.on("pageerror", onError);
          activePage.on("response", onResponse);
          if (entry.kind !== "adjust") {
            await activePage.goto(base.origin, { waitUntil: "domcontentloaded" });
            pages.set(entry.caseId, activePage);
          }
          const input = activePage.locator('[data-testid="copilot-chat-textarea"]');
          await input.waitFor({ state: "visible", timeout: 60_000 });
          await input.fill(entry.prompt);
          await activePage.locator('[data-testid="copilot-send-button"]').click();
          const deadline = Date.now() + (entry.kind === "course" ? 600_000 : 180_000);
          while (Date.now() < deadline) {
            if (pageErrors.length) throw new Error(pageErrors.join(" | "));
            if (tutorFinished && !attempt.toolCalls.some((call) => call.name === (entry.kind === "course" ? "position_learning_goal" : "open_interactive_component"))) throw new Error("Tutor completed without the expected production catalog/course tool; actual output retained");
            if (entry.kind === "course" && courseId) {
              const response = await context.request.get(`${base.origin}/api/courses/${courseId}`);
              const body = await response.json();
              if (body.course) attempt.courseOutput = body.course;
              const blocks = body.course?.lessons?.flatMap((lesson: { blocks?: unknown[] }) => lesson.blocks ?? []) ?? [];
              const block = blocks.find((item: { engine?: string; interactive?: { componentId?: string } }) => item.engine === "interactive" && entry.expectedComponentIds.includes(item.interactive?.componentId ?? ""));
              if (!block && body.course?.lessons?.some((lesson: { status?: string }) => lesson.status === "generated")) throw new Error("The generated first lesson did not contain the expected trusted Visualization Block");
              if (block) {
                attempt.payload = parseInteractivePayload(block.interactive);
                attempt.explanation = block.description;
                const lesson = body.course.lessons.find((item: { blocks?: { id: string }[] }) => item.blocks?.some((candidate) => candidate.id === block.id));
                if (!lesson) throw new Error("Generated visualization has no persisted lesson");
                await activePage.goto(`${base.origin}/course/${courseId}?lessonId=${encodeURIComponent(lesson.id)}`, { waitUntil: "domcontentloaded" });
                for (let index = 0; index < lesson.blocks.length; index += 1) {
                  await activePage.locator(`[data-block-id="${lesson.blocks[index].id}"]`).waitFor({ state: "visible", timeout: 30_000 });
                  if (lesson.blocks[index].id === block.id) break;
                  await activePage.locator(`.lesson-steps button:nth-child(${index + 2})`).click();
                }
                await activePage.locator(`[data-component-id="${attempt.payload.componentId}"] svg, [data-component-id="${attempt.payload.componentId}"] section`).first().waitFor({ state: "visible", timeout: 60_000 });
                attempt.assertions.push("Actual course generation persisted a directly rendered trusted Visualization Block");
                break;
              }
            } else if (configResponse) {
              const body = configResponse as Record<string, unknown>;
              attempt.payload = parseInteractivePayload({ componentId: body.componentId, configVersion: body.configVersion, config: body.config });
              if (body.patch && typeof body.patch === "object") attempt.patch = body.patch as Record<string, unknown>;
              await activePage.locator(`[data-component-id="${attempt.payload.componentId}"] svg, [data-component-id="${attempt.payload.componentId}"] section`).last().waitFor({ state: "visible", timeout: 60_000 });
              break;
            }
            await new Promise((done) => setTimeout(done, 1000));
          }
          await Promise.allSettled(pendingReads);
          if (!attempt.payload) throw new Error("No expected trusted visualization was produced before the deadline");
          if (!entry.expectedComponentIds.includes(attempt.payload.componentId)) throw new Error(`Unexpected component: ${attempt.payload.componentId}`);
          for (const [key, value] of Object.entries(entry.parameterAssertions)) if (attempt.payload.config[key] !== value) throw new Error(`Parameter mismatch: ${key}`);
          if (entry.kind === "adjust") {
            const parent = manifest.cases.find((item) => item.caseId === entry.parentCaseId)?.attempts.at(-1)?.payload;
            if (!parent) throw new Error("Missing parent configuration evidence");
            if (!attempt.patch || !Object.keys(attempt.patch).length) throw new Error("Missing nonempty Web-generated patch evidence");
            const changedKeys = Object.keys(entry.parameterAssertions).length ? entry.parameterAssertions : attempt.patch;
            for (const [key, value] of Object.entries(parent.config)) {
              if (!(key in changedKeys) && JSON.stringify(attempt.payload.config[key]) !== JSON.stringify(value)) throw new Error(`Adjustment overwrote an unrelated parameter: ${key}`);
            }
            attempt.assertions.push("Requested parameter changes match; all other captured parameters preserved");
          }
          if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join(" | ")}`);
          if (entry.kind !== "course" && !attempt.toolCalls.some((call) => call.name === "open_interactive_component")) throw new Error("Missing production Tutor tool-call evidence");
          if (entry.kind !== "course" && attempt.configurationRequest !== entry.prompt) throw new Error("Web configuration input differs from the original user prompt");
          if (entry.kind === "course" && !attempt.toolCalls.some((call) => call.name === "position_learning_goal")) throw new Error("Missing production course positioning signal");
          if (entry.kind === "adjust") {
            const parentCall = manifest.cases.find((item) => item.caseId === entry.parentCaseId)?.attempts.at(-1)?.toolCalls.find((call) => call.name === "open_interactive_component");
            if (!parentCall || !attempt.toolCalls.some((call) => call.args.target_instance_id === parentCall.id)) throw new Error("Adjustment did not target its exact parent instance");
          }
          if (entry.kind === "chat") {
            const opened = attempt.toolCalls.find((call) => call.name === "open_interactive_component")!;
            let persisted = false;
            for (let poll = 0; historyPath && poll < 15; poll += 1) {
              const response = await context.request.get(`${base.origin}${historyPath}`);
              const history = await response.json();
              persisted = history.messages?.some((message: { metadata?: { interactiveToolCallId?: string } }) => message.metadata?.interactiveToolCallId === opened.id);
              if (persisted) break;
              await new Promise((done) => setTimeout(done, 1000));
            }
            if (!persisted) throw new Error("Completed interactive tool signal was not persisted to chat history");
            const beforeReload = generationRequests;
            await activePage.reload({ waitUntil: "domcontentloaded" });
            await activePage.locator(`[data-component-id="${attempt.payload.componentId}"] svg, [data-component-id="${attempt.payload.componentId}"] section`).first().waitFor({ state: "visible", timeout: 30_000 });
            if (generationRequests !== beforeReload) throw new Error("Reload regenerated the visualization instead of restoring its saved configuration");
            attempt.assertions.push("Reload restored the saved card and configuration without another generation request");
          }
          attempt.assertions.push("Correct component and valid versioned configuration", "Visible production component without browser runtime errors");
          attempt.status = "passed";
        } catch (error) { attempt.error = error instanceof Error ? error.message : "Acceptance case failed"; }
        finally {
          attempt.finishedAt = new Date().toISOString();
          attempt.toolCalls = [...new Map(attempt.toolCalls.map((call) => [call.id, call])).values()];
          attempt.runIds = [...new Set(attempt.runIds)];
          attempt.latencyMs = new Date(attempt.finishedAt).getTime() - new Date(startedAt).getTime();
          attempt.model = [...new Set(attempt.modelCalls.map((call) => call.model))].join(" / ") || undefined;
          if (activePage) {
            if (!attempt.explanation) attempt.explanation = await activePage.getByTestId("copilot-assistant-message").allTextContents().then((messages) => messages.join("\n\n")).catch(() => "");
            activePage.off("response", onResponse); activePage.off("pageerror", onError);
            attempt.screenshot = `${entry.caseId}-attempt-${entry.attempts.length + 1}.png`;
            await activePage.screenshot({ path: resolve(out, attempt.screenshot), fullPage: true }).catch(() => { delete attempt.screenshot; });
          }
          entry.attempts.push(attempt);
          await saveResults();
          console.log(`${attempt.status.toUpperCase()} ${entry.caseId}: ${attempt.payload?.componentId ?? attempt.error}`);
          if (activePage && !manifest.cases.some((child) => child.parentCaseId === entry.caseId)) await activePage.context().close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    // Only this run's synthetic identity (and its Agent runtime rows) is removed;
    // an isolated app is stopped. The detached evidence has no session tokens.
    await cleanup();
    await closeDb();
  }
  const executed = manifest.cases.filter((entry) => entry.attempts.length > 0).length;
  const passed = manifest.cases.filter((entry) => entry.attempts.at(-1)?.status === "passed").length;
  manifest.checks = manifest.checks.filter((check) => !["20 real-model prompts", "Model usage completeness"].includes(check.name));
  manifest.checks.push({ name: "20 real-model prompts", status: executed < 20 ? "not_run" : passed === 20 ? "passed" : "failed", detail: `${executed}/20 cases executed; ${passed}/20 latest attempts passed. Browser → CopilotKit → Agent tool choice → Web configuration / actual course generation; all individual attempts and failures retained` });
  manifest.checks.push({ name: "Model usage completeness", status: "blocked", detail: "Configuration calls expose provider usage; Tutor/planner/worker usage is not fully captured by this runner. Missing usage is not estimated or reported as zero." });
  await saveResults();
  if (manifest.cases.some((entry) => isSelected(entry) && entry.attempts.at(-1)?.status !== "passed")) process.exitCode = 1;
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(closeDb);
