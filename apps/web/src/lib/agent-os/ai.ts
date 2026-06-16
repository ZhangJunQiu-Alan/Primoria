import type {
  AddBlockInput,
  EditBlockInput,
  TransformBlockInput,
} from "../ai/deepagent/course-editor";
import {
  addBlock as addCourseBlockWithAi,
  editBlock as editCourseBlockWithAi,
  moveCourseBlock as moveCourseBlockWithAi,
  removeCourseBlock as removeCourseBlockWithAi,
  transformBlock as transformCourseBlockWithAi,
} from "../ai/deepagent/course-editor";
import {
  generateCourse as generateCourseWithAi,
  type GenerateCourseInput,
  type GenerateCourseResult,
} from "../ai/deepagent/course-generator";
import {
  createTutorModel,
  resolveProviderSettings,
} from "./model";
import { createChatCompletion } from "../ai/openai-compatible";
import {
  runTutorAgent as runTutorAgentWithAi,
  runTutorAgentStream as runTutorAgentStreamWithAi,
} from "../ai/tutor-agent";
import type { ChatMessage, TutorProviderSettings } from "@primoria/contracts/chat";
import type { TutorAgentResponse, TutorStreamEvent } from "@primoria/contracts/stream";

export { createTutorModel, resolveProviderSettings };
export type { TutorStreamEvent };

export type RemoveCourseBlockInput = {
  courseId: string;
  blockId: string;
  instruction?: string;
};

export type MoveCourseBlockInput = {
  courseId: string;
  blockId: string;
  toIndex: number;
  instruction?: string;
};

export async function runTutorAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
): Promise<TutorAgentResponse> {
  return runTutorAgentWithAi(messages, settings);
}

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  return runTutorAgentStreamWithAi(messages, settings, emit);
}

export async function generateCourse(
  input: GenerateCourseInput,
  settings: TutorProviderSettings = {},
): Promise<GenerateCourseResult> {
  return generateCourseWithAi(input, settings);
}

export async function editCourseBlock(input: EditBlockInput, settings: TutorProviderSettings = {}) {
  return editCourseBlockWithAi(input, settings);
}

export async function addCourseBlock(input: AddBlockInput, settings: TutorProviderSettings = {}) {
  return addCourseBlockWithAi(input, settings);
}

export async function transformCourseBlock(input: TransformBlockInput, settings: TutorProviderSettings = {}) {
  return transformCourseBlockWithAi(input, settings);
}

export async function removeCourseBlock(input: RemoveCourseBlockInput) {
  return removeCourseBlockWithAi(input);
}

export async function moveCourseBlock(input: MoveCourseBlockInput) {
  return moveCourseBlockWithAi(input);
}

export async function draftAgentCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  settings: TutorProviderSettings = {},
) {
  return createChatCompletion(messages, settings);
}
