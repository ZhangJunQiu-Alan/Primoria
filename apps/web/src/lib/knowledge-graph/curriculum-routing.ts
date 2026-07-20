export const CURRICULUM_SYSTEMS = [
  "cambridge_international_a_level",
  "mainland_china_junior_secondary",
  "mainland_china_senior_high",
  "singapore_h2",
  "singapore_lower_secondary",
  "singapore_secondary_g2_g3",
] as const;

export type CurriculumSystem = (typeof CURRICULUM_SYSTEMS)[number];
export type CurriculumRegion = "international" | "mainland_china" | "singapore";
export type CurriculumSubject = "biology" | "chemistry" | "mathematics" | "physics" | "science";

export type LearnerCurriculumContext = {
  system: CurriculumSystem | null;
  region: CurriculumRegion | null;
};

type CurriculumGraph = {
  graphId: string;
  system: CurriculumSystem;
  region: CurriculumRegion;
  subject: CurriculumSubject;
};

export const CURRICULUM_GRAPHS: readonly CurriculumGraph[] = [
  { graphId: "a_level_biology", system: "cambridge_international_a_level", region: "international", subject: "biology" },
  { graphId: "a_level_chemistry", system: "cambridge_international_a_level", region: "international", subject: "chemistry" },
  { graphId: "a_level_mathematics", system: "cambridge_international_a_level", region: "international", subject: "mathematics" },
  { graphId: "a_level_physics", system: "cambridge_international_a_level", region: "international", subject: "physics" },
  { graphId: "senior_secondary_biology", system: "mainland_china_senior_high", region: "mainland_china", subject: "biology" },
  { graphId: "senior_secondary_chemistry", system: "mainland_china_senior_high", region: "mainland_china", subject: "chemistry" },
  { graphId: "senior_secondary_mathematics", system: "mainland_china_senior_high", region: "mainland_china", subject: "mathematics" },
  { graphId: "senior_secondary_physics", system: "mainland_china_senior_high", region: "mainland_china", subject: "physics" },
  { graphId: "singapore_h2_biology", system: "singapore_h2", region: "singapore", subject: "biology" },
  { graphId: "singapore_h2_chemistry", system: "singapore_h2", region: "singapore", subject: "chemistry" },
  { graphId: "singapore_h2_mathematics", system: "singapore_h2", region: "singapore", subject: "mathematics" },
  { graphId: "singapore_h2_physics", system: "singapore_h2", region: "singapore", subject: "physics" },
  { graphId: "singapore_lower_secondary_science", system: "singapore_lower_secondary", region: "singapore", subject: "science" },
  { graphId: "singapore_secondary_mathematics", system: "singapore_secondary_g2_g3", region: "singapore", subject: "mathematics" },
] as const;

const SUBJECT_PATTERNS: Record<CurriculumSubject, RegExp> = {
  biology: /(?:生物(?:学)?|\bbiology\b)/iu,
  chemistry: /(?:化学|\bchemistry\b)/iu,
  mathematics: /(?:数学|\bmath(?:s|ematics)?\b)/iu,
  physics: /(?:物理(?:学)?|\bphysics\b)/iu,
  science: /(?:科学|\bscience\b)/iu,
};

const SYSTEM_PATTERNS: Record<CurriculumSystem, readonly RegExp[]> = {
  cambridge_international_a_level: [
    /剑桥(?:国际)?\s*a[\s-]*level/iu,
    /(?:cambridge(?:\s+international)?|international)\s+a[\s-]*level/iu,
    /(?:^|[^\p{L}])a[\s-]*level(?![\s\S]*(?:新加坡|singapore))/iu,
  ],
  mainland_china_junior_secondary: [
    /中国(?:大陆|内地)?(?:初中|初级中学)/iu,
    /(?:mainland\s+china|chinese)\s+(?:junior\s+high|lower\s+secondary)/iu,
  ],
  mainland_china_senior_high: [
    /中国(?:大陆|内地)?(?:普通)?高中/iu,
    /(?:mainland\s+china|chinese)\s+(?:senior\s+)?high\s+school/iu,
    /(?:高考|人教版|新高考)/iu,
  ],
  singapore_h2: [
    /(?:新加坡|singapore|\bsg\b)[\s\S]{0,24}(?:h2|初院|junior\s+college|a[\s-]*level)/iu,
    /(?:h2|初院|junior\s+college|a[\s-]*level)[\s\S]{0,24}(?:新加坡|singapore|\bsg\b)/iu,
  ],
  singapore_lower_secondary: [
    /(?:新加坡|singapore|\bsg\b)[\s\S]{0,24}(?:中学低年级|lower\s+secondary|lower\s+sec|中[一二])/iu,
    /(?:中学低年级|lower\s+secondary|lower\s+sec)[\s\S]{0,24}(?:新加坡|singapore|\bsg\b)/iu,
  ],
  singapore_secondary_g2_g3: [
    /(?:新加坡|singapore|\bsg\b)[\s\S]{0,24}(?:g2\s*\/\s*g3|g2|g3|secondary\s+mathematics|中学数学)/iu,
    /(?:g2\s*\/\s*g3|g2|g3)[\s\S]{0,24}(?:新加坡|singapore|\bsg\b)/iu,
  ],
};

const SYSTEM_REGIONS: Record<CurriculumSystem, CurriculumRegion> = {
  cambridge_international_a_level: "international",
  mainland_china_junior_secondary: "mainland_china",
  mainland_china_senior_high: "mainland_china",
  singapore_h2: "singapore",
  singapore_lower_secondary: "singapore",
  singapore_secondary_g2_g3: "singapore",
};

export const CURRICULUM_SYSTEM_LABELS: Record<CurriculumSystem, string> = {
  cambridge_international_a_level: "Cambridge International A Level",
  mainland_china_junior_secondary: "Mainland China junior secondary curriculum",
  mainland_china_senior_high: "Mainland China senior high curriculum",
  singapore_h2: "Singapore H2 curriculum",
  singapore_lower_secondary: "Singapore Lower Secondary curriculum",
  singapore_secondary_g2_g3: "Singapore G2/G3 curriculum",
};

const REGION_PATTERNS: Record<Exclude<CurriculumRegion, "international">, readonly RegExp[]> = {
  mainland_china: [/(?:中国大陆|中国内地|mainland\s+china)/iu],
  singapore: [/(?:新加坡|singapore|\bsg\b)/iu],
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function findSubjects(text: string): CurriculumSubject[] {
  const subjects = (Object.entries(SUBJECT_PATTERNS) as Array<[CurriculumSubject, RegExp]>)
    .filter(([subject, pattern]) => pattern.test(text) && !(subject === "science" && /\bcomputer\s+science\b/iu.test(text)))
    .map(([subject]) => subject);
  return unique(subjects);
}

function findSystems(text: string): CurriculumSystem[] {
  const systems = (Object.entries(SYSTEM_PATTERNS) as Array<[CurriculumSystem, readonly RegExp[]]>)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([system]) => system);
  if (
    systems.includes("singapore_h2") &&
    systems.includes("cambridge_international_a_level") &&
    !/(?:剑桥|cambridge|international\s+a[\s-]*level)/iu.test(text)
  ) {
    return systems.filter((system) => system !== "cambridge_international_a_level");
  }
  return systems;
}

function findRegions(text: string): CurriculumRegion[] {
  const regions: CurriculumRegion[] = (Object.entries(REGION_PATTERNS) as Array<[Exclude<CurriculumRegion, "international">, readonly RegExp[]]>)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([region]) => region);
  if (findSystems(text).includes("cambridge_international_a_level")) regions.push("international");
  return unique(regions);
}

export function detectCurriculumContext(text: string): LearnerCurriculumContext | null {
  const systems = unique(findSystems(text));
  if (systems.length === 1) {
    return { system: systems[0], region: SYSTEM_REGIONS[systems[0]] };
  }
  if (systems.length > 1) return null;
  const regions = unique(findRegions(text));
  return regions.length === 1 ? { system: null, region: regions[0] } : null;
}

export function resolveLearnerCurriculumContext(
  facts: readonly { text: string; category?: string }[],
): LearnerCurriculumContext | null {
  const eligible = facts.filter((fact) =>
    !fact.category || ["profile_context", "prior_knowledge"].includes(fact.category),
  );
  const systemContexts = eligible
    .map((fact) => detectCurriculumContext(fact.text))
    .filter((context): context is LearnerCurriculumContext => Boolean(context?.system));
  const systems = unique(systemContexts.map((context) => context.system).filter((system): system is CurriculumSystem => Boolean(system)));
  if (systems.length === 1) return systemContexts.find((context) => context.system === systems[0]) ?? null;
  if (systems.length > 1) return null;

  const regions = unique(
    eligible
      .map((fact) => detectCurriculumContext(fact.text)?.region)
      .filter((region): region is CurriculumRegion => Boolean(region)),
  );
  return regions.length === 1 ? { system: null, region: regions[0] } : null;
}

export type CurriculumRoute =
  | { kind: "none" }
  | { kind: "restricted"; graphIds: string[]; context: LearnerCurriculumContext }
  | { kind: "uncovered"; context: LearnerCurriculumContext }
  | { kind: "clarify"; graphIds: string[] };

export function resolveCurriculumRoute(input: {
  query: string;
  learnerContext?: LearnerCurriculumContext | null;
  selectedGraphId?: string;
}): CurriculumRoute {
  if (input.selectedGraphId) {
    const selected = CURRICULUM_GRAPHS.find((entry) => entry.graphId === input.selectedGraphId);
    return selected
      ? { kind: "restricted", graphIds: [selected.graphId], context: { system: selected.system, region: selected.region } }
      : { kind: "none" };
  }

  const subjects = findSubjects(input.query);
  const queryContext = detectCurriculumContext(input.query);
  const context = queryContext ?? input.learnerContext ?? null;
  let graphs = CURRICULUM_GRAPHS.filter((graph) => subjects.length === 0 || subjects.includes(graph.subject));

  if (context?.system) graphs = graphs.filter((graph) => graph.system === context.system);
  else if (context?.region) graphs = graphs.filter((graph) => graph.region === context.region);

  if (context?.system && subjects.length > 0 && graphs.length === 0) {
    return { kind: "uncovered", context };
  }

  if (context && graphs.length > 0) {
    const systems = unique(graphs.map((graph) => graph.system));
    if (systems.length > 1 && subjects.length > 0) {
      return { kind: "clarify", graphIds: graphs.map((graph) => graph.graphId) };
    }
    return { kind: "restricted", graphIds: graphs.map((graph) => graph.graphId), context };
  }

  if (subjects.length === 0) return { kind: "none" };
  const systems = unique(graphs.map((graph) => graph.system));
  return systems.length > 1
    ? { kind: "clarify", graphIds: graphs.map((graph) => graph.graphId) }
    : { kind: "none" };
}
