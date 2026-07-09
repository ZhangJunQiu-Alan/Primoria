import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { createUtilityModel } from "../ai/deepagent/model";
import { getDb } from "../db/client";
import { generatedTopicGraphs } from "../db/schema";
import type { ConceptVisual, TopicConcept, TopicGraph, TopicNode } from "./topic-graph";

// LLM-generated topic graphs for out-of-library learning goals (e.g. "MCP",
// "Agent 架构"). The generator mirrors the implicit structure of the curated
// library graphs so generated courses run through the exact same lesson planner
// and, later, can be reviewed and promoted into the formal library:
//   - strictly 2-3 concepts per topic (library: 219 topics with 2, 147 with 3,
//     zero exceptions) — the lesson planner's skeleton is built for this band
//   - topic name = conjunction of its concept themes ("Network Layering and
//     OSI Model"), English `name` for indexing + Simplified Chinese `nameZh`
//   - roughly half the concepts carry a visual affordance + one imperative
//     visualHint sentence, which drives the planner's mandated visual blocks
//   - a linear chain: defaultOrder 1..N, successors → next topic (hard),
//     prereqTopics = previous topic, isRoot on the first
// Graphs are deduped by a normalized topic key and stored in
// generated_topic_graphs with a usage counter (沉淀: demand data for promotion).

export const GENERATED_GRAPH_PREFIX = "gen_";

const MIN_TOPICS = 4;
const MAX_TOPICS = 12;
const MAX_CONCEPTS_PER_TOPIC = 3;

const VISUALS: ReadonlySet<string> = new Set<ConceptVisual>([
  "interactive",
  "simulation",
  "algorithm",
  "function",
  "chart",
  "diagram",
]);

export type GeneratedGraphResult = {
  graph: TopicGraph;
  created: boolean;
};

export type GraphModelInvoker = (input: { system: string; user: string }) => Promise<string>;

const defaultInvoker: GraphModelInvoker = async ({ system, user }) => {
  const model = createUtilityModel({}, { maxTokens: 8192, timeoutMs: 90_000 });
  const response = await model.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
};

const SYSTEM_PROMPT = [
  "You design a compact knowledge graph for a learner-stated topic that a course library does not yet cover.",
  "The graph is a LINEAR sequence of topics; each topic is one teachable lesson built around 2-3 ordered concepts.",
  "",
  'Reply with ONLY JSON (no prose, no markdown):',
  '{"subject":"<English subject name>","subjectZh":"<简体中文学科名>","codeAdapted":<true|false>,"topics":[{"name":"<English topic name>","nameZh":"<简体中文>","concepts":[{"name":"<English concept name>","nameZh":"<简体中文>","visual":"<optional>","visualHint":"<optional>"}]}]}',
  "",
  "STRUCTURE RULES:",
  `- ${MIN_TOPICS}-${MAX_TOPICS} topics, ordered from prerequisites/foundations to applied practice. The first topic must be learnable with no prior knowledge of the subject.`,
  "- EVERY topic has exactly 2 or 3 concepts, ordered so each builds on the previous.",
  '- A topic\'s name is the conjunction of its concept themes, e.g. concepts "Network Layering" + "OSI Model" → topic "Network Layering and OSI Model".',
  "- Concept names are short noun phrases (≤4 words), each naming ONE idea — never a list or a sentence.",
  "- `name` fields are always English (used for indexing); `nameZh` fields are always Simplified Chinese.",
  "",
  "CODE ADAPTATION:",
  '- Set "codeAdapted": true ONLY if this subject is genuinely taught through writing/reading code: programming, software engineering, algorithms and data structures, developer tooling and protocols (APIs, SDKs, agent frameworks), numerical/scientific computing, ML engineering.',
  '- Set false for everything else — math theory, science, humanities, business, design — even when the subject merely mentions technology.',
  "",
  "VISUAL AFFORDANCES (assign to roughly half the concepts — only where a visual genuinely teaches the mechanism):",
  '- "diagram": structures, layered stacks, architectures, message/data flows',
  '- "algorithm": step-by-step procedures worth stepping through',
  '- "interactive": mechanisms the learner should manipulate to understand',
  '- "function": mathematical relationships or curves',
  '- "chart": quantitative comparisons',
  '- "simulation": physical or dynamic processes',
  'When you set "visual", also set "visualHint": ONE imperative sentence describing exactly what to show, e.g. "Diagram the seven OSI layers and their roles."',
].join("\n");

export function normalizeTopicKey(topic: string): string {
  return topic
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return slug || fallback;
}

function hash8(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type RawConcept = { name: string; nameZh: string; visual?: ConceptVisual; visualHint?: string };
type RawTopic = { name: string; nameZh: string; concepts: RawConcept[] };
type RawGraph = { subject: string; subjectZh: string; codeAdapted: boolean; topics: RawTopic[] };

// Parse + structurally validate the model's JSON. Coerces what it can (extra
// concepts truncated, invalid visuals dropped) and returns null when the result
// would not make a teachable course.
export function parseGeneratedGraph(text: string): RawGraph | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const subject = cleanString(obj.subject);
  const subjectZh = cleanString(obj.subjectZh);
  if (!subject) return null;

  const topics: RawTopic[] = [];
  for (const entry of Array.isArray(obj.topics) ? obj.topics : []) {
    if (!entry || typeof entry !== "object") continue;
    const t = entry as Record<string, unknown>;
    const name = cleanString(t.name);
    if (!name) continue;
    const concepts: RawConcept[] = [];
    for (const c of Array.isArray(t.concepts) ? t.concepts : []) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      const conceptName = cleanString(cc.name);
      if (!conceptName) continue;
      const visual = cleanString(cc.visual);
      const visualHint = cleanString(cc.visualHint);
      concepts.push({
        name: conceptName,
        nameZh: cleanString(cc.nameZh),
        ...(VISUALS.has(visual) ? { visual: visual as ConceptVisual } : {}),
        ...(VISUALS.has(visual) && visualHint ? { visualHint } : {}),
      });
      if (concepts.length >= MAX_CONCEPTS_PER_TOPIC) break;
    }
    if (concepts.length === 0) continue;
    topics.push({ name, nameZh: cleanString(t.nameZh), concepts });
    if (topics.length >= MAX_TOPICS) break;
  }

  if (topics.length < MIN_TOPICS) return null;
  return { subject, subjectZh, codeAdapted: obj.codeAdapted === true, topics };
}

// Deterministic ids from the dedup key, so a rerun for the same topic yields
// the same graphId (insert races collapse onto one row).
export function toTopicGraph(raw: RawGraph, topicKey: string): TopicGraph {
  const graphId = `${GENERATED_GRAPH_PREFIX}${slugify(raw.subject, "subject")}_${hash8(topicKey)}`;
  const topics: TopicNode[] = raw.topics.map((topic, index) => {
    const order = index + 1;
    const topicId = `t${order}_${slugify(topic.name, `topic${order}`)}`;
    const conceptIds: TopicConcept[] = topic.concepts.map((concept, conceptIndex) => ({
      conceptId: `t${order}c${conceptIndex + 1}_${slugify(concept.name, `concept${conceptIndex + 1}`)}`,
      name: concept.name,
      nameZh: concept.nameZh || null,
      defaultOrder: conceptIndex + 1,
      ...(concept.visual ? { visual: concept.visual } : {}),
      ...(concept.visualHint ? { visualHint: concept.visualHint } : {}),
    }));
    return {
      topicId,
      name: topic.name,
      nameZh: topic.nameZh || null,
      defaultOrder: order,
      conceptIds,
      successors: [],
      prereqTopics: [],
      isRoot: order === 1,
    };
  });
  for (let i = 0; i < topics.length; i += 1) {
    if (i + 1 < topics.length) topics[i].successors = [{ topicId: topics[i + 1].topicId, hard: true }];
    if (i > 0) topics[i].prereqTopics = [topics[i - 1].topicId];
  }
  return { graphId, subject: raw.subject, topics, ...(raw.codeAdapted ? { codeAdapted: true } : {}) };
}

export async function generateTopicGraph(
  input: { topic: string; language?: string | null },
  invokeModel: GraphModelInvoker = defaultInvoker,
): Promise<TopicGraph | null> {
  try {
    const text = await invokeModel({
      system: SYSTEM_PROMPT,
      user: `Learner topic: "${input.topic}"`,
    });
    const raw = parseGeneratedGraph(text);
    return raw ? toTopicGraph(raw, normalizeTopicKey(input.topic)) : null;
  } catch (error) {
    console.warn("[generated-graph] generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getGeneratedGraphById(graphId: string): Promise<TopicGraph | null> {
  if (!graphId.startsWith(GENERATED_GRAPH_PREFIX)) return null;
  const rows = await getDb()
    .select({ graph: generatedTopicGraphs.graph })
    .from(generatedTopicGraphs)
    .where(eq(generatedTopicGraphs.graphId, graphId))
    .limit(1);
  return (rows[0]?.graph as TopicGraph | undefined) ?? null;
}

async function findByTopicKey(topicKey: string): Promise<TopicGraph | null> {
  const rows = await getDb()
    .select({ graph: generatedTopicGraphs.graph })
    .from(generatedTopicGraphs)
    .where(eq(generatedTopicGraphs.topicKey, topicKey))
    .limit(1);
  return (rows[0]?.graph as TopicGraph | undefined) ?? null;
}

async function bumpUsage(topicKey: string): Promise<void> {
  await getDb()
    .update(generatedTopicGraphs)
    .set({ usageCount: sql`${generatedTopicGraphs.usageCount} + 1`, updatedAt: new Date() })
    .where(eq(generatedTopicGraphs.topicKey, topicKey));
}

// Reuse-or-generate entry: one graph per normalized topic, shared across users.
// usage_count records demand so popular candidates can be reviewed and promoted
// into the formal library later.
export async function getOrCreateGeneratedGraph(
  input: { topic: string; language?: string | null },
  invokeModel: GraphModelInvoker = defaultInvoker,
): Promise<GeneratedGraphResult | null> {
  const topicKey = normalizeTopicKey(input.topic);
  if (!topicKey) return null;

  const existing = await findByTopicKey(topicKey);
  if (existing) {
    await bumpUsage(topicKey).catch(() => {});
    return { graph: existing, created: false };
  }

  const graph = await generateTopicGraph(input, invokeModel);
  if (!graph) return null;

  try {
    await getDb().insert(generatedTopicGraphs).values({
      graphId: graph.graphId,
      topicKey,
      topic: input.topic,
      subject: graph.subject,
      language: input.language ?? null,
      graph,
    });
  } catch (error) {
    // Unique-key race (or same-key rerun): another request already stored this
    // topic — reuse the winner's graph.
    const raced = await findByTopicKey(topicKey);
    if (raced) {
      await bumpUsage(topicKey).catch(() => {});
      return { graph: raced, created: false };
    }
    throw error;
  }
  return { graph, created: true };
}
