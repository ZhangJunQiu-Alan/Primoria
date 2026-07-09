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

export async function editCourseBlock(input: EditBlockInput, settings: TutorProviderSettings = {}, ownerId?: string | null) {
  return editCourseBlockWithAi(input, settings, ownerId);
}

export async function addCourseBlock(input: AddBlockInput, settings: TutorProviderSettings = {}, ownerId?: string | null) {
  return addCourseBlockWithAi(input, settings, ownerId);
}

export async function transformCourseBlock(input: TransformBlockInput, settings: TutorProviderSettings = {}, ownerId?: string | null) {
  return transformCourseBlockWithAi(input, settings, ownerId);
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

export async function removeCourseBlock(input: RemoveCourseBlockInput, ownerId?: string | null) {
  return removeCourseBlockWithAi(input, ownerId);
}

export async function moveCourseBlock(input: MoveCourseBlockInput, ownerId?: string | null) {
  return moveCourseBlockWithAi(input, ownerId);
}

export async function draftAgentCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  settings: TutorProviderSettings = {},
) {
  return createChatCompletion(messages, settings);
}
