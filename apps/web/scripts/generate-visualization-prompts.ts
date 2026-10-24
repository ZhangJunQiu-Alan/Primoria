import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTERACTIVE_COMPONENT_CATALOG, INTERACTIVE_CATALOG_HASH } from "@primoria/contracts/artifacts/interactive-catalog";
import { reportReferenceCoverage } from "@primoria/contracts/artifacts/visualization-reference";
import { AcceptanceManifestSchema, validateAcceptanceDistribution, type AcceptanceCase } from "../src/lib/interactive/acceptance";
import { visualizationSourceFingerprint } from "./visualization-source-fingerprint";
import { normalizeInteractiveDiscipline } from "@primoria/contracts/artifacts/interactive-search";
import { referenceInventoryPath } from "../../../scripts/visualization-reference-path.mjs";

const args = process.argv.slice(2);
const argument = (key: string) => { const at = args.indexOf(key); return at < 0 ? null : args[at + 1]; };
const seed = Number(argument("--seed") ?? 20261022);
if (!Number.isSafeInteger(seed)) throw new Error("Invalid random seed");
let randomState = seed >>> 0;
const random = () => { randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0; return randomState / 4294967296; };
const root = resolve(process.cwd(), "../..");
const baseline = args.includes("--baseline");
const referenceSubjects = new Map<string, Set<string>>();
if (!baseline) {
  const inventory = JSON.parse(readFileSync(referenceInventoryPath(), "utf8"));
  const coverage = JSON.parse(readFileSync(resolve(root, "data/visualization-components/reference-coverage.v1.json"), "utf8"));
  for (const entry of inventory.cases) {
    const ids = referenceSubjects.get(entry.subject) ?? new Set<string>();
    for (const mapping of coverage.mappings.filter((row: { referenceId: string }) => row.referenceId === entry.referenceId)) ids.add(mapping.componentId);
    referenceSubjects.set(entry.subject, ids);
  }
  if (!reportReferenceCoverage(inventory, coverage).complete) throw new Error("Freeze and verify full reference coverage before generating the final 20 prompts; --baseline is explicitly non-final");
}
const desiredSubjects = baseline ? [...new Set(INTERACTIVE_COMPONENT_CATALOG.map((entry) => normalizeInteractiveDiscipline(entry.disciplines[0])))] : [...referenceSubjects.keys()];
const remaining = [...INTERACTIVE_COMPONENT_CATALOG];
const selected = [];
for (const subject of desiredSubjects) {
  const candidates = remaining.filter((entry) => baseline ? entry.disciplines.some((value) => normalizeInteractiveDiscipline(value) === subject) : referenceSubjects.get(subject)?.has(entry.componentId));
  if (!candidates.length) { if (!baseline) throw new Error(`Missing full-reference subject: ${subject}`); continue; }
  const entry = candidates[Math.floor(random() * candidates.length)];
  selected.push(entry);
  remaining.splice(remaining.indexOf(entry), 1);
  if (selected.length === 12) break;
}
while (selected.length < 12 && remaining.length) selected.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0]);
if (selected.length !== 12) throw new Error("At least 12 implemented teaching scenes are required");
const languages = ["zh", "zh", "zh", "zh", "en", "zh", "zh", "zh", "en", "zh", "mixed", "zh", "zh", "en", "zh", "mixed", "zh", "en", "zh", "zh"] as const;
const lengths = ["short", "short", "short", "short", "short", "medium", "medium", "medium", "medium", "long", "long", "long", "short", "medium", "medium", "long", "medium", "medium", "long", "long"] as const;
const longZh = ["我有一点基础，但看到图就容易把几个量之间的关系弄混。请把关键变化放在同一个画面里，让我先观察默认情况，再自己调整一个参数。画面上保留必要标注和当前读数，用简短文字指出应该观察哪里；如果模型有适用条件或特殊边界，也请明确显示。", "我希望通过操作而不是背结论来理解。先选一个直观的例子，展示关键对象和它们之间的关系；控件变化时让图形与解释一起响应。请帮助我区分哪些是输入、哪些是计算结果，并显示边界情况，避免用漂亮动画代替真正的解释。"];
const adjustments: Record<string, { zh: string; en: string; values: Record<string, string | number | boolean> }> = {
  "physics.projectile-lab": { zh: "刚才那个，速度改成25，其他不变", en: "In the same projectile scene, set the launch speed to 25 m/s and keep everything else unchanged.", values: { speed: 25 } },
  "chem.ideal-gas": { zh: "气体温度改成400K，其他不变", en: "Use the same gas and amount. Set the temperature to 400 K, keeping volume and the current view unchanged, so I can compare its pressure.", values: { temperatureK: 400 } },
  "physics.lens-imaging": { zh: "焦距改成15厘米，其他不变", en: "Keep the same lens scene, set the focal length to 15 cm, and keep the other parameters unchanged.", values: { focalLength: 15 } },
  "chem.acid-base-titration": { zh: "酸的浓度改成0.2摩尔每升，保持刚才的酸体积、碱浓度和指示剂，再看曲线怎样变化。", en: "In the same titration, change the acid concentration to 0.2 mol/L and preserve the volume, base concentration and indicator.", values: { acidConcentration: 0.2 } },
  "cs.sorting-steps": { zh: "保留刚才那组数，换成选择排序，让我逐步比较它和冒泡排序的差异。", en: "Keep the same input values and switch the algorithm to selection sort, so I can compare the sequence of operations.", values: { algorithm: "selection" } },
  "math.function-explorer": { zh: "把刚才那条函数曲线向右平移2个单位，其他变换参数保持不变。", en: "Move the same function curve two units to the right, leaving all its other transformation parameters unchanged.", values: { h: 2 } },
};
const cases: AcceptanceCase[] = [];
for (let i = 0; i < 20; i += 1) {
  const kind = i < 12 ? "chat" : i < 16 ? "adjust" : "course";
  const entry = kind === "adjust" ? selected[i - 12] : kind === "course" ? selected[(i - 16) % selected.length] : selected[i];
  const language = languages[i], length = lengths[i];
  const example = entry.examples[0][language === "en" ? "en" : "zh-CN"];
  let prompt = length === "short" ? (language === "en" ? `Show ${entry.names.en.toLowerCase()}.` : `演示一下${entry.name}`) : (language === "en" ? `${example} Please make the relevant relationships clear and keep the controls usable.` : `${example} 请保留必要的标注，让我能直接操作并观察变化。`);
  if (kind === "adjust") prompt = language === "en" ? "Keep the scene we just opened. Change one relevant parameter to make the difference easier to see, keeping the other settings." : "刚才那个图，保持其他设置不变，调整一个关键参数，让前后差别更明显。";
  if (kind === "adjust" && adjustments[entry.componentId]) prompt = adjustments[entry.componentId][language === "en" ? "en" : "zh"];
  if (length === "short" && kind === "adjust" && !adjustments[entry.componentId]) prompt = `刚才那个，${entry.examples[1]["zh-CN"]}`;
  if (kind === "course") prompt = language === "en" ? `Create a focused lesson about ${entry.names.en}. Include a directly visible interactive visualization and explain the relationships it demonstrates.` : `请围绕${entry.name}生成一节课程，先解释关键概念，再用可直接操作的可视化帮助理解。`;
  if (length === "long") prompt += longZh[Math.floor(random() * longZh.length)];
  if (language === "mixed") prompt += " Please keep the visualization interactive，并把关键术语同时标出英文。";
  cases.push({ caseId: `viz-${String(i + 1).padStart(2, "0")}`, prompt, kind, language, length, subject: entry.disciplines[0], expectedComponentIds: [entry.componentId], ...(kind === "adjust" ? { parentCaseId: `viz-${String(i - 11).padStart(2, "0")}` } : {}), parameterAssertions: kind === "adjust" ? adjustments[entry.componentId]?.values ?? {} : {}, attempts: [] });
}
async function save() {
  const manifest = AcceptanceManifestSchema.parse({ schemaVersion: 1, runId: `visualization-${baseline ? "baseline" : "full"}-${seed}-${INTERACTIVE_CATALOG_HASH.slice(0, 8)}`, seed, frozenAt: new Date().toISOString(), scope: baseline ? "platform-baseline" : "full-reference", catalogHash: INTERACTIVE_CATALOG_HASH, codeRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), workingTreeHash: await visualizationSourceFingerprint(root), cases, checks: [] });
  const errors = validateAcceptanceDistribution(manifest);
  if (errors.length) throw new Error(errors.join("\n"));
  const path = resolve(root, argument("--out") ?? "apps/web/tests/fixtures/visualization-acceptance.prompts.v1.json");
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: args.includes("--replace") ? "w" : "wx" });
  console.log(`[visualization-prompts] frozen ${cases.length} cases; seed=${seed}, scope=${manifest.scope}, path=${path}`);
}
save().catch((error) => { console.error(error); process.exitCode = 1; });
