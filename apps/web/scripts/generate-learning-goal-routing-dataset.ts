import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { getKnowledgeGraphSubjectLabel, KG_SUBJECT_ZH } from "../src/lib/knowledge-graph/subject-aliases";

type Language = "en" | "zh";
type Split = "dev" | "test";
type Category =
  | "library_broad"
  | "library_topic"
  | "library_concept"
  | "library_boundary"
  | "out_of_library"
  | "multi_scope"
  | "ambiguous"
  | "invalid_or_vague";
type Branch = "positioned" | "clarify_subject" | "out_of_library" | "fallback";
type Mode = "specific" | "subject_start" | "directed" | "goal_scoped";

type SourceNode = {
  id: string;
  kind: "topic" | "concept";
  name: string;
  name_zh: string;
  topic: string | null;
  default_order: number;
};

type SourceGraph = {
  graph_id: string;
  subject: string;
  content_version?: string;
  nodes: SourceNode[];
};

type Expectation = {
  branches: Branch[];
  graphIds?: string[];
  modes?: Mode[];
  startTopicIds?: string[];
  targetConceptIds?: string[];
  candidateGraphIds?: string[];
};

type EvalCase = {
  id: string;
  category: Category;
  split: Split;
  suite: "core" | "challenge" | "regression";
  language: Language;
  input: string;
  expect: Expectation;
  policy: {
    coverage: "full_single_graph" | "full_multi_graph" | "partial" | "none" | "ambiguous" | "invalid";
    action: "canonical_kg" | "composed_kg" | "hybrid_graph" | "generated_graph" | "clarify" | "fallback";
    scope: "full_graph" | "topic_closure" | "concept_closure" | "goal_subgraph" | "generated_graph" | "not_applicable";
    sourceGraphIds?: string[];
    mustIncludeConceptIds?: string[];
    mustExcludeConceptIds?: string[];
  };
  reference?: { graphId?: string; topicId?: string; conceptId?: string };
  origin: { kind: "kg_template" | "manual_seed"; sourceId: string; templateId: string };
  tags: string[];
};

type ManualPair = { id: string; en: string; zh: string; tags?: string[]; sourceGraphIds?: string[] };
type InLibraryPair = ManualPair & {
  graphId: string;
  modes: Mode[];
  startTopicIds: string[];
  mustIncludeConceptIds?: string[];
  mustExcludeConceptIds?: string[];
};
type AmbiguousPair = ManualPair & { candidateGraphIds: string[] };
type ManualSeeds = {
  version: 2;
  inLibrary: InLibraryPair[];
  outOfLibrary: ManualPair[];
  multiScope: ManualPair[];
  ambiguous: AmbiguousPair[];
  invalidOrVague: ManualPair[];
};

const WEB_ROOT = process.cwd();
const REPO_ROOT = resolve(WEB_ROOT, "../..");
const SOURCE_DIR = join(REPO_ROOT, "data/knowledge-graphs/source");
const FIXTURE_DIR = join(WEB_ROOT, "tests/fixtures");
const SEED_PATH = join(FIXTURE_DIR, "learning-goal-routing.manual-seeds.v2.json");
const OUTPUT_PATH = join(FIXTURE_DIR, "learning-goal-routing.v2.json");
const NON_GRAPH_FILES = new Set(["cross_subject_edges.json", "kg_zh_labels.json"]);
const MIN_PERMANENT_CASES = 1_718;
const REGIONAL_CURRICULUM_GRAPH_IDS = [
  "senior_secondary_biology",
  "senior_secondary_chemistry",
  "senior_secondary_mathematics",
  "senior_secondary_physics",
  "singapore_h2_biology",
  "singapore_h2_chemistry",
  "singapore_h2_mathematics",
  "singapore_h2_physics",
  "singapore_lower_secondary_science",
  "singapore_secondary_mathematics",
] as const;
const PERMANENT_REGRESSION_CONTRACTS = [
  {
    input: "我想要学习大模型架构和在AI应用中的使用",
    action: "hybrid_graph",
    scope: "goal_subgraph",
  },
  {
    input: "我想要学习面向深度学习的线性代数",
    action: "composed_kg",
    scope: "goal_subgraph",
  },
] as const;

const EN_TOPIC_TEMPLATES = [
  (topic: string, subject: string) => `Within ${subject}, I want to focus on ${topic}`,
  (topic: string, subject: string) => `Teach me ${topic} as part of ${subject}`,
  (topic: string, subject: string) => `Build a focused learning path for ${topic} in ${subject}`,
  (topic: string, subject: string) => `I already know the basics of ${subject}; help me study ${topic}`,
];
const ZH_TOPIC_TEMPLATES = [
  (topic: string, subject: string) => `我想在${subject}中重点学习${topic}`,
  (topic: string, subject: string) => `请把${topic}作为${subject}课程的学习重点`,
  (topic: string, subject: string) => `帮我设计一条围绕${topic}的${subject}学习路径`,
  (topic: string, subject: string) => `我已经了解${subject}基础，想继续学习${topic}`,
];

function hash(value: string) {
  let current = 2166136261;
  for (const char of value) {
    current ^= char.codePointAt(0) ?? 0;
    current = Math.imul(current, 16777619);
  }
  return current >>> 0;
}

function splitFor(id: string): Split {
  return hash(id) % 5 === 0 ? "dev" : "test";
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function loadGraphs(): SourceGraph[] {
  return readdirSync(SOURCE_DIR)
    .filter((file) => file.endsWith(".json") && !NON_GRAPH_FILES.has(file))
    .sort()
    .map((file) => readJson<SourceGraph>(join(SOURCE_DIR, file)));
}

function normalizeInput(value: string) {
  return value.toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, " ").trim();
}

function selectEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const selected: T[] = [];
  const used = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    const position = Math.round((index * (items.length - 1)) / (count - 1));
    if (!used.has(position)) {
      used.add(position);
      selected.push(items[position]);
    }
  }
  return selected;
}

function makeCase(input: Omit<EvalCase, "split">): EvalCase {
  return { ...input, split: splitFor(input.id) };
}

function buildKgCases(graphs: SourceGraph[]) {
  const cases: EvalCase[] = [];
  for (const graph of graphs) {
    const subjectZh = KG_SUBJECT_ZH[graph.graph_id];
    if (!subjectZh) throw new Error(`Missing Chinese subject label for ${graph.graph_id}`);
    const subjectEn = getKnowledgeGraphSubjectLabel(graph.graph_id, "en");
    const topics = graph.nodes
      .filter((node) => node.kind === "topic")
      .sort((a, b) => a.default_order - b.default_order || a.id.localeCompare(b.id));
    const topicOrder = new Map(topics.map((topic, index) => [topic.id, index]));
    const concepts = graph.nodes
      .filter((node) => node.kind === "concept" && node.topic && topicOrder.has(node.topic))
      .sort((a, b) => {
        const topicDelta = topicOrder.get(a.topic!)! - topicOrder.get(b.topic!)!;
        return topicDelta || a.default_order - b.default_order || a.id.localeCompare(b.id);
      });
    if (topics.length === 0 || concepts.length === 0) throw new Error(`${graph.graph_id} has no topics or concepts`);

    const broadVariants: Array<{ language: Language; templateId: string; input: string }> = [
      { language: "en", templateId: "subject_beginner_en", input: `I want to learn ${subjectEn} from the beginning` },
      { language: "en", templateId: "subject_systematic_en", input: `Build me a systematic course on ${subjectEn}` },
      { language: "zh", templateId: "subject_beginner_zh", input: `我想从零开始学习${subjectZh}` },
      { language: "zh", templateId: "subject_systematic_zh", input: `请给我设计一门系统的${subjectZh}课程` },
    ];
    for (const variant of broadVariants) {
      cases.push(
        makeCase({
          id: `kg-broad-${graph.graph_id}-${variant.templateId}`,
          category: "library_broad",
          suite: "core",
          language: variant.language,
          input: variant.input,
          expect: { branches: ["positioned"], graphIds: [graph.graph_id], modes: ["subject_start"] },
          policy: {
            coverage: "full_single_graph",
            action: "canonical_kg",
            scope: "full_graph",
            sourceGraphIds: [graph.graph_id],
          },
          reference: { graphId: graph.graph_id, topicId: topics[0].id },
          origin: { kind: "kg_template", sourceId: graph.graph_id, templateId: variant.templateId },
          tags: ["kg_grounded", "subject_level", "broad"],
        }),
      );
    }

    topics.forEach((topic, topicIndex) => {
      const allowedStarts = topicIndex === 0 ? [topic.id] : [topics[topicIndex - 1].id, topic.id];
      const allowedModes: Mode[] = topicIndex === 0 ? ["subject_start", "directed", "specific"] : ["directed", "specific"];
      const variants: Array<{ language: Language; templateId: string; input: string }> = [
        {
          language: "en",
          templateId: `topic_en_${topicIndex % EN_TOPIC_TEMPLATES.length}`,
          input: EN_TOPIC_TEMPLATES[topicIndex % EN_TOPIC_TEMPLATES.length](topic.name, subjectEn),
        },
        {
          language: "zh",
          templateId: `topic_zh_${topicIndex % ZH_TOPIC_TEMPLATES.length}`,
          input: ZH_TOPIC_TEMPLATES[topicIndex % ZH_TOPIC_TEMPLATES.length](topic.name_zh, subjectZh),
        },
      ];
      for (const variant of variants) {
        cases.push(
          makeCase({
            id: `kg-topic-${graph.graph_id}-${topic.id}-${variant.language}`,
            category: "library_topic",
            suite: "core",
            language: variant.language,
            input: variant.input,
            expect: {
              branches: ["positioned"],
              graphIds: [graph.graph_id],
              modes: allowedModes,
              startTopicIds: allowedStarts,
            },
            policy: {
              coverage: "full_single_graph",
              action: "canonical_kg",
              scope: "topic_closure",
              sourceGraphIds: [graph.graph_id],
            },
            reference: { graphId: graph.graph_id, topicId: topic.id },
            origin: { kind: "kg_template", sourceId: `${graph.graph_id}:${topic.id}`, templateId: variant.templateId },
            tags: ["kg_grounded", "topic_level", topicIndex === 0 ? "root_topic" : "directed"],
          }),
        );
      }
    });

    for (const concept of selectEvenly(concepts, 3)) {
      const topic = topics[topicOrder.get(concept.topic!)!];
      const variants: Array<{ language: Language; templateId: string; input: string }> = [
        {
          language: "en",
          templateId: "concept_specific_en",
          input: `Within ${subjectEn}, I want to understand ${concept.name} in depth`,
        },
        {
          language: "zh",
          templateId: "concept_specific_zh",
          input: `在${subjectZh}中，我想深入理解${concept.name_zh}`,
        },
      ];
      for (const variant of variants) {
        cases.push(
          makeCase({
            id: `kg-concept-${graph.graph_id}-${concept.id}-${variant.language}`,
            category: "library_concept",
            suite: "core",
            language: variant.language,
            input: variant.input,
            expect: {
              branches: ["positioned"],
              graphIds: [graph.graph_id],
              modes: ["specific"],
              startTopicIds: [topic.id],
              targetConceptIds: [concept.id],
            },
            policy: {
              coverage: "full_single_graph",
              action: "canonical_kg",
              scope: "concept_closure",
              sourceGraphIds: [graph.graph_id],
            },
            reference: { graphId: graph.graph_id, topicId: topic.id, conceptId: concept.id },
            origin: { kind: "kg_template", sourceId: `${graph.graph_id}:${concept.id}`, templateId: variant.templateId },
            tags: ["kg_grounded", "concept_level", "specific"],
          }),
        );
      }
    }
  }
  return cases;
}

function expandManualPair(
  seed: ManualPair,
  category: Category,
  suite: EvalCase["suite"],
  expectation: Expectation,
  policy: EvalCase["policy"],
) {
  return (["en", "zh"] as const).map((language) =>
    makeCase({
      id: `manual-${category}-${seed.id}-${language}`,
      category,
      suite,
      language,
      input: seed[language],
      expect: expectation,
      policy,
      origin: { kind: "manual_seed", sourceId: seed.id, templateId: `manual_${language}` },
      tags: ["hand_authored", ...(seed.tags ?? [])],
    }),
  );
}

function buildManualCases(seeds: ManualSeeds) {
  const cases: EvalCase[] = [];
  for (const seed of seeds.inLibrary) {
    const sourceGraphIds = seed.sourceGraphIds ?? [seed.graphId];
    const composed = seed.tags?.includes("application_context") ?? false;
    for (const language of ["en", "zh"] as const) {
      cases.push(
        makeCase({
          id: `manual-library_boundary-${seed.id}-${language}`,
          category: "library_boundary",
          suite: "challenge",
          language,
          input: seed[language],
          expect: {
            branches: ["positioned"],
            graphIds: [seed.graphId],
            modes: seed.modes,
            startTopicIds: seed.startTopicIds,
          },
          policy: {
            coverage: sourceGraphIds.length > 1 ? "full_multi_graph" : "full_single_graph",
            action: composed ? "composed_kg" : "canonical_kg",
            scope: composed ? "goal_subgraph" : "topic_closure",
            sourceGraphIds,
            mustIncludeConceptIds: seed.mustIncludeConceptIds,
            mustExcludeConceptIds: seed.mustExcludeConceptIds,
          },
          reference: { graphId: seed.graphId, topicId: seed.startTopicIds.at(-1) },
          origin: { kind: "manual_seed", sourceId: seed.id, templateId: `manual_${language}` },
          tags: ["hand_authored", "coverage_audited", ...(seed.tags ?? [])],
        }),
      );
    }
  }
  for (const seed of seeds.outOfLibrary) {
    cases.push(
      ...expandManualPair(
        seed,
        "out_of_library",
        "challenge",
        { branches: ["out_of_library"] },
        seed.tags?.includes("partial_overlap")
          ? { coverage: "partial", action: "hybrid_graph", scope: "goal_subgraph", sourceGraphIds: seed.sourceGraphIds }
          : { coverage: "none", action: "generated_graph", scope: "generated_graph" },
      ),
    );
  }
  for (const seed of seeds.multiScope) {
    const composed = seed.tags?.includes("curated_composition") ?? false;
    cases.push(
      ...expandManualPair(
        seed,
        "multi_scope",
        seed.tags?.includes("reported_regression") ? "regression" : "challenge",
        { branches: ["out_of_library"] },
        composed
          ? {
              coverage: "full_multi_graph",
              action: "composed_kg",
              scope: "goal_subgraph",
              sourceGraphIds: seed.sourceGraphIds,
            }
          : {
              coverage: "partial",
              action: "hybrid_graph",
              scope: "goal_subgraph",
              sourceGraphIds: seed.sourceGraphIds,
            },
      ),
    );
  }
  for (const seed of seeds.ambiguous) {
    cases.push(
      ...expandManualPair(seed, "ambiguous", "challenge", {
        branches: ["clarify_subject"],
        candidateGraphIds: seed.candidateGraphIds,
      }, { coverage: "ambiguous", action: "clarify", scope: "not_applicable" }),
    );
  }
  for (const seed of seeds.invalidOrVague) {
    cases.push(
      ...expandManualPair(
        seed,
        "invalid_or_vague",
        "challenge",
        { branches: ["fallback"] },
        { coverage: "invalid", action: "fallback", scope: "not_applicable" },
      ),
    );
  }
  return cases;
}

function countBy<T extends string>(values: T[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
  );
}

function validateDataset(cases: EvalCase[], graphs: SourceGraph[]) {
  if (cases.length < MIN_PERMANENT_CASES) {
    throw new Error(`Permanent learning-goal corpus may not shrink below ${MIN_PERMANENT_CASES} cases; got ${cases.length}`);
  }
  const ids = new Set<string>();
  const inputs = new Map<string, string>();
  const graphById = new Map(graphs.map((graph) => [graph.graph_id, graph]));
  const branchesByAction: Record<EvalCase["policy"]["action"], Branch[]> = {
    canonical_kg: ["positioned"],
    composed_kg: ["positioned", "out_of_library"],
    hybrid_graph: ["out_of_library"],
    generated_graph: ["out_of_library"],
    clarify: ["clarify_subject"],
    fallback: ["fallback"],
  };
  for (const item of cases) {
    if (ids.has(item.id)) throw new Error(`Duplicate case id: ${item.id}`);
    ids.add(item.id);
    const normalized = normalizeInput(item.input);
    const previous = inputs.get(normalized);
    if (previous) throw new Error(`Duplicate input: ${previous} and ${item.id}`);
    inputs.set(normalized, item.id);
    const allowedBranches = branchesByAction[item.policy.action];
    if (item.expect.branches.some((branch) => !allowedBranches.includes(branch))) {
      throw new Error(`${item.id} policy action ${item.policy.action} does not allow ${item.expect.branches.join("|")}`);
    }

    for (const graphId of item.policy.sourceGraphIds ?? []) {
      if (!graphById.has(graphId)) throw new Error(`${item.id} policy references unknown source graph ${graphId}`);
    }
    const sourceConceptIds = new Set(
      (item.policy.sourceGraphIds ?? []).flatMap((graphId) =>
        graphById
          .get(graphId)!
          .nodes.filter((node) => node.kind === "concept")
          .map((node) => node.id),
      ),
    );
    for (const conceptId of [...(item.policy.mustIncludeConceptIds ?? []), ...(item.policy.mustExcludeConceptIds ?? [])]) {
      if (!sourceConceptIds.has(conceptId)) {
        throw new Error(`${item.id} policy references concept outside its source graphs: ${conceptId}`);
      }
    }
    const excluded = new Set(item.policy.mustExcludeConceptIds ?? []);
    const overlap = (item.policy.mustIncludeConceptIds ?? []).filter((conceptId) => excluded.has(conceptId));
    if (overlap.length > 0) throw new Error(`${item.id} both includes and excludes concepts: ${overlap.join(",")}`);

    for (const graphId of item.expect.graphIds ?? []) {
      if (!graphById.has(graphId)) throw new Error(`${item.id} references unknown graph ${graphId}`);
    }
    const expectedGraph = item.expect.graphIds?.[0];
    if (expectedGraph) {
      const graph = graphById.get(expectedGraph)!;
      const topicIds = new Set(graph.nodes.filter((node) => node.kind === "topic").map((node) => node.id));
      const conceptIds = new Set(graph.nodes.filter((node) => node.kind === "concept").map((node) => node.id));
      for (const topicId of item.expect.startTopicIds ?? []) {
        if (!topicIds.has(topicId)) throw new Error(`${item.id} references unknown topic ${expectedGraph}:${topicId}`);
      }
      for (const conceptId of item.expect.targetConceptIds ?? []) {
        if (!conceptIds.has(conceptId)) throw new Error(`${item.id} references unknown concept ${expectedGraph}:${conceptId}`);
      }
    }
  }

  for (const graph of graphs) {
    const topics = graph.nodes.filter((node) => node.kind === "topic");
    for (const language of ["en", "zh"] as const) {
      const broad = cases.filter(
        (item) => item.category === "library_broad" && item.language === language && item.reference?.graphId === graph.graph_id,
      );
      if (broad.length < 2) throw new Error(`${graph.graph_id} missing ${language} broad coverage`);
      const coveredTopics = new Set(
        cases
          .filter(
            (item) => item.category === "library_topic" && item.language === language && item.reference?.graphId === graph.graph_id,
          )
          .map((item) => item.reference?.topicId),
      );
      for (const topic of topics) {
        if (!coveredTopics.has(topic.id)) throw new Error(`${graph.graph_id}:${topic.id} missing ${language} topic coverage`);
      }
    }
  }

  for (const graphId of REGIONAL_CURRICULUM_GRAPH_IDS) {
    for (const language of ["en", "zh"] as const) {
      const boundary = cases.filter(
        (item) =>
          item.category === "library_boundary" &&
          item.language === language &&
          item.reference?.graphId === graphId &&
          item.origin.kind === "manual_seed",
      );
      if (boundary.length < 1) throw new Error(`${graphId} missing ${language} manual boundary coverage`);
    }
  }

  for (const contract of PERMANENT_REGRESSION_CONTRACTS) {
    const item = cases.find((candidate) => candidate.input === contract.input);
    if (!item) throw new Error(`Missing permanent regression input: ${contract.input}`);
    if (item.policy.action !== contract.action || item.policy.scope !== contract.scope) {
      throw new Error(
        `Permanent regression policy changed for ${contract.input}: expected ${contract.action}/${contract.scope}, got ${item.policy.action}/${item.policy.scope}`,
      );
    }
  }
}

function main() {
  const graphs = loadGraphs();
  const seeds = readJson<ManualSeeds>(SEED_PATH);
  if (seeds.version !== 2) throw new Error(`Unsupported manual seed version: ${seeds.version}`);
  const cases = [...buildKgCases(graphs), ...buildManualCases(seeds)].sort((a, b) => a.id.localeCompare(b.id));
  validateDataset(cases, graphs);

  const dataset = {
    version: 2,
    datasetId: "primoria-home-learning-goal-routing-v2",
    description:
      "Homepage AI Tutor learning-goal routing goldens. The dataset starts after position_learning_goal is selected and never creates courses or writes user data.",
    generatorVersion: 2,
    generatedFrom: {
      knowledgeGraphs: "data/knowledge-graphs/source/*.json",
      manualSeeds: "apps/web/tests/fixtures/learning-goal-routing.manual-seeds.v2.json",
    },
    methodology: {
      principles: [
        "Versioned data and evaluator separation",
        "Knowledge-graph-grounded scenario generation",
        "Treat curated KGs as reusable concept sources, not immutable course templates",
        "Keep overlapping school subjects curriculum-specific; explicit curriculum context outranks learner facts, and unresolved systems require clarification",
        "Use canonical KG paths for standard subject goals, compose minimal KG subgraphs for contextual goals, extend partial coverage with hybrid graphs, and freely generate only when coverage is absent",
        "Explicit canonical, composed, hybrid, generated, ambiguous, and invalid policy labels",
        "Fixed deterministic dev/test split",
        "Exact labels plus allowed outcomes for policy-sensitive cases",
      ],
      inspiredBy: [
        "https://github.com/openai/evals",
        "https://github.com/vibrantlabsai/ragas/blob/main/docs/getstarted/rag_testset_generation.md",
        "https://github.com/clinc/oos-eval",
        "https://github.com/aurelio-labs/semantic-router",
      ],
    },
    sourceSummary: {
      graphCount: graphs.length,
      topicCount: graphs.reduce((sum, graph) => sum + graph.nodes.filter((node) => node.kind === "topic").length, 0),
      conceptCount: graphs.reduce((sum, graph) => sum + graph.nodes.filter((node) => node.kind === "concept").length, 0),
    },
    stats: {
      total: cases.length,
      byCategory: countBy(cases.map((item) => item.category)),
      byLanguage: countBy(cases.map((item) => item.language)),
      bySplit: countBy(cases.map((item) => item.split)),
      bySuite: countBy(cases.map((item) => item.suite)),
      byPolicyAction: countBy(cases.map((item) => item.policy.action)),
      byPolicyScope: countBy(cases.map((item) => item.policy.scope)),
    },
    cases,
  };
  const serialized = `${JSON.stringify(dataset, null, 2)}\n`;

  if (process.argv.includes("--check")) {
    if (!existsSync(OUTPUT_PATH)) throw new Error(`Missing generated dataset: ${basename(OUTPUT_PATH)}`);
    if (readFileSync(OUTPUT_PATH, "utf8") !== serialized) {
      throw new Error(`Generated dataset is stale. Run: pnpm --filter @primoria/web generate:learning-goal-routing`);
    }
    process.stdout.write(`Verified ${cases.length} generated learning-goal routing cases.\n`);
    return;
  }

  writeFileSync(OUTPUT_PATH, serialized);
  process.stdout.write(`Generated ${cases.length} learning-goal routing cases at ${OUTPUT_PATH}.\n`);
}

main();
