import { getTopicGraph, listTopicGraphIds } from "./topic-graph";

export const KG_SUBJECT_EN: Record<string, string> = {
  a_level_biology: "Cambridge International A-Level Biology",
  a_level_chemistry: "Cambridge International A-Level Chemistry",
  a_level_mathematics: "Cambridge International A-Level Mathematics",
  a_level_physics: "Cambridge International A-Level Physics",
  senior_secondary_biology: "Mainland China Senior High School Biology",
  senior_secondary_chemistry: "Mainland China Senior High School Chemistry",
  senior_secondary_mathematics: "Mainland China Senior High School Mathematics",
  senior_secondary_physics: "Mainland China Senior High School Physics",
  singapore_h2_biology: "Singapore H2 Biology",
  singapore_h2_chemistry: "Singapore H2 Chemistry",
  singapore_h2_mathematics: "Singapore H2 Mathematics",
  singapore_h2_physics: "Singapore H2 Physics",
  singapore_lower_secondary_science: "Singapore Lower Secondary Science",
  singapore_secondary_mathematics: "Singapore Secondary G2/G3 Mathematics",
};

export const KG_SUBJECT_ZH: Record<string, string> = {
  a_level_biology: "剑桥国际 A-Level 生物学",
  a_level_chemistry: "剑桥国际 A-Level 化学",
  a_level_mathematics: "剑桥国际 A-Level 数学",
  a_level_physics: "剑桥国际 A-Level 物理学",
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
  senior_secondary_biology: "中国普通高中生物学",
  senior_secondary_chemistry: "中国普通高中化学",
  senior_secondary_mathematics: "中国普通高中数学",
  senior_secondary_physics: "中国普通高中物理学",
  sicp_cs61a: "计算机程序的构造与解释",
  singapore_h2_biology: "新加坡 H2 生物学",
  singapore_h2_chemistry: "新加坡 H2 化学",
  singapore_h2_mathematics: "新加坡 H2 数学",
  singapore_h2_physics: "新加坡 H2 物理学",
  singapore_lower_secondary_science: "新加坡中学低年级科学",
  singapore_secondary_mathematics: "新加坡中学 G2/G3 数学",
  software_construction: "软件构造",
  web_applications: "Web 应用开发",
};

const EXTRA_ALIASES: Record<string, string[]> = {
  a_level_biology: ["生物学"],
  a_level_chemistry: ["化学"],
  a_level_mathematics: ["数学"],
  a_level_physics: ["物理", "物理学"],
  linear_algebra: ["线代"],
  data_structures_and_algorithms: ["data structures and algorithms", "数据结构和算法"],
  introduction_to_computer_science: ["intro to computer science"],
  python_fundamentals: ["python fundamentals"],
  senior_secondary_biology: ["生物学"],
  senior_secondary_chemistry: ["化学"],
  senior_secondary_mathematics: ["数学"],
  senior_secondary_physics: ["物理", "物理学"],
  singapore_h2_biology: ["生物学"],
  singapore_h2_chemistry: ["化学"],
  singapore_h2_mathematics: ["数学"],
  singapore_h2_physics: ["物理", "物理学"],
  singapore_lower_secondary_science: ["科学"],
  singapore_secondary_mathematics: ["数学"],
};

export function getKnowledgeGraphSubjectLabel(graphId: string, language: "en" | "zh") {
  if (language === "zh") return KG_SUBJECT_ZH[graphId] ?? getTopicGraph(graphId).subject ?? graphId;
  return KG_SUBJECT_EN[graphId] ?? getTopicGraph(graphId).subject ?? graphId;
}

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s_]+/gu, "");
}

export function findExplicitSubjectGraphIds(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const matches: Array<{ graphId: string; length: number }> = [];
  for (const graphId of listTopicGraphIds()) {
    const graph = getTopicGraph(graphId);
    const aliases = [
      graph.subject,
      graphId,
      KG_SUBJECT_EN[graphId],
      KG_SUBJECT_ZH[graphId],
      ...(EXTRA_ALIASES[graphId] ?? []),
    ].filter((alias): alias is string => Boolean(alias));
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
