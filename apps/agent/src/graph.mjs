// Composition point for the primoria_tutor graph. Tool implementations,
// prompts, middleware, and model wiring live in their own modules; only the
// createDeepAgent assembly happens here. Cross-runtime Zod schemas come from
// @primoria/contracts/artifacts/schemas.
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { createModel } from "./model.mjs";
import { SYSTEM_PROMPT, subagents } from "./prompts.mjs";
import {
  PrimoriaContextSchema,
  primoriaContextMiddleware,
  primoriaCourseDetailMiddleware,
  primoriaHistoryTrimMiddleware,
} from "./middleware.mjs";
import {
  planVisualizationTool,
  render3dSceneTool,
  stemRendererTool,
  widgetRendererTool,
} from "./tools/visualization.mjs";
import {
  renderAlgorithmTool,
  renderChartTool,
  renderDiagramTool,
  renderGraphTool,
  renderMathExplorerTool,
  renderMoleculeTool,
  renderPhysicsSceneTool,
  renderWaveTool,
} from "./tools/renderers.mjs";
import { getCourseCardTool, positionLearningGoalTool } from "./tools/course.mjs";
import { openInteractiveComponentTool } from "./tools/interactive.mjs";
import { renderChatQuizTool } from "./tools/quiz.mjs";

/** @param {{ checkpointer?: any }} [options] */
export function createPrimoriaGraph({ checkpointer = new MemorySaver() } = {}) {
  return createDeepAgent({
    name: "primoria-tutor",
    model: createModel(),
    tools: [
      planVisualizationTool,
      widgetRendererTool,
      renderChatQuizTool,
      getCourseCardTool,
      renderChartTool,
      renderDiagramTool,
      renderPhysicsSceneTool,
      render3dSceneTool,
      renderAlgorithmTool,
      renderMathExplorerTool,
      renderWaveTool,
      renderGraphTool,
      renderMoleculeTool,
      stemRendererTool,
      positionLearningGoalTool,
      openInteractiveComponentTool,
    ],
    systemPrompt: SYSTEM_PROMPT,
    subagents,
    middleware: [primoriaContextMiddleware, primoriaHistoryTrimMiddleware, primoriaCourseDetailMiddleware],
    contextSchema: PrimoriaContextSchema,
    checkpointer,
    backend: new FilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
    skills: ["/skills/"],
  });
}

export const graph = createPrimoriaGraph();
