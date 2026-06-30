import { z } from "zod";
import { invokeJson } from "../course-generation/model-json";
import type { TutorProviderSettings } from "../types";
import { FACT_CATEGORIES, type FactCategory, type LearnerFact } from "../../learner-profile/types";
import type { FactExtractionOp } from "../../learner-facts/store";

// The Extractor Agent's distillation step: read one lesson's activity and update
// the learner's durable "facts about you". The model proposes add/reinforce/skip
// ops over four categories; dedup against existing facts (and the dismissed
// tombstones the learner removed) is the model's job, with a code-level backstop
// in learner-facts/store.ts. Mastery is NOT the extractor's concern — it never
// emits concept mastery.

export type DistillEvent = {
  id: string;
  kind: "chat.feedback" | "chat.question" | "quiz.submit";
  // Human-readable one-line summary the model reads (already includes the chat
  // body / quiz outcome — heavy joins happen in the processor, not here).
  summary: string;
};

export type DistillContext = {
  topicName: string;
  conceptNames: string[];
  events: DistillEvent[];
  existingFacts: LearnerFact[];
};

const CATEGORY_GUIDE = [
  "- preference: how they like to learn (e.g. \"prefers worked examples before definitions\", \"wants visual/geometric intuition\", \"likes terse answers\"). Changes HOW we teach.",
  "- prior_knowledge: background they already hold (e.g. \"knows matrix multiplication\", \"comfortable with high-school mechanics\"). Lets us skip or compress.",
  "- learning_gap: a recurring weak spot / misconception / sticking point (e.g. \"confuses class and object\", \"misses recursion base cases\"). NOT a single wrong answer — a pattern. Tells us where to add prerequisites, practice, or analogies.",
  "- goal: what/why they want to learn (e.g. \"preparing for A-Level Physics\"). Long-term profile only.",
].join("\n");

export function buildDistillPrompt(ctx: DistillContext): { system: string; user: string } {
  const system = [
    "You are Primoria's Extractor. From ONE lesson's activity, distill durable, reusable FACTS about this learner that will make future lessons more personal. Output JSON only.",
    "",
    "FACT CATEGORIES (use exactly these):",
    CATEGORY_GUIDE,
    "",
    "RULES:",
    "- Only emit a fact when the evidence genuinely supports it. Prefer 0 facts over a guess. Never invent.",
    "- Each fact is ONE concise, self-contained sentence about the learner (not about the lesson topic).",
    "- Do NOT emit concept mastery / scores / right-wrong tallies — that is tracked elsewhere.",
    "- DEDUP against EXISTING ACTIVE FACTS: if a new observation matches one, use op \"reinforce\" with its factId instead of adding a duplicate.",
    "- NEVER re-create a DISMISSED fact: if an observation is the same kind as any dismissed fact, use op \"skip\". The learner removed it on purpose.",
    "- For every add/reinforce, cite the supporting evidence event ids in evidenceEventIds (must be ids from the EVENTS list).",
    "",
    "OUTPUT: {\"facts\":[{\"op\":\"add|reinforce|skip\",\"text\":\"...\",\"category\":\"preference|prior_knowledge|learning_gap|goal\",\"confidence\":0..1,\"factId\":\"<for reinforce>\",\"evidenceEventIds\":[\"...\"]}]}",
  ].join("\n");

  const existing = ctx.existingFacts.length
    ? ctx.existingFacts
        .map((f) => `- [${f.status}] factId=${f.id} (${f.category}) ${f.text}`)
        .join("\n")
    : "(none yet)";
  const events = ctx.events.length ? ctx.events.map((e) => `- id=${e.id} [${e.kind}] ${e.summary}`).join("\n") : "(no activity)";

  const user = [
    `LESSON TOPIC: ${ctx.topicName}`,
    `CONCEPTS: ${ctx.conceptNames.join(", ") || "(none)"}`,
    "",
    "EXISTING FACTS (reinforce active ones; never re-create dismissed ones):",
    existing,
    "",
    "THIS LESSON'S EVENTS:",
    events,
  ].join("\n");

  return { system, user };
}

const OpSchema = z.object({
  op: z.enum(["add", "reinforce", "skip"]),
  text: z.string().trim().min(1).max(240).optional(),
  category: z.enum(FACT_CATEGORIES).optional(),
  confidence: z.number().min(0).max(1).optional(),
  factId: z.string().optional(),
  evidenceEventIds: z.array(z.string()).optional(),
});
const DistillResultSchema = z.object({ facts: z.array(OpSchema).max(24) });

// Facts are distilled from user chat and persisted long-term, then injected into
// future Planner/Tutor prompts — a persistent prompt-injection surface. Reject
// any "fact" that reads like an instruction to the model (imperative verbs aimed
// at the system, role markers, fenced/templated control text) rather than a
// neutral description of the learner. Defense-in-depth alongside the quoted data
// block the directive wraps facts in.
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b.{0,40}\b(previous|prior|above|earlier|instruction|prompt|rule|context)\b/i,
  /\b(system|developer|assistant)\s*(prompt|message|role|instruction)\b/i,
  /\byou\s+(are|must|should|will|are now|are to)\b/i,
  /\b(act|behave|respond|reply|answer|pretend)\s+as\b/i,
  /\bnew\s+(instruction|rule|task|persona|directive)s?\b/i,
  /<\/?(system|user|assistant|im_start|im_end)\b/i,
  /```/,
  /\{\{.*\}\}/,
];

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

// Map the (untrusted) model output to store ops. Pure + defensive: drops
// malformed ops, restricts evidence to ids that actually occurred this lesson,
// and assembles the FactEvidence the store records. `skip` ops are dropped (they
// are no-ops the store does not need).
export function parseDistillResult(
  raw: unknown,
  args: { lessonId: string; validEventIds: Set<string>; now?: string },
): FactExtractionOp[] {
  const parsed = DistillResultSchema.safeParse(raw);
  if (!parsed.success) return [];
  const at = args.now ?? new Date().toISOString();
  const ops: FactExtractionOp[] = [];

  for (const op of parsed.data.facts) {
    if (op.op === "skip") continue;
    const eventIds = (op.evidenceEventIds ?? []).filter((id) => args.validEventIds.has(id));
    // Enforce the "cite evidence" contract: an op with no valid supporting event
    // (none cited, or all citations were hallucinated ids) is dropped, never
    // persisted as an ungrounded fact.
    if (eventIds.length === 0) continue;
    const evidence = { lessonId: args.lessonId, eventIds, at };

    if (op.op === "add") {
      if (!op.text || !op.category) continue;
      if (looksLikeInjection(op.text)) continue; // never persist instruction-shaped "facts"
      ops.push({ op: "add", text: op.text, category: op.category as FactCategory, confidence: op.confidence ?? null, evidence });
    } else {
      if (!op.factId) continue;
      ops.push({ op: "reinforce", factId: op.factId, confidence: op.confidence ?? null, evidence });
    }
  }
  return ops;
}

export async function distillFacts(args: {
  ctx: DistillContext;
  lessonId: string;
  settings?: TutorProviderSettings;
}): Promise<FactExtractionOp[]> {
  const { system, user } = buildDistillPrompt(args.ctx);
  const raw = await invokeJson({ system, user, schema: DistillResultSchema, schemaName: "learner_facts", settings: args.settings });
  const validEventIds = new Set(args.ctx.events.map((e) => e.id));
  return parseDistillResult(raw, { lessonId: args.lessonId, validEventIds });
}
