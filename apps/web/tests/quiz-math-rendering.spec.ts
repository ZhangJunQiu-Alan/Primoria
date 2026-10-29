// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { BlockRenderer } from "../src/components/course/block-renderer";
import type { QuizBlock } from "../src/lib/courses/types";

const matrix = String.raw`$\begin{bmatrix} 11 \\ 1 \end{bmatrix}$`;
const block: QuizBlock = {
  id: "linear-combination-quiz",
  type: "quiz",
  title: "Linear combinations",
  questions: [
    {
      id: "single", kind: "single",
      question: String.raw`Let $\mathbf{u}=\begin{bmatrix}1\\2\end{bmatrix}$ and $\mathbf{v}=\begin{bmatrix}3\\-1\end{bmatrix}$. Compute $2\mathbf{u}+3\mathbf{v}$.`,
      choices: [{ id: "a", text: matrix }, { id: "b", text: String.raw`$\begin{bmatrix}11\\7\end{bmatrix}$` }],
      correctId: "a",
      explanation: String.raw`$2\mathbf{u}+3\mathbf{v}=\begin{bmatrix}2+9\\4-3\end{bmatrix}=\begin{bmatrix}11\\1\end{bmatrix}$.`,
    },
    {
      id: "multi", kind: "multi", question: "Choose equivalent values.",
      choices: [{ id: "a", text: "$2+2=4$" }, { id: "b", text: "$2+2=5$" }], correctIds: ["a"],
      explanation: "**Addition:** $2+2=4$.",
    },
    { id: "truefalse", kind: "truefalse", question: "$1+1=2$", correct: true, explanation: "$1+1=2$ is true." },
  ],
};

describe("quiz formula rendering", () => {
  it("renders matrix questions, single/multiple choices and explanations while preserving selection and grading", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(BlockRenderer, { block, contentLanguage: "en" })));
      const questions = container.querySelectorAll(".course-quiz-question");
      expect(questions).toHaveLength(3);
      const prompt = questions[0].querySelector(".course-quiz-q-text")!;
      expect(prompt.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(3);
      const firstChoice = questions[0].querySelector(".course-quiz-choice")!;
      expect(firstChoice.querySelector(".katex .mtable")).not.toBeNull();
      expect(firstChoice.querySelector(".katex-error")).toBeNull();
      expect(firstChoice.querySelector(".katex-html")!.textContent).not.toContain("\\begin");
      expect(questions[1].querySelector(".course-quiz-choice .katex")).not.toBeNull();
      expect(questions[2].querySelector(".course-quiz-q-text .katex")).not.toBeNull();
      expect(container.querySelector(".course-quiz-explanation")).toBeNull();
      for (const question of questions) await act(async () => (question.querySelector(".course-quiz-choice") as HTMLButtonElement).click());
      expect(firstChoice.classList.contains("selected")).toBe(true);
      await act(async () => (container.querySelector(".course-quiz-submit") as HTMLButtonElement).click());
      expect(container.querySelectorAll(".course-quiz-question.is-correct")).toHaveLength(3);
      expect(container.querySelectorAll(".course-quiz-explanation .katex")).toHaveLength(3);
      expect((firstChoice as HTMLButtonElement).disabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});
