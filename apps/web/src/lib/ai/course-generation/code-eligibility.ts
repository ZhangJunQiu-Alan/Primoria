import type { CourseContext } from "../deepagent/course-kg-context";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function courseSubjectText(kg: CourseContext): string {
  return normalizeText([
    kg.graphId,
    kg.startTopic.topicId,
    kg.startTopic.name,
    ...(kg.startTopic.concepts ?? []).map((concept) => `${concept.name} ${concept.conceptId}`),
  ].join(" "));
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

// Subject-level allowance is intentionally conservative. It can be triggered
// by KG/topic/course metadata for clearly code-adapted domains, but not by
// ambiguous everyday words such as "implement" or "实现".
const CODE_SUBJECT_PATTERNS: RegExp[] = [
  /\bcomputer[_\s-]?(science|systems?|architecture|networks?)\b/,
  /\bcs\b/,
  /\bcoding\b/,
  /\bprogramming\b/,
  /\bprogramming[_\s-]?languages?\b/,
  /\bsoftware[_\s-]?(engineering|development|construction|architecture)\b/,
  /\bweb[_\s-]?(applications?|development|engineering|programming)\b/,
  /\bfront[-_\s]?end\b/,
  /\bback[-_\s]?end\b/,
  /\bapis?\b/,
  /\balgorithms?\b/,
  /\balgorithmic\b/,
  /\bdata[_\s-]?structures?\b/,
  /\bnumerical[_\s-]?(analysis|computing|methods?)\b/,
  /\bscientific[_\s-]?computing\b/,
  /\bmachine[_\s-]?learning[_\s-]?(implementation|engineering|systems?|ops)\b/,
  /\bdeep[_\s-]?learning[_\s-]?(implementation|engineering|systems?|ops)\b/,
  /\bml[_\s-]?(implementation|engineering|systems?|ops)\b/,
  /\b(python|javascript|typescript|java|c\+\+|c#|rust|golang|kotlin|swift|sql)\b/,
  /计算机科学|计算机系统|计算机体系结构|计算机网络/,
  /编程|程序设计|代码|软件工程|软件开发|网页开发|前端|后端/,
  /算法|数据结构/,
  /数值计算|数值分析|科学计算/,
  /机器学习(?:实现|工程|系统|实践)|深度学习(?:实现|工程|系统|实践)/,
];

// User/context override requires an explicit code action or programming
// language request. Bare "implement/实现" is never enough.
const EXPLICIT_CODE_INTENT_PATTERNS: RegExp[] = [
  /写(?:一段|点|个)?代码/,
  /运行(?:一下|一段|这些)?代码/,
  /跑(?:一下)?代码/,
  /代码实现/,
  /实现(?:一个|一下|这个|该)?(?:算法|函数|接口|api|类|方法|模型|程序|代码|脚本|组件|模块|训练循环|神经网络|排序|搜索)/,
  /(?:算法|函数|接口|api|类|方法|模型|程序|代码|脚本|组件|模块|训练循环|神经网络)(?:的)?实现/,
  /(?:用|使用|学习|学)\s*(?:python|javascript|typescript|java|c\+\+|c#|rust|go|golang|kotlin|swift|sql)/,
  /\bwrite\b.{0,30}\bcode\b/,
  /\brun\b.{0,30}\bcode\b/,
  /\bcode[_\s-]?(implementation|example|snippet)\b/,
  /\bimplement(?:ing|ation)?\b.{0,40}\b(algorithm|function|api|interface|class|method|model|program|script|component|module|training loop|neural network)\b/,
  /\b(learn|use|using|with|in)\s+(python|javascript|typescript|java|c\+\+|c#|rust|go|golang|kotlin|swift|sql)\b/,
  /\b(python|javascript|typescript|java|c\+\+|c#|rust|go|golang|kotlin|swift|sql)\s+(code|implementation|script|example)\b/,
];

export function isCodeEligibleSubjectText(text: string | null | undefined): boolean {
  return matchesAny(normalizeText(text), CODE_SUBJECT_PATTERNS);
}

export function hasExplicitCodeIntent(text: string | null | undefined): boolean {
  return matchesAny(normalizeText(text), EXPLICIT_CODE_INTENT_PATTERNS);
}

export function isCodeEligibleLessonContext(kg: CourseContext, contextHint?: string | null): boolean {
  return isCodeEligibleSubjectText(courseSubjectText(kg)) || hasExplicitCodeIntent(contextHint);
}

export function isCodeEligibleTopicOrGoal(text: string | null | undefined): boolean {
  return isCodeEligibleSubjectText(text) || hasExplicitCodeIntent(text);
}
