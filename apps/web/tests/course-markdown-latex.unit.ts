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

  const code = "不要处理 `a_{11}=1`。\n```ts\nconst raw = \"\\\\begin{pmatrix}\";\n```";
  assert(normalizeCourseMarkdownMath(code) === code, "inline code and fenced code stay unchanged");

  process.stdout.write("[course-markdown-latex.unit] ALL CHECKS PASSED\n");
}

main();
