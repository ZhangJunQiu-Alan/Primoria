import { INTERACTIVE_COMPONENT_CATALOG, INTERACTIVE_CATALOG_HASH } from "./interactive-catalog.mjs";

const normalize = (value) => value.normalize("NFKC").toLowerCase();
const disciplineKey = (value) => ({ math: "mathematics", chem: "chemistry", cs: "computer-science", "物理": "physics", "化学": "chemistry", "生物": "biology", "数学": "mathematics", "计算机": "computer-science", "计算机科学": "computer-science", "语文": "language", "地理": "geography", "自然科学": "natural-science", "小学奥数": "primary-olympiad", "社会科学": "social-science", "公共政策": "public-policy", "public policy": "public-policy", "social sciences": "social-science", "文学": "literature", "历史": "history", "艺术": "arts", "音乐": "music", "天文": "astronomy", "统计": "statistics" })[normalize(value).trim()] ?? normalize(value).trim();
const stageKey = (value) => ({ "小学": "primary", "初中": "junior", "高中": "senior", "大学": "university", "本科": "university", "入门": "starter", "high school": "senior", "middle school": "junior" })[normalize(value).trim()] ?? normalize(value).trim();
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
const stop = new Set([
  "the", "a", "an", "to", "of", "and", "or", "with", "show", "me", "my", "please", "i", "you", "we", "it", "its", "is", "are", "be", "in", "on", "at", "for", "by", "as", "if", "so",
  "how", "what", "why", "when", "which", "want", "see", "look", "looks", "can", "could", "would", "should", "do", "does", "this", "that", "these", "those", "let", "lets", "about", "from", "into",
  "some", "any", "use", "using", "make", "give", "help", "like", "just", "also", "then", "there", "here", "explain", "demonstrate", "demo", "visualize", "visualise", "visualization",
  "一下", "一个", "这个", "看看", "演示", "展示", "可视化", "如何", "为什么", "可以", "我要", "帮我",
  "的", "了", "和", "与", "及", "是", "在", "把", "被", "会", "吗", "呢", "吧", "啊", "怎么", "怎样", "什么", "哪些", "一些", "里",
  "我", "你", "我们", "请", "给", "让", "要", "想", "能", "就", "也", "都", "还", "再", "用", "有",
]);
const CJK = /[㐀-鿿豈-﫿]/;
const ASCII_WORD = /^[a-z][a-z-]*$/;

function words(value) {
  return [...new Set([...segmenter.segment(normalize(value))]
    .filter((part) => part.isWordLike && !stop.has(part.segment) && !/^\d+(?:\.\d+)?$/.test(part.segment) && !(part.segment.length === 1 && ASCII_WORD.test(part.segment)))
    .map((part) => part.segment))];
}

// One matcher for both scoring and document frequency. CJK terms may match a
// substring because Chinese segmentation is not stable across phrasings; ASCII
// terms match whole words or a close inflection ("rate"/"rates"), never an
// arbitrary substring ("ion" inside "motion").
function matches(term, field) {
  if (field.terms.has(term)) return true;
  if (CJK.test(term)) return field.text.includes(term);
  if (!ASCII_WORD.test(term) || term.length < 4) return false;
  for (const candidate of field.terms) {
    if (candidate.length < 4 || Math.abs(candidate.length - term.length) > 3) continue;
    if (candidate.startsWith(term) || term.startsWith(candidate)) return true;
  }
  return false;
}

const field = (text) => ({ text, terms: new Set(words(text)) });
const indexed = INTERACTIVE_COMPONENT_CATALOG.map((entry) => {
  const mainText = normalize([entry.componentId, ...Object.values(entry.names), ...(entry.search.aliases ?? []), ...(entry.search.concepts ?? [])].join(" "));
  const allText = normalize([mainText, ...Object.values(entry.descriptions), ...Object.values(entry.purpose), ...entry.disciplines, ...entry.capabilities, ...(entry.search.supports ?? []), ...entry.examples.flatMap(Object.values)].join(" "));
  return { entry, main: field(mainText), all: field(allText) };
});

export function searchInteractiveComponents({ query, discipline, stage, limit = 6 }) {
  const terms = words(query.slice(0, 2000)).slice(0, 80);
  if (!terms.length) return [];
  const max = Math.max(1, Math.min(10, Math.trunc(limit) || 6));
  const disciplines = discipline?.split(/[,，/|;；]/).map(disciplineKey);
  const candidates = indexed.filter(({ entry }) => (!disciplines || entry.disciplines.some((value) => disciplines.includes(disciplineKey(value))))
    && (!stage || !entry.search.stages?.length || entry.search.stages.some((value) => stageKey(value) === stageKey(stage))));
  const idf = new Map(terms.map((term) => [term, 1 + Math.log(1 + indexed.length / Math.max(1, indexed.filter((document) => matches(term, document.all)).length))]));
  return candidates.map(({ entry, main, all }) => {
    const matched = terms.filter((term) => matches(term, all));
    const score = matched.reduce((sum, term) => sum + (matches(term, main) ? 3 : 1) * idf.get(term), 0);
    return {
      componentId: entry.componentId, configVersion: entry.version, name: entry.name,
      description: entry.description, disciplines: entry.disciplines,
      supports: entry.search.supports ?? [],
      exclusions: [...entry.exclusions.flatMap(Object.values), ...(entry.search.excludes ?? [])],
      score: Math.round(score * 100) / 100, matchedTerms: matched,
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
