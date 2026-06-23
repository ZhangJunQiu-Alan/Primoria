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
  createTutorModel,
  resolveProviderSettings,
} from "./model";
import { createChatCompletion } from "../ai/openai-compatible";
import type { ChatMessage, TutorProviderSettings } from "@primoria/contracts/chat";
import type { TutorAgentResponse, TutorStreamEvent } from "@primoria/contracts/stream";

export { createTutorModel, resolveProviderSettings };
export type { TutorStreamEvent };

export async function editCourseBlock(input: EditBlockInput, settings: TutorProviderSettings = {}) {
  return editCourseBlockWithAi(input, settings);
}

export async function addCourseBlock(input: AddBlockInput, settings: TutorProviderSettings = {}) {
  return addCourseBlockWithAi(input, settings);
}

export async function transformCourseBlock(input: TransformBlockInput, settings: TutorProviderSettings = {}) {
  return transformCourseBlockWithAi(input, settings);
}

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
