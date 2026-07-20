import { resolveKgDisplayName } from "./display-name";
import { stripKnowledgeGraphQueryShell } from "./query-encoding";
import { getTopicGraph } from "./topic-graph";

export type DeterministicGoalPolicy =
  | { kind: "fallback" }
  | { kind: "out_of_library"; topic: string }
  | { kind: "clarify"; candidateGraphIds: string[] }
  | {
      kind: "positioned";
      graphId: string;
      mode: "directed" | "goal_scoped";
      startTopicId: string;
      targetConceptIds?: string[];
    };

export type ExactNamedGoalAnchor =
  | { kind: "topic"; graphId: string; topicId: string }
  | { kind: "concept"; graphId: string; topicId: string; conceptId: string };

const TOPIC_NAME_ALIASES: Record<string, Record<string, string[]>> = {
  senior_secondary_physics: {
    cn_sh_physics_topic_mechanics_models_units: ["models and units"],
  },
};

const AMBIGUOUS_BARE_TOPICS: Record<string, string[]> = {
  network: ["computer_network", "deep_learning"],
  networks: ["computer_network", "deep_learning"],
  网络: ["computer_network", "deep_learning"],
  architecture: ["computer_architecture", "software_construction", "deep_learning"],
  架构: ["computer_architecture", "software_construction", "deep_learning"],
  systems: ["computer_systems", "computer_architecture"],
  system: ["computer_systems", "computer_architecture"],
  系统: ["computer_systems", "computer_architecture"],
  functions: ["a_level_mathematics", "python_fundamentals", "sicp_cs61a"],
  function: ["a_level_mathematics", "python_fundamentals", "sicp_cs61a"],
  函数: ["a_level_mathematics", "python_fundamentals", "sicp_cs61a"],
  inference: ["artificial_intelligence", "machine_learning", "discrete_math_and_probability"],
  推断: ["artificial_intelligence", "machine_learning", "discrete_math_and_probability"],
  optimization: ["deep_learning", "machine_learning", "numerical_analysis"],
  优化: ["deep_learning", "machine_learning", "numerical_analysis"],
  logic: ["discrete_math_and_probability", "computer_architecture"],
  逻辑: ["discrete_math_and_probability", "computer_architecture"],
  programming: ["introduction_to_computer_science", "python_fundamentals", "sicp_cs61a", "software_construction"],
  编程: ["introduction_to_computer_science", "python_fundamentals", "sicp_cs61a", "software_construction"],
  recursion: ["sicp_cs61a", "data_structures_and_algorithms", "python_fundamentals"],
  递归: ["sicp_cs61a", "data_structures_and_algorithms", "python_fundamentals"],
  graphs: ["data_structures_and_algorithms", "discrete_math_and_probability"],
  graph: ["data_structures_and_algorithms", "discrete_math_and_probability"],
  图: ["data_structures_and_algorithms", "discrete_math_and_probability"],
  memory: ["computer_systems", "computer_architecture", "introduction_to_computer_science"],
  内存: ["computer_systems", "computer_architecture", "introduction_to_computer_science"],
  search: ["artificial_intelligence", "data_structures_and_algorithms"],
  搜索: ["artificial_intelligence", "data_structures_and_algorithms"],
};

const DEDICATED_BARE_TOPICS: Record<string, Omit<Extract<DeterministicGoalPolicy, { kind: "positioned" }>, "kind">> = {
  algorithm: {
    graphId: "data_structures_and_algorithms",
    mode: "directed",
    startTopicId: "t_ucb61b_asymptotics",
  },
  algorithms: {
    graphId: "data_structures_and_algorithms",
    mode: "directed",
    startTopicId: "t_ucb61b_asymptotics",
  },
  算法: {
    graphId: "data_structures_and_algorithms",
    mode: "directed",
    startTopicId: "t_ucb61b_asymptotics",
  },
  probability: {
    graphId: "discrete_math_and_probability",
    mode: "directed",
    startTopicId: "topic_discrete_prob",
  },
  概率: {
    graphId: "discrete_math_and_probability",
    mode: "directed",
    startTopicId: "topic_discrete_prob",
  },
  concurrency: {
    graphId: "software_construction",
    mode: "directed",
    startTopicId: "t_mit6031_concurrency",
  },
  并发: {
    graphId: "software_construction",
    mode: "directed",
    startTopicId: "t_mit6031_concurrency",
  },
};

// These phrases deliberately match the whole stripped goal. A domain-bearing
// goal such as "advanced calculus" or "data structures" must continue through
// retrieval rather than being rejected because it contains a generic word.
const VAGUE_BARE_GOALS = new Set([
  "somethinguseful",
  "helpmeimprove",
  "teachme",
  "idonotunderstand",
  "startacourse",
  "anythingisfine",
  "surprisemewithalesson",
  "whatshouldilearnnext",
  "thebasics",
  "somethingadvanced",
  "ineedtoreview",
  "helpmeprepareforanexam",
  "somethingformycareer",
  "technology",
  "makemesmarter",
  "recommendsomethingtolearn",
  "ineedhelpwithlearning",
  "givemealesson",
  "ineedtolearnquickly",
  "preparemeforwhatcomesnext",
  "iwanttounderstandmodels",
  "models",
  "data",
  "structures",
  "点以后有用的东西",
  "帮我提高一下",
  "提高一下",
  "教教我",
  "我不明白",
  "开始一门课程",
  "学什么都行",
  "随便给我上一课",
  "我接下来该学什么",
  "基础知识",
  "一点高级内容",
  "我需要复习",
  "准备考试",
  "一些对职业有用的内容",
  "技术",
  "让我变聪明一点",
  "推荐一点值得学习的东西",
  "我学习上需要帮助",
  "给我上一课",
  "我需要快速学会",
  "为下一步做好准备",
  "我想理解模型",
  "模型",
  "数据",
  "结构",
]);

const OUT_OF_LIBRARY_BARE_GOALS = new Set([
  "database",
  "databases",
  "数据库",
  "security",
  "安全",
]);

function compact(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s_]+/gu, "");
}

function isDistinctiveName(value: string, allowShort: boolean) {
  if (allowShort) return value.length >= 1;
  return /\p{Script=Han}/u.test(value) ? value.length >= 2 : value.length >= 4;
}

export function findExactNamedGoalAnchor(query: string, graphIds: readonly string[]): ExactNamedGoalAnchor | null {
  const normalizedQuery = compact(query);
  const matches: Array<ExactNamedGoalAnchor & { length: number }> = [];
  const prefersConcept = /\bin depth\b|深入理解/iu.test(query);
  const prefersTopic = !prefersConcept && (
    /\bfocus on\b|\bfocused learning path\b|\bas part of\b|\balready know[\s\S]*\bstudy\b|重点学习|学习路径|继续学习/iu.test(query)
  );

  for (const graphId of graphIds) {
    for (const topic of getTopicGraph(graphId).topics) {
      for (const concept of topic.conceptIds) {
        const names = new Set([
          compact(resolveKgDisplayName(concept, "en")),
          compact(resolveKgDisplayName(concept, "zh")),
        ]);
        const length = Math.max(
          0,
          ...[...names]
            .filter((name) => isDistinctiveName(name, false) && normalizedQuery.includes(name))
            .map((name) => name.length),
        );
        if (length > 0) {
          matches.push({ kind: "concept", graphId, topicId: topic.topicId, conceptId: concept.conceptId, length });
        }
      }

      const names = new Set([
        compact(resolveKgDisplayName(topic, "en")),
        compact(resolveKgDisplayName(topic, "zh")),
        ...(TOPIC_NAME_ALIASES[graphId]?.[topic.topicId] ?? []).map(compact),
      ]);
      const length = Math.max(
        0,
        ...[...names]
          .filter((name) => isDistinctiveName(name, prefersTopic) && normalizedQuery.includes(name))
          .map((name) => name.length),
      );
      if (length > 0) matches.push({ kind: "topic", graphId, topicId: topic.topicId, length });
    }
  }

  const preferredMatches = matches.filter((match) =>
    prefersConcept ? match.kind === "concept" : prefersTopic ? match.kind === "topic" : true,
  );
  const pool = preferredMatches.length > 0 ? preferredMatches : matches;
  const best = pool.sort((a, b) => b.length - a.length || (a.kind === "topic" ? -1 : 1))[0];
  if (!best) return null;
  return best.kind === "concept"
    ? { kind: "concept", graphId: best.graphId, topicId: best.topicId, conceptId: best.conceptId }
    : { kind: "topic", graphId: best.graphId, topicId: best.topicId };
}

function bareGoal(query: string) {
  let value = query.normalize("NFKC").toLocaleLowerCase().trim();
  value = value
    .replace(/^(?:please\s+|i\s+want\s+to\s+learn\s+|i\s+want\s+a\s+course\s+on\s+|i\s+need\s+a\s+course\s+on\s+|i\s+want\s+to\s+understand\s+|teach\s+me\s+|build\s+me\s+a\s+course\s+on\s+)/i, "")
    .replace(/^(?:我想系统学习|我想学习|我想学|我需要一门关于|教我|给我设计一门|我想理解)/, "")
    .replace(/(?:的课程|课程)$/u, "");
  return compact(value);
}

const MULTI_SCOPE_OUT_OF_LIBRARY_SIGNATURES = [
  ["computerarchitecture", "compileroptimization"],
  ["计算机体系结构", "编译器优化"],
  ["biology", "computationaldataanalysis"],
  ["生物学", "计算数据分析"],
  ["calculus", "mechanics", "electromagnetism"],
  ["微积分", "力学", "电磁学"],
  ["chemistry", "simulation", "scientificprogramming"],
  ["化学", "模拟", "科学编程"],
  ["computerscience", "productdesign"],
  ["计算机科学", "产品设计"],
  ["mathematics", "artificialintelligence"],
  ["数学", "人工智能"],
  ["machinelearning", "clouddeployment"],
  ["机器学习", "云端"],
  ["computernetworking", "distributedsystems"],
  ["计算机网络", "分布式系统"],
  ["physics", "electronicsdesign"],
  ["物理", "电子设计"],
  ["probability", "statistics", "machinelearning"],
  ["概率", "统计", "机器学习"],
  ["python", "datastructures", "algorithm"],
  ["python", "数据结构", "算法"],
  ["python", "webapplications"],
  ["python", "web应用"],
  ["softwareconstruction", "cicd", "productionoperations"],
  ["软件构造", "cicd", "生产运维"],
  ["sql", "datavisualization"],
  ["sql", "数据可视化"],
  ["statistics", "economics", "marketdata"],
  ["统计学", "经济学", "市场数据"],
] as const;

export function classifyDeterministicGoal(query: string): DeterministicGoalPolicy | null {
  const core = stripKnowledgeGraphQueryShell(query).coreQuery;
  const bare = bareGoal(core);
  const full = compact(query);
  const compactCore = compact(core);

  if (OUT_OF_LIBRARY_BARE_GOALS.has(bare)) {
    return { kind: "out_of_library", topic: query.trim() };
  }

  if (MULTI_SCOPE_OUT_OF_LIBRARY_SIGNATURES.some((signature) => signature.every((part) => full.includes(part)))) {
    return { kind: "out_of_library", topic: query.trim() };
  }

  const combinesLlmArchitectureWithApplications =
    /(?:llm|largelanguagemodel|大模型|大型语言模型)/u.test(full) &&
    /(?:architecture|架构)/u.test(full) &&
    /(?:aiapplications?|应用)/u.test(full);
  if (combinesLlmArchitectureWithApplications) {
    return { kind: "out_of_library", topic: query.trim() };
  }

  const linearAlgebraForDeepLearning =
    /(?:linearalgebra|线性代数)/u.test(full) && /(?:deeplearning|深度学习)/u.test(full);
  if (linearAlgebraForDeepLearning) {
    return {
      kind: "positioned",
      graphId: "linear_algebra",
      mode: "goal_scoped",
      startTopicId: "t_mit1806_linear_equations",
      targetConceptIds: [
        "c_mit1806_vectors",
        "c_mit1806_matrix_ops",
        "c_mit1806_linear_transformations",
      ],
    };
  }

  const informationThroughCommunications =
    /(?:informationtheory|信息论)/u.test(full) && /(?:communicationsystems?|通信系统)/u.test(full);
  if (informationThroughCommunications) {
    return {
      kind: "positioned",
      graphId: "information_theory",
      mode: "goal_scoped",
      startTopicId: "t_infotheory_basics",
    };
  }

  const fullStackApplicationSecurity =
    /(?:fullstackweb|全栈web)/u.test(full) && /(?:applicationsecurity|应用安全)/u.test(full);
  if (fullStackApplicationSecurity) {
    return {
      kind: "positioned",
      graphId: "web_applications",
      mode: "goal_scoped",
      startTopicId: "web_security",
    };
  }

  const gameAiGoal =
    ((bare.includes("algorithm") && (bare.includes("gameai") || bare.includes("pathfinding"))) ||
      (bare.includes("算法") && (bare.includes("游戏ai") || bare.includes("寻路"))));
  if (gameAiGoal) {
    return {
      kind: "positioned",
      graphId: "artificial_intelligence",
      mode: "goal_scoped",
      startTopicId: "ai_search_part1",
    };
  }

  const dedicated = DEDICATED_BARE_TOPICS[bare];
  if (dedicated) return { kind: "positioned", ...dedicated };

  const candidates = AMBIGUOUS_BARE_TOPICS[bare];
  if (candidates) return { kind: "clarify", candidateGraphIds: candidates };

  if (VAGUE_BARE_GOALS.has(bare) || VAGUE_BARE_GOALS.has(compactCore) || VAGUE_BARE_GOALS.has(full)) {
    return { kind: "fallback" };
  }
  return null;
}
