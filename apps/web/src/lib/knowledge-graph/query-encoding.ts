export const DEFAULT_KG_QUERY_PREFIX = "学习目标检索:";

export type EncodedKnowledgeGraphQuery = {
  rawQuery: string;
  normalizedQuery: string;
  coreQuery: string;
  embeddingQuery: string;
  prefix: string;
  appliedRules: string[];
};

const LEADING_PATTERNS: Array<[RegExp, string]> = [
  [/^(请问|请|麻烦你?|帮我|能不能|可以|please)\s*/i, "leading_polite"],
  [/^(我想要?学习|我想学|我想了解|想要?学习|想学|学习一下|学一下)\s*/i, "leading_learn_intent"],
  [/^(教我|讲讲|讲解一下|讲一下|帮我讲讲|帮我看看)\s*/i, "leading_teach_intent"],
  [/^(我不会|不会|不懂|我不懂)\s*/i, "leading_confusion"],
  [/^(什么是|啥是|何为)\s*/i, "leading_what_is"],
  [/^(如何求|怎么求|怎样求|如何理解|怎么理解)\s*/i, "leading_how_to"],
  [/^求(?=(极限|面积|体积|弧长|最值|最大值|最小值|收敛半径|收敛区间|导数|切线|法线))/i, "leading_solve_verb"],
  [/^(i want to learn|learn about|teach me|explain|what is|how to)\s+/i, "leading_english_intent"],
];

const TRAILING_PATTERNS: Array<[RegExp, string]> = [
  [/\s*(这个|这个知识点|这个概念)?\s*(怎么用|怎么做|怎么求|怎么理解)$/i, "trailing_how_to"],
  [/\s*(是什么|是啥|什么意思|的意思)$/i, "trailing_what_is"],
  [/\s*(讲一下|讲讲|解释一下|说明一下|介绍一下)$/i, "trailing_explain"],
  [/\s*(怎么学|如何学|学习方法)$/i, "trailing_study_method"],
  [/\s*(please|for me|to me)$/i, "trailing_english_polite"],
];

function normalizeQueryText(query: string) {
  return query
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u3000\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`，,。.!！?？:：;；、]+|[\s"'`，,。.!！?？:：;；、]+$/g, "")
    .trim();
}

function stripOnce(value: string, patterns: Array<[RegExp, string]>, appliedRules: string[]) {
  let current = value;

  for (const [pattern, ruleName] of patterns) {
    const next = normalizeQueryText(current.replace(pattern, ""));
    if (next && next !== current) {
      current = next;
      appliedRules.push(ruleName);
      break;
    }
  }

  return current;
}

export function stripKnowledgeGraphQueryShell(rawQuery: string) {
  const normalizedQuery = normalizeQueryText(rawQuery);
  const appliedRules: string[] = [];
  let coreQuery = normalizedQuery;

  for (let i = 0; i < 3; i += 1) {
    const before = coreQuery;
    coreQuery = stripOnce(coreQuery, LEADING_PATTERNS, appliedRules);
    coreQuery = stripOnce(coreQuery, TRAILING_PATTERNS, appliedRules);
    if (coreQuery === before) break;
  }

  if (coreQuery.length < 2) {
    coreQuery = normalizedQuery;
    appliedRules.push("fallback_raw_query");
  }

  return {
    normalizedQuery,
    coreQuery,
    appliedRules,
  };
}

export function encodeKnowledgeGraphQuery(
  rawQuery: string,
  options: {
    prefix?: string;
  } = {},
): EncodedKnowledgeGraphQuery {
  const prefix = options.prefix ?? DEFAULT_KG_QUERY_PREFIX;
  const { normalizedQuery, coreQuery, appliedRules } = stripKnowledgeGraphQueryShell(rawQuery);

  return {
    rawQuery,
    normalizedQuery,
    coreQuery,
    embeddingQuery: `${prefix} ${coreQuery}`,
    prefix,
    appliedRules,
  };
}
