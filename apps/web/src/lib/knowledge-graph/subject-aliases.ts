import { getTopicGraph, listTopicGraphIds } from "./topic-graph";

export const KG_SUBJECT_ZH: Record<string, string> = {
  a_level_biology: "生物学",
  a_level_chemistry: "化学",
  a_level_mathematics: "数学",
  a_level_physics: "物理学",
  artificial_intelligence: "人工智能",
  computer_architecture: "计算机体系结构",
  computer_network: "计算机网络",
  computer_systems: "计算机系统",
  data_structures_and_algorithms: "数据结构与算法",
  deep_learning: "深度学习",
  discrete_math_and_probability: "离散数学与概率论",
  information_theory: "信息论",
  introduction_to_computer_science: "计算机科学导论",
  linear_algebra: "线性代数",
  machine_learning: "机器学习",
  mit_calculus: "微积分",
  numerical_analysis: "数值分析",
  python_fundamentals: "Python 基础",
  sicp_cs61a: "计算机程序的构造与解释",
  software_construction: "软件构造",
  web_applications: "Web 应用开发",
};

const EXTRA_ALIASES: Record<string, string[]> = {
  linear_algebra: ["线代"],
  data_structures_and_algorithms: ["data structures and algorithms", "数据结构和算法"],
  introduction_to_computer_science: ["intro to computer science"],
  python_fundamentals: ["python fundamentals"],
};

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s_]+/gu, "");
}

export function findExplicitSubjectGraphIds(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const matches: Array<{ graphId: string; length: number }> = [];
  for (const graphId of listTopicGraphIds()) {
    const graph = getTopicGraph(graphId);
    const aliases = [graph.subject, graphId, KG_SUBJECT_ZH[graphId], ...(EXTRA_ALIASES[graphId] ?? [])].filter(
      (alias): alias is string => Boolean(alias),
    );
    const longest = aliases.map(normalize).filter((alias) => alias.length >= 3 && normalized.includes(alias)).sort((a, b) => b.length - a.length)[0];
    if (longest) matches.push({ graphId, length: longest.length });
  }
  return matches.sort((a, b) => b.length - a.length || a.graphId.localeCompare(b.graphId)).map((match) => match.graphId);
}

export function findPrimarySubjectGraphId(query: string): string | null {
  const all = findExplicitSubjectGraphIds(query);
  if (all.length <= 1) return all[0] ?? null;

  const chinesePurpose = query.match(/(?:面向|用于|为了)[\s\S]*的([^，。！？!?]+)$/);
  if (chinesePurpose) {
    const inPrimaryClause = findExplicitSubjectGraphIds(chinesePurpose[1]);
    if (inPrimaryClause.length > 0) return inPrimaryClause[0];
  }

  const englishPurposeIndex = query.search(/\b(?:for|through|oriented toward|centered on)\b/i);
  if (englishPurposeIndex > 0) {
    const beforePurpose = findExplicitSubjectGraphIds(query.slice(0, englishPurposeIndex));
    if (beforePurpose.length > 0) return beforePurpose[0];
  }

  return null;
}

export function hasGoalScopeModifier(query: string) {
  return /面向|用于|为了|通过.+(?:学习|理解)|以.+为(?:核心|重点)|\bfor\b|\boriented toward\b|\bcentered on\b|\bthrough\b/i.test(
    query,
  );
}

export function hasCompositionConnector(query: string) {
  return /以及|并且|同时|结合|与.+(?:一起|结合)|和.+(?:使用|应用|开发|部署|设计)|\band\b|\btogether with\b|\bcombine\b/i.test(query);
}
