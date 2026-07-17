import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const FENCED_CODE_BLOCK_RE = /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g;
const INLINE_CODE_RE = /(`+)([\s\S]*?)\1/g;
const DISPLAY_MATH_RE = /\$\$[\s\S]*?\$\$/g;
const INLINE_MATH_RE = /(?<!\\)\$(?!\$)(?:\\.|[^$\\\n])+(?<!\\)\$/g;
const DISPLAY_BRACKET_MATH_RE = /(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g;
const INLINE_BRACKET_MATH_RE = /(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g;
const BRACKET_MATH_CUE_RE = /(?<!\\)\\(?:\(|\[)/;
const PROTECTED_PREFIX = "\uE000primoria-protected-";
const PROTECTED_SUFFIX = "\uE001";

type ProtectedPart = {
  token: string;
  value: string;
};

const LATEX_COMMANDS = new Set([
  "alpha",
  "approx",
  "bar",
  "begin",
  "beta",
  "cdot",
  "cos",
  "delta",
  "det",
  "end",
  "epsilon",
  "exp",
  "frac",
  "gamma",
  "ge",
  "hat",
  "infty",
  "int",
  "lambda",
  "le",
  "lim",
  "ln",
  "log",
  "matrix",
  "mp",
  "mu",
  "neq",
  "omega",
  "overline",
  "pi",
  "pm",
  "prod",
  "rightarrow",
  "sigma",
  "sin",
  "sqrt",
  "sum",
  "tan",
  "theta",
  "times",
  "to",
  "underline",
  "vec",
]);

const markdownComponents: Components = {
  a({ children, ...props }) {
    return (
      <a {...props} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="course-markdown-table-wrap">
        <table {...props}>{children}</table>
      </div>
    );
  },
  pre({ children, ...props }) {
    return (
      <pre {...props} className="course-markdown-pre">
        {children}
      </pre>
    );
  },
  code({ children, className, ...props }) {
    const isInline = !className;
    return (
      <code {...props} className={isInline ? "course-markdown-inline-code" : className}>
        {children}
      </code>
    );
  },
};

function protectWith(text: string, pattern: RegExp, protectedParts: ProtectedPart[], scope = "segment") {
  return text.replace(pattern, (match) => {
    const token = `${PROTECTED_PREFIX}${scope}-${protectedParts.length}${PROTECTED_SUFFIX}`;
    protectedParts.push({ token, value: match });
    return token;
  });
}

function restoreProtected(text: string, protectedParts: ProtectedPart[]) {
  return protectedParts.reduce(
    (result, part) => result.split(part.token).join(part.value),
    text,
  );
}

function hasBareLatexCue(text: string) {
  return /\\begin\{|[_^]\{[^}\n]+\}|\\[A-Za-z]+/.test(text);
}

function isLatexCommandAt(text: string, index: number) {
  if (text[index] !== "\\") return false;
  const match = text.slice(index + 1).match(/^[A-Za-z]+/);
  return Boolean(match && LATEX_COMMANDS.has(match[0]));
}

function findLatexCue(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if ((char === "_" || char === "^") && text[index + 1] === "{") return index;
    if (isLatexCommandAt(text, index)) return index;
  }
  return -1;
}

function isMathBoundary(char: string) {
  return /[\u3400-\u9fff，。；、！？：]/.test(char) || char === "," || char === ";" || char === ":";
}

function hasMathOperator(text: string) {
  return /[=+\-*/^_\\{}()&|<>]/.test(text);
}

function refineMathStart(text: string, start: number, cue: number) {
  const prefix = text.slice(start, cue);
  if (!/\s/.test(prefix) || hasMathOperator(prefix)) return start;
  const lastSpace = Math.max(prefix.lastIndexOf(" "), prefix.lastIndexOf("\t"));
  return lastSpace >= 0 ? start + lastSpace + 1 : start;
}

function refineMathEnd(text: string, start: number, end: number) {
  const span = text.slice(start, end);
  const plainTextSuffix = span.match(/^([\s\S]*?[=+\-*/^_\\{}()&|<>][\s\S]*?)(\s+[A-Za-z][A-Za-z\s]{2,})$/);
  if (!plainTextSuffix) return end;
  return start + plainTextSuffix[1].length;
}

function expandMathSpan(text: string, cue: number) {
  let start = cue;
  let end = cue + 1;

  while (start > 0 && !isMathBoundary(text[start - 1])) start -= 1;
  while (end < text.length && !isMathBoundary(text[end])) end += 1;

  start = refineMathStart(text, start, cue);
  end = refineMathEnd(text, start, end);

  return { start, end };
}

function looksLikeLatexFormula(formula: string) {
  return (
    formula.length >= 3
    && !formula.includes(PROTECTED_PREFIX)
    && (
      /\\begin\{/.test(formula)
      || /[_^]\{[^}\n]+\}/.test(formula)
      || /\\(?:[A-Za-z]+)\b/.test(formula)
    )
  );
}

function normalizeLatexFormula(formula: string) {
  return formula.replace(/\\begin\{([A-Za-z*]+)\}([\s\S]*?)\\end\{\1\}/g, (_match, environment: string, body: string) => {
    const repairedBody = body
      .replace(/(?<!\\)\\\s+(?=\S)/g, "\\\\ ")
      .replace(/(?<!\\)\\(?=[-+0-9(])/g, "\\\\");
    return `\\begin{${environment}}${repairedBody}\\end{${environment}}`;
  });
}

function wrapBareLatexContent(content: string, inlineOnly: boolean) {
  if (!hasBareLatexCue(content)) return content;

  let output = "";
  let cursor = 0;

  while (cursor < content.length) {
    const cue = findLatexCue(content, cursor);
    if (cue === -1) break;

    let { start, end } = expandMathSpan(content, cue);
    start = Math.max(start, cursor);

    const rawSpan = content.slice(start, end);
    const leading = rawSpan.match(/^\s*/)?.[0] ?? "";
    const trailing = rawSpan.match(/\s*$/)?.[0] ?? "";
    const formula = rawSpan.trim();

    if (!looksLikeLatexFormula(formula)) {
      cursor = cue + 1;
      continue;
    }

    const coversWholeContent = content.slice(0, start).trim() === "" && content.slice(end).trim() === "";
    const repairedFormula = normalizeLatexFormula(formula);
    const delimiter = !inlineOnly && coversWholeContent && /\\begin\{(?:[pbvBV]?matrix|smallmatrix|array|cases)\}/.test(repairedFormula)
      ? "$$"
      : "$";

    output += content.slice(cursor, start);
    output += `${leading}${delimiter}${repairedFormula}${delimiter}${trailing}`;
    cursor = end;
  }

  return output + content.slice(cursor);
}

function wrapBareLatexLine(line: string, inlineOnly: boolean) {
  const match = line.match(/^(\s*(?:>\s*)?(?:[-*+]\s+|\d+[.)]\s+)?)([\s\S]*)$/);
  if (!match) return wrapBareLatexContent(line, inlineOnly);
  return `${match[1]}${wrapBareLatexContent(match[2], inlineOnly)}`;
}

function normalizeMarkdownSegmentMath(markdown: string, inlineOnly: boolean) {
  const protectedParts: ProtectedPart[] = [];
  let normalized = protectWith(markdown, INLINE_CODE_RE, protectedParts);
  normalized = normalized.replace(
    DISPLAY_BRACKET_MATH_RE,
    (_match, formula: string) => inlineOnly ? `$${formula}$` : `$$${formula}$$`,
  );
  normalized = normalized.replace(INLINE_BRACKET_MATH_RE, (_match, formula: string) => `$${formula}$`);
  normalized = protectWith(normalized, DISPLAY_MATH_RE, protectedParts);
  normalized = protectWith(normalized, INLINE_MATH_RE, protectedParts);
  normalized = normalized
    .split("\n")
    .map((line) => wrapBareLatexLine(line, inlineOnly))
    .join("\n");
  return restoreProtected(normalized, protectedParts);
}

export function normalizeCourseMarkdownMath(markdown: string, options: { inlineOnly?: boolean } = {}) {
  if (!hasBareLatexCue(markdown) && !BRACKET_MATH_CUE_RE.test(markdown)) return markdown;

  const protectedParts: ProtectedPart[] = [];
  const protectedMarkdown = protectWith(markdown, FENCED_CODE_BLOCK_RE, protectedParts, "fence");
  const normalized = normalizeMarkdownSegmentMath(protectedMarkdown, Boolean(options.inlineOnly));
  return restoreProtected(normalized, protectedParts);
}

export function CourseMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  const normalizedMarkdown = normalizeCourseMarkdownMath(markdown);
  return (
    <div className={["course-markdown", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  );
}

const inlineMarkdownComponents: Components = {
  ...markdownComponents,
  p({ children }) {
    return <>{children}</>;
  },
};

export function CourseInlineMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  const normalizedMarkdown = normalizeCourseMarkdownMath(markdown, { inlineOnly: true });
  return (
    <span className={["course-markdown", "course-markdown-inline", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inlineMarkdownComponents}
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </span>
  );
}
