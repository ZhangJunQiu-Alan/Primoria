#!/usr/bin/env tsx

import { normalizeCourseMarkdownMath } from "../src/components/course/course-markdown.tsx";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function main() {
  const matrix = "A = \\begin{pmatrix}1 & 2 & 1 \\ 0 & 1 & 3 \\ 2 & 1 & 0\\end{pmatrix}";
  const normalizedMatrix = normalizeCourseMarkdownMath(matrix);
  assert(
    normalizedMatrix === "$$A = \\begin{pmatrix}1 & 2 & 1 \\\\ 0 & 1 & 3 \\\\ 2 & 1 & 0\\end{pmatrix}$$",
    "bare matrix line becomes display math and repairs single row separators",
  );

  const chineseInline = "先写出第一行的三个元素 a_{11}=1， a_{12}=2， a_{13}=1。";
  const normalizedInline = normalizeCourseMarkdownMath(chineseInline);
  assert(
    normalizedInline === "先写出第一行的三个元素 $a_{11}=1$， $a_{12}=2$， $a_{13}=1$。",
    "Chinese prose keeps text and wraps only inline formulas",
  );

  const listFormula = "- M_{11}=det\\begin{pmatrix}1&3\\1&0\\end{pmatrix}=1·0-3·1=-3";
  const normalizedList = normalizeCourseMarkdownMath(listFormula, { inlineOnly: true });
  assert(
    normalizedList === "- $M_{11}=det\\begin{pmatrix}1&3\\\\1&0\\end{pmatrix}=1·0-3·1=-3$",
    "inline-only mode keeps formula inside a list item inline and repairs compact row separators",
  );

  const existingMath = "已有公式 $a_{11}=1$ 和 $$A=\\begin{pmatrix}1&0\\end{pmatrix}$$。";
  assert(normalizeCourseMarkdownMath(existingMath) === existingMath, "existing markdown math is not double wrapped");

  const bracketMath = "我们以 \\(2^{3/2}\\) 为例，根据公式 \\(a^{m/n} = \\sqrt[n]{a^m}\\)。";
  assert(
    normalizeCourseMarkdownMath(bracketMath) === "我们以 $2^{3/2}$ 为例，根据公式 $a^{m/n} = \\sqrt[n]{a^m}$。",
    "LaTeX inline bracket delimiters are converted to remark-math dollar delimiters",
  );

  const bracketDisplayMath = "推导如下：\n\\[x^2 + y^2 = r^2\\]";
  assert(
    normalizeCourseMarkdownMath(bracketDisplayMath) === "推导如下：\n$$x^2 + y^2 = r^2$$",
    "LaTeX display bracket delimiters are converted to remark-math dollar delimiters",
  );
  assert(
    normalizeCourseMarkdownMath("\\[x^2 + y^2 = r^2\\]", { inlineOnly: true }) === "$x^2 + y^2 = r^2$",
    "inline renderers keep display bracket formulas inside inline math",
  );

  const code = "不要处理 `a_{11}=1` 或 `\\(x^2\\)`。\n```ts\nconst raw = \"\\\\begin{pmatrix}\";\n```";
  assert(normalizeCourseMarkdownMath(code) === code, "inline code and fenced code stay unchanged");

  process.stdout.write("[course-markdown-latex.unit] ALL CHECKS PASSED\n");
}

main();
