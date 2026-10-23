import { INTERACTIVE_COMPONENT_CATALOG, INTERACTIVE_CATALOG_HASH } from "./interactive-catalog.mjs";

const normalize = (value) => value.normalize("NFKC").toLowerCase();
const disciplineKey = (value) => ({ math: "mathematics", chem: "chemistry", cs: "computer-science", "物理": "physics", "化学": "chemistry", "生物": "biology", "数学": "mathematics", "计算机": "computer-science", "计算机科学": "computer-science", "语文": "language", "地理": "geography", "自然科学": "natural-science", "小学奥数": "primary-olympiad", "社会科学": "social-science", "公共政策": "public-policy", "public policy": "public-policy", "social sciences": "social-science", "文学": "literature", "历史": "history", "艺术": "arts", "音乐": "music", "天文": "astronomy", "统计": "statistics" })[normalize(value).trim()] ?? normalize(value).trim();
const stageKey = (value) => ({ "小学": "primary", "初中": "junior", "高中": "senior", "大学": "university", "本科": "university", "入门": "starter", "high school": "senior", "middle school": "junior" })[normalize(value).trim()] ?? normalize(value).trim();
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
const stop = new Set(["the", "a", "an", "to", "of", "and", "with", "show", "me", "please", "一下", "一个", "这个", "看看", "演示", "展示", "可视化", "如何", "为什么", "可以", "我要", "帮我"]);
function words(value) {
  return [...new Set([...segmenter.segment(normalize(value))].filter((part) => part.isWordLike && !stop.has(part.segment)).map((part) => part.segment))];
}

const indexed = INTERACTIVE_COMPONENT_CATALOG.map((entry) => {
  const main = normalize([entry.componentId, ...Object.values(entry.names), ...(entry.search.aliases ?? []), ...(entry.search.concepts ?? [])].join(" "));
  const text = normalize([main, ...Object.values(entry.descriptions), ...Object.values(entry.purpose), ...entry.disciplines, ...entry.capabilities, ...(entry.search.supports ?? []), ...entry.examples.flatMap(Object.values)].join(" "));
  return { entry, main, text, terms: new Set(words(text)) };
});
const frequencies = new Map();
for (const document of indexed) for (const term of document.terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);

export function searchInteractiveComponents({ query, discipline, stage, limit = 6 }) {
  const terms = words(query.slice(0, 2000)).slice(0, 80);
  if (!terms.length) return [];
  const max = Math.max(1, Math.min(10, Math.trunc(limit) || 6));
  const disciplines = discipline?.split(/[,，/|;；]/).map(disciplineKey);
  const candidates = indexed.filter(({ entry }) => (!disciplines || entry.disciplines.some((value) => disciplines.includes(disciplineKey(value))))
    && (!stage || !entry.search.stages?.length || entry.search.stages.some((value) => stageKey(value) === stageKey(stage))));
  return candidates.map(({ entry, main, text, terms: documentTerms }) => {
    const matches = terms.filter((term) => documentTerms.has(term) || text.includes(term));
    const score = matches.reduce((sum, term) => {
      const frequency = frequencies.get(term) ?? 1;
      return sum + (main.includes(term) ? 3 : 1) * (1 + Math.log(1 + indexed.length / Math.max(1, frequency)));
    }, 0);
    return {
      componentId: entry.componentId, configVersion: entry.version, name: entry.name,
      description: entry.description, disciplines: entry.disciplines,
      supports: entry.search.supports ?? [],
      exclusions: [...entry.exclusions.flatMap(Object.values), ...(entry.search.excludes ?? [])],
      score: Math.round(score * 100) / 100, matchedTerms: matches,
    };
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || a.componentId.localeCompare(b.componentId)).slice(0, max);
}

export function formatInteractiveDirectory() {
  const groups = new Map();
  for (const entry of INTERACTIVE_COMPONENT_CATALOG) {
    const group = disciplineKey(entry.disciplines[0]);
    groups.set(group, (groups.get(group) ?? 0) + 1);
  }
  return [...groups].map(([discipline, count]) => `- ${discipline}: ${count} teaching components`).join("\n");
}

export { INTERACTIVE_CATALOG_HASH, disciplineKey as normalizeInteractiveDiscipline };
