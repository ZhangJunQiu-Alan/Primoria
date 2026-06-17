import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");

const prompts = [
  {
    id: "01-chart-growth-curves",
    expectedMode: "chart",
    prompt: "Draw a line chart comparing linear, quadratic, and cubic growth from x=1 to x=8. Include a legend, axis labels, and a tooltip.",
  },
  {
    id: "02-chart-water-cycle-data",
    expectedMode: "chart",
    prompt: "Create a stacked bar chart showing a simple daily water budget: evaporation, runoff, storage, and infiltration for Monday through Friday.",
  },
  {
    id: "03-diagram-photosynthesis",
    expectedMode: "diagram",
    prompt: "Make a Mermaid flowchart diagram of photosynthesis from sunlight, water, and carbon dioxide through glucose and oxygen, with chloroplast as the central process.",
  },
  {
    id: "04-diagram-course-schema",
    expectedMode: "diagram",
    prompt: "Create an ER diagram for a learning app with Users, Courses, Lessons, Blocks, Attempts, and SavedArtifacts. Show the key relationships.",
  },
  {
    id: "05-physics-pendulum",
    expectedMode: "physics",
    prompt: "Simulate a simple pendulum with a fixed anchor, labeled bob, string constraint, gravity, and a pause/resume control.",
  },
  {
    id: "06-physics-projectile",
    expectedMode: "physics",
    prompt: "Simulate projectile motion: a ball launches from the lower-left with gravity and bounces off the floor. Label the projectile and ground.",
  },
  {
    id: "07-physics-collision",
    expectedMode: "physics",
    prompt: "Simulate a one-dimensional elastic collision between two carts on a track. Use different masses, initial velocities, labels, and side walls.",
  },
  {
    id: "08-widget-binary-search",
    expectedMode: "widget",
    prompt: "Build an interactive binary search stepper for the sorted array [3, 7, 11, 18, 24, 31, 42, 56]. Target is 31. Let the learner click Next Step and highlight low, mid, high.",
  },
  {
    id: "09-widget-fraction-equivalence",
    expectedMode: "widget",
    prompt: "Build an interactive fraction equivalence explorer with a slider for numerator from 1 to 6 and denominator from 2 to 12. Show a bar model and simplified fraction.",
  },
  {
    id: "10-widget-css-box-model",
    expectedMode: "widget",
    prompt: "Build an interactive CSS box model widget with controls for margin, border, padding, and content size. The visual should update labels and dimensions live.",
  },
];

const expectedTypes = {
  chart: "echarts_widget",
  diagram: "mermaid_diagram",
  physics: "physics_scene",
  widget: "html_widget",
};

function slugDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}

function getToolContent(output) {
  if (typeof output === "string") return output;
  if (output?.content != null) return output.content;
  if (output?.kwargs?.content != null) return output.kwargs.content;
  return "";
}

function parseArtifactContent(content) {
  const text = Array.isArray(content)
    ? content.map((part) => (typeof part === "string" ? part : part?.text ?? "")).join("\n")
    : String(content ?? "");
  const normalized = text.startsWith("PRIMORIA_COURSE_CARD:") ? text.slice("PRIMORIA_COURSE_CARD:".length) : text;
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function codeForArtifact(artifact) {
  if (!artifact) return { codeKind: "none", extension: "txt", content: "" };
  if (artifact.type === "echarts_widget") {
    return {
      codeKind: "echarts-option-json",
      extension: "echarts-option.json",
      content: JSON.stringify(artifact.option, null, 2),
    };
  }
  if (artifact.type === "mermaid_diagram") {
    return {
      codeKind: "mermaid-dsl",
      extension: "mermaid",
      content: artifact.definition ?? "",
    };
  }
  if (artifact.type === "physics_scene") {
    return {
      codeKind: "matter-scene-json",
      extension: "physics-scene.json",
      content: JSON.stringify(artifact.scene, null, 2),
    };
  }
  if (artifact.type === "html_widget") {
    return {
      codeKind: "html-css-js-fragment",
      extension: "html",
      content: artifact.html ?? "",
    };
  }
  return {
    codeKind: artifact.type ?? "unknown",
    extension: "json",
    content: JSON.stringify(artifact, null, 2),
  };
}

async function runPrompt(graph, item, index, runDir) {
  const promptDir = path.join(runDir, item.id);
  await mkdir(promptDir, { recursive: true });
  await writeFile(path.join(promptDir, "prompt.md"), `${item.prompt}\n`, "utf8");

  const events = [];
  const artifacts = [];
  let lastError = "";
  console.log(`[${index + 1}/${prompts.length}] ${item.id} -> ${item.expectedMode}`);

  try {
    for await (const ev of graph.streamEvents(
      { messages: [{ role: "user", content: item.prompt }] },
      {
        configurable: { thread_id: `codex-visual-qa-${item.id}-${Date.now()}` },
        version: "v2",
      },
    )) {
      if (ev.event === "on_tool_start" || ev.event === "on_tool_end" || ev.event === "on_chat_model_end") {
        const content = ev.event === "on_tool_end" ? getToolContent(ev.data?.output) : undefined;
        const artifact = ev.event === "on_tool_end" ? parseArtifactContent(content) : null;
        events.push({
          event: ev.event,
          name: ev.name,
          input: ev.event === "on_tool_start" ? ev.data?.input : undefined,
          outputType: artifact?.type,
          output: artifact ?? content,
        });
        if (artifact?.type) artifacts.push(artifact);
      }
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }

  await writeFile(path.join(promptDir, "events.jsonl"), events.map((event) => JSON.stringify(event)).join("\n"), "utf8");

  const expectedType = expectedTypes[item.expectedMode];
  const artifact = artifacts.find((candidate) => candidate.type === expectedType) ?? artifacts.at(-1) ?? null;
  const code = codeForArtifact(artifact);
  const codeFileName = artifact ? `${item.id}.${code.extension}` : `${item.id}.error.txt`;
  await writeFile(path.join(promptDir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
  await writeFile(path.join(promptDir, codeFileName), artifact ? code.content : lastError || "No artifact generated.", "utf8");

  const status = artifact?.type === expectedType ? "passed" : "failed";
  const result = {
    id: item.id,
    prompt: item.prompt,
    expectedMode: item.expectedMode,
    actualType: artifact?.type ?? "none",
    title: artifact?.title ?? item.id,
    codeKind: code.codeKind,
    codeFile: `${item.id}/${codeFileName}`,
    artifact: artifact ?? {
      type: "tool_status",
      name: "interactive_visual_qa",
      status: "error",
      description: lastError || "No artifact generated.",
    },
    status,
    error: status === "passed" ? undefined : lastError || `Expected ${expectedType}, got ${artifact?.type ?? "none"}`,
  };

  console.log(`[${index + 1}/${prompts.length}] ${item.id} ${status}: ${result.actualType}`);
  return result;
}

const runId = process.env.PRIMORIA_VISUAL_QA_RUN_ID || `interactive-visual-${slugDate()}`;
const publicRunDir = path.join(repoRoot, "apps/web/public/qa-results", runId);
await mkdir(publicRunDir, { recursive: true });
await writeFile(path.join(publicRunDir, "prompts.json"), JSON.stringify(prompts, null, 2), "utf8");

const { graph } = await import(pathToFileURL(path.join(repoRoot, "apps/agent/src/graph.mjs")).href);
const results = [];
for (let i = 0; i < prompts.length; i++) {
  results.push(await runPrompt(graph, prompts[i], i, publicRunDir));
}

const payload = {
  runId,
  generatedAt: new Date().toISOString(),
  app: {
    repoRoot,
    webUrl: "http://127.0.0.1:3117",
    agentUrl: "http://localhost:2025",
  },
  results,
};

await writeFile(path.join(publicRunDir, "results.json"), JSON.stringify(payload, null, 2), "utf8");
await writeFile(
  path.join(publicRunDir, "report.md"),
  [
    `# Interactive Visual QA ${runId}`,
    "",
    `Generated: ${payload.generatedAt}`,
    "",
    "| # | Prompt | Expected | Actual | Status | Code | Screenshot |",
    "| - | - | - | - | - | - | - |",
    ...results.map((result, index) =>
      `| ${index + 1} | ${result.prompt.replaceAll("|", "\\|")} | ${result.expectedMode} | ${result.actualType} | ${result.status} | ${result.codeFile} | ${result.id}.png |`,
    ),
    "",
  ].join("\n"),
  "utf8",
);

console.log(`RUN_ID=${runId}`);
console.log(`RESULTS_DIR=${publicRunDir}`);
console.log(`PASSED=${results.filter((item) => item.status === "passed").length}/${results.length}`);
