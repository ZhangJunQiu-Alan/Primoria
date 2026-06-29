import { z } from "zod";
import {
  AlgorithmStepZodSchema,
  MathExplorerCurveSchema,
  MathExplorerFunctionSchema,
  MathExplorerParameterSchema,
  PhysicsSceneZodSchema,
} from "@/lib/ai/visual-schemas";
import type { CourseBlock } from "@/lib/courses/types";
import type { ImageBrief } from "@/lib/ai/media/image-brief";
import { makePendingImageBlock } from "@/lib/ai/media/image-builder";
import { BlockCompileError } from "./generation-errors";
import type { GeneratableBlockType } from "./lesson-plan-ir";
import type { BlockGenerationJob } from "./lesson-plan-compiler";

// Deterministic block content compiler. Strictly parses one writer's core
// content for a single block, merges in the planner's metadata (conceptIds,
// pedagogicalRole, order-derived id), and emits a final CourseBlock. Semantic
// gaps throw BlockCompileError — never a generic fallback (doc §9.5).

const nonEmpty = z.string().trim().min(1);

const TextContentSchema = z.object({ title: nonEmpty, markdown: nonEmpty });

const AnalogyContentSchema = z.object({
  title: nonEmpty,
  source: nonEmpty,
  target: nonEmpty,
  mapping: nonEmpty,
});

const TransferContentSchema = z.object({
  title: nonEmpty,
  fromDomain: nonEmpty,
  toDomain: nonEmpty,
  explanation: nonEmpty,
  example: nonEmpty,
});

const CodeContentSchema = z.object({
  title: nonEmpty,
  language: nonEmpty,
  code: nonEmpty,
  explanation: nonEmpty,
});

// The image writer emits a BRIEF, not an asset — the imaging stage generates the
// asset later. The prompt must not request embedded text/labels/formulas (AI
// images can't render those reliably; use a `visual` block instead).
const ImageContentSchema = z.object({
  title: nonEmpty,
  learningGoal: nonEmpty,
  imageKind: z.enum(["educational_illustration", "structure_diagram", "realistic_scene", "analogy_illustration"]),
  prompt: nonEmpty,
  alt: nonEmpty,
  caption: nonEmpty,
  negativePrompt: z.string().optional(),
  aspectRatio: z.enum(["1:1", "4:3", "16:9"]).optional(),
  resolution: z.enum(["1K", "2K", "4K"]).optional(),
});

const AlgorithmVizPayloadSchema = z
  .object({
    algorithm: nonEmpty,
    steps: z.array(AlgorithmStepZodSchema).min(1).max(60),
  })
  .refine((v) => new Set(v.steps.map((s) => s.kind)).size <= 1, {
    message: "all algorithm steps must use the SAME kind (array|tree|graph|table) — pick one for the whole visualization, do not mix",
  });

const MathExplorerPayloadSchema = z.object({
  mode: z.enum(["cartesian", "parametric"]).optional(),
  functions: z.array(MathExplorerFunctionSchema).optional(),
  curves: z.array(MathExplorerCurveSchema).optional(),
  parameters: z.array(MathExplorerParameterSchema).max(6),
  xRange: z.tuple([z.coerce.number(), z.coerce.number()]).optional(),
  yRange: z.tuple([z.coerce.number(), z.coerce.number()]).optional(),
  tRange: z.tuple([z.coerce.number(), z.coerce.number()]).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});

// Decision 4: the visual writer emits a complete engine payload directly.
const VisualContentSchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    engine: z.enum(["html", "echarts", "mermaid", "physics", "algorithm", "math_explorer"]).optional(),
    html: z.string().optional(),
    echartsOption: z.record(z.unknown()).optional(),
    echartsHeight: z.coerce.number().optional(),
    mermaidDefinition: z.string().optional(),
    physicsScene: PhysicsSceneZodSchema.optional(),
    algorithmViz: AlgorithmVizPayloadSchema.optional(),
    mathExplorer: MathExplorerPayloadSchema.optional(),
  })
  .refine(
    (v) =>
      (v.engine === "echarts" && v.echartsOption) ||
      (v.engine === "mermaid" && v.mermaidDefinition?.trim()) ||
      (v.engine === "physics" && v.physicsScene) ||
      (v.engine === "algorithm" && v.algorithmViz) ||
      (v.engine === "math_explorer" && v.mathExplorer) ||
      ((v.engine === "html" || !v.engine) && v.html?.trim()),
    { message: "visual block is missing the payload for its engine" },
  );

// `conceptId` tags which concept the question checks; it drives concept-level
// mastery attribution. The writer does NOT emit it — a concept-closing quiz is
// compiler-pinned to exactly one concept, so the compiler stamps it on every
// question (it is therefore optional here).
const SingleQuestionSchema = z.object({
  kind: z.literal("single"),
  id: nonEmpty,
  question: nonEmpty,
  choices: z.array(z.object({ id: nonEmpty, text: nonEmpty })).min(2).max(6),
  correctId: nonEmpty,
  explanation: z.string().optional(),
  conceptId: nonEmpty.optional(),
});
const MultiQuestionSchema = z.object({
  kind: z.literal("multi"),
  id: nonEmpty,
  question: nonEmpty,
  choices: z.array(z.object({ id: nonEmpty, text: nonEmpty })).min(2).max(6),
  correctIds: z.array(nonEmpty).min(1),
  explanation: z.string().optional(),
  conceptId: nonEmpty.optional(),
});
const TrueFalseQuestionSchema = z.object({
  kind: z.literal("truefalse"),
  id: nonEmpty,
  question: nonEmpty,
  correct: z.boolean(),
  explanation: z.string().optional(),
  conceptId: nonEmpty.optional(),
});

const QuizContentSchema = z.object({
  title: nonEmpty,
  questions: z
    .array(z.discriminatedUnion("kind", [SingleQuestionSchema, MultiQuestionSchema, TrueFalseQuestionSchema]))
    .min(1)
    .max(6),
});

const CONTENT_SCHEMAS: Record<GeneratableBlockType, z.ZodTypeAny> = {
  text: TextContentSchema,
  analogy: AnalogyContentSchema,
  transfer: TransferContentSchema,
  visual: VisualContentSchema,
  image: ImageContentSchema,
  code: CodeContentSchema,
  quiz: QuizContentSchema,
};

/** Stable, retry-safe block id. Namespacing by lessonId keeps it unique across
 * lessons while staying deterministic so a retry reuses the same id (doc §11.3). */
export function blockIdFor(job: BlockGenerationJob, lessonId: string): string {
  return `blk_${lessonId}_${job.order}`;
}

/** Best-effort repair of common visual-writer shape deviations before strict
 * validation. Only ever fills a canonical key when it is ABSENT, so it never
 * clobbers valid content. Covers the shapes seen in practice (doc §9.5):
 * `engine` emitted as an object, payloads under synonym keys, and flattened
 * engine payloads (fields at the top level instead of under their engine key). */
function normalizeVisualContent(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const c: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  // `engine` emitted as an object: pull the engine name out and lift any payload
  // fields nested under it up to the top level.
  if (c.engine && typeof c.engine === "object" && !Array.isArray(c.engine)) {
    const e = c.engine as Record<string, unknown>;
    const name = e.engine ?? e.type ?? e.name ?? e.kind;
    for (const [k, v] of Object.entries(e)) {
      if (!["engine", "type", "name", "kind"].includes(k) && c[k] === undefined) c[k] = v;
    }
    if (typeof name === "string") c.engine = name;
    else delete c.engine; // unknown → let the `html` default branch handle it
  }

  // Map invented / affordance-name engine values onto the canonical enum (models
  // echo the KG affordance name, e.g. "interactive-visual"/"simulation", instead
  // of the engine id). Only rewrites values that are NOT already valid.
  const VALID_ENGINES = new Set(["html", "echarts", "mermaid", "physics", "algorithm", "math_explorer"]);
  const ENGINE_ALIASES: Record<string, string> = {
    interactive: "html", "interactive-visual": "html", interactive_visual: "html", iframe: "html", widget: "html",
    simulation: "physics", matter: "physics", matterjs: "physics", "physics-simulation": "physics",
    function: "math_explorer", "function-plot": "math_explorer", math: "math_explorer", mathexplorer: "math_explorer", "math-explorer": "math_explorer",
    chart: "echarts", echart: "echarts",
    diagram: "mermaid", flowchart: "mermaid", flow: "mermaid", mermaidjs: "mermaid",
    algo: "algorithm", "algorithm-visualization": "algorithm", algorithm_visualization: "algorithm",
  };
  if (typeof c.engine === "string" && !VALID_ENGINES.has(c.engine)) {
    const alias = ENGINE_ALIASES[c.engine.toLowerCase().trim()];
    if (alias) c.engine = alias;
  }

  const engine = typeof c.engine === "string" ? c.engine : undefined;
  const fill = (key: string, value: unknown) => {
    if (c[key] === undefined && value !== undefined) c[key] = value;
  };
  const take = (from: string, to: string) => {
    if (c[to] === undefined && c[from] !== undefined) {
      c[to] = c[from];
      delete c[from];
    }
  };

  // Generic wrapper key: models commonly nest the engine payload under a
  // catch-all "payload"/"data"/"content" key instead of the engine-specific key.
  // Unwrap it to the canonical key (or, for string-payload engines, merge its
  // fields up so the synonym remaps below can map them). Canonical key absent only.
  const ENGINE_KEY: Record<string, string> = {
    echarts: "echartsOption",
    mermaid: "mermaidDefinition",
    physics: "physicsScene",
    algorithm: "algorithmViz",
    math_explorer: "mathExplorer",
    html: "html",
  };
  const STRING_PAYLOAD = new Set(["html", "mermaid"]); // canonical value is a string
  const target = engine ? ENGINE_KEY[engine] : undefined;
  if (engine && target && c[target] === undefined) {
    for (const wrapper of ["payload", "data", "content"]) {
      const p = c[wrapper];
      if (p === undefined || c[target] !== undefined) continue;
      if (p && typeof p === "object" && !Array.isArray(p) && (p as Record<string, unknown>)[target] !== undefined) {
        c[target] = (p as Record<string, unknown>)[target]; // { <target>: ... }
        delete c[wrapper];
      } else if (STRING_PAYLOAD.has(engine)) {
        if (typeof p === "string") {
          c[target] = p;
          delete c[wrapper];
        } else if (p && typeof p === "object" && !Array.isArray(p)) {
          for (const [k, v] of Object.entries(p as Record<string, unknown>)) if (c[k] === undefined) c[k] = v;
          delete c[wrapper];
        }
      } else if (p && typeof p === "object" && !Array.isArray(p)) {
        c[target] = p; // object-payload engine: the wrapper object IS the payload
        delete c[wrapper];
      }
    }
  }

  // Synonym payload keys for the single-field engines.
  if (engine === "mermaid") {
    take("mermaid", "mermaidDefinition");
    take("definition", "mermaidDefinition");
    take("diagram", "mermaidDefinition");
  }
  if (engine === "echarts") {
    take("option", "echartsOption");
    take("echarts", "echartsOption");
    take("options", "echartsOption");
  }

  // Flattened structured payloads: fields emitted at the top level instead of
  // nested under their engine key. Wrap them only when the canonical key is absent.
  if (engine === "algorithm" && c.algorithmViz === undefined && Array.isArray(c.steps)) {
    c.algorithmViz = { algorithm: c.algorithm ?? c.title, steps: c.steps };
    delete c.steps;
    delete c.algorithm;
  }
  if (engine === "physics" && c.physicsScene === undefined && (c.bodies !== undefined || c.render !== undefined)) {
    c.physicsScene = {
      render: c.render,
      bodies: c.bodies,
      ...(c.constraints !== undefined ? { constraints: c.constraints } : {}),
      ...(c.gravity !== undefined ? { gravity: c.gravity } : {}),
      ...(c.walls !== undefined ? { walls: c.walls } : {}),
    };
    delete c.render;
    delete c.bodies;
    delete c.constraints;
    delete c.gravity;
    delete c.walls;
  }
  if (
    engine === "math_explorer" &&
    c.mathExplorer === undefined &&
    (c.functions !== undefined || c.curves !== undefined || c.parameters !== undefined)
  ) {
    const me: Record<string, unknown> = {};
    for (const k of ["mode", "functions", "curves", "parameters", "xRange", "yRange", "tRange", "xLabel", "yLabel"]) {
      if (c[k] !== undefined) {
        me[k] = c[k];
        delete c[k];
      }
    }
    fill("mathExplorer", me);
  }

  return c;
}

/** Diagnostic suffix for a failed visual block: reports the engine and the RAW
 * top-level keys the model emitted (before the schema strips unknowns), so a
 * "missing payload" failure tells us whether the payload was under an unmapped
 * key (→ add a normalizer synonym) or genuinely absent (→ needs a repair retry). */
function visualFailureDiagnostic(rawContent: unknown, normalized: unknown): string {
  const asObj = (o: unknown) =>
    o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : undefined;
  const keysOf = (o: unknown) => Object.keys(asObj(o) ?? {});
  const engine = (normalized as { engine?: unknown })?.engine;
  const engineStr =
    typeof engine === "string" ? `"${engine}"` : engine && typeof engine === "object" ? "(object!)" : "(none)";
  const rawKeys = keysOf(rawContent);

  // Peek one level into a generic wrapper key so a mismatched inner payload shape
  // (e.g. physics payload whose sub-keys are not render/bodies) is visible.
  const root = asObj(rawContent);
  let inner = "";
  for (const w of ["payload", "data", "content"]) {
    const sub = root && asObj(root[w]);
    if (sub) {
      inner = `; ${w} inner keys=[${Object.keys(sub).join(", ") || "none"}]`;
      break;
    }
  }
  return ` [diagnostic: engine=${engineStr}; raw keys=[${rawKeys.join(", ") || "none"}]${inner}]`;
}

/** Parse one block's writer content and compile it into a final CourseBlock.
 * Throws BlockCompileError if a required semantic field is missing. */
export function compileBlockContent(job: BlockGenerationJob, rawContent: unknown, lessonId: string): CourseBlock {
  const schema = CONTENT_SCHEMAS[job.type];
  // Engine is pinned deterministically by the compiler (from the KG affordance).
  // Inject it and ignore whatever the writer emitted, so the model can NEVER
  // produce an unknown/invented engine — it only supplies the payload.
  let visualRaw = rawContent;
  if (job.type === "visual" && job.engine && rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)) {
    visualRaw = { ...(rawContent as Record<string, unknown>), engine: job.engine };
  }
  const parseInput = job.type === "visual" ? normalizeVisualContent(visualRaw) : rawContent;
  const parsed = schema.safeParse(parseInput);
  if (!parsed.success) {
    const diagnostic = job.type === "visual" ? visualFailureDiagnostic(rawContent, parseInput) : "";
    throw new BlockCompileError(
      `block ${job.order} (${job.type}) content invalid: ${parsed.error.message}${diagnostic}`,
      { jobId: job.jobId, issues: parsed.error.flatten() },
    );
  }

  if (job.type === "image") {
    const content = parsed.data as z.infer<typeof ImageContentSchema>;
    const brief: ImageBrief = {
      conceptIds: job.conceptIds,
      learningGoal: content.learningGoal,
      imageKind: content.imageKind,
      prompt: content.prompt,
      alt: content.alt,
      caption: content.caption,
      negativePrompt: content.negativePrompt,
      aspectRatio: content.aspectRatio,
      resolution: content.resolution,
    };
    // Pending — the imaging stage resolves the asset and finalizes this block.
    return makePendingImageBlock({
      id: blockIdFor(job, lessonId),
      title: content.title,
      conceptIds: job.conceptIds,
      pedagogicalRole: job.pedagogicalRole,
      brief,
    });
  }

  const base = {
    id: blockIdFor(job, lessonId),
    conceptIds: job.conceptIds,
    pedagogicalRole: job.pedagogicalRole,
  };

  if (job.type === "quiz") {
    // A concept-closing quiz is compiler-pinned to exactly one concept, so stamp
    // it onto every question deterministically — the writer never attributes it.
    const data = parsed.data as z.infer<typeof QuizContentSchema>;
    const conceptId = job.conceptIds[0];
    const questions = data.questions.map((question) => ({ ...question, conceptId }));
    return { ...base, type: "quiz", ...data, questions } as CourseBlock;
  }

  // parsed.data carries exactly the type-specific fields (including title);
  // merge with the discriminating type and planner metadata.
  return { ...base, type: job.type, ...(parsed.data as object) } as CourseBlock;
}
