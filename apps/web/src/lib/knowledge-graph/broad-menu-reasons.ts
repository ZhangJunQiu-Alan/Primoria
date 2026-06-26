import { z } from "zod";

import { messageContentToString, parseJsonValue, withTimeout } from "../ai/course-generation/model-json";
import { createUtilityModel } from "../ai/deepagent/model";
import { isZhLanguage, type KgLanguage } from "./display-name";
import type { BroadMenuItem } from "./positioning";

const ReasonSchema = z.object({
  reasons: z.array(z.object({
    topicId: z.string().min(1),
    reason: z.string().min(1),
  })),
});

export type BroadMenuItemWithReason = BroadMenuItem & { reason: string };

export type BroadMenuReasonModelInvoker = (input: {
  system: string;
  user: string;
  timeoutMs: number;
}) => Promise<unknown>;

function topicConceptNames(item: BroadMenuItem, limit = 6) {
  return item.concepts
    .map((concept) => concept.name.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function joinNatural(items: string[], language: KgLanguage) {
  if (items.length === 0) return "";
  if (isZhLanguage(language)) return items.join("、");
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function fallbackBroadMenuReason(item: BroadMenuItem, language: KgLanguage): string {
  const concepts = topicConceptNames(item, 2);
  if (isZhLanguage(language)) {
    if (concepts.length === 0) return "这个入口和你的学习目标相关，可以作为更具体的起点。";
    return `这个入口覆盖 ${joinNatural(concepts, language)}，可以帮助你衔接当前学习目标。`;
  }
  if (concepts.length === 0) return "This entry is related to your goal and can work as a more specific starting point.";
  return `This entry covers ${joinNatural(concepts, language)}, helping connect your goal to a concrete starting point.`;
}

function normalizeReason(reason: string, language: KgLanguage) {
  const cleaned = reason
    .replace(/\s+/g, " ")
    .replace(/^[-*•]\s*/, "")
    .trim();
  const maxLength = isZhLanguage(language) ? 72 : 160;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

async function defaultReasonModelInvoker(input: {
  system: string;
  user: string;
  timeoutMs: number;
}): Promise<unknown> {
  const model = createUtilityModel(
    {},
    {
      temperature: 0,
      maxTokens: 700,
      timeoutMs: input.timeoutMs,
    },
  );
  const result = await withTimeout(
    model.invoke([
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ]),
    input.timeoutMs,
    "broad menu reason generation timed out",
  );
  return parseJsonValue(messageContentToString(result.content));
}

export async function enrichBroadMenuReasons(
  input: {
    query: string;
    language: KgLanguage;
    menu: BroadMenuItem[];
    timeoutMs?: number;
  },
  invokeModel: BroadMenuReasonModelInvoker = defaultReasonModelInvoker,
): Promise<BroadMenuItemWithReason[]> {
  const withFallback = input.menu.map((item) => ({
    ...item,
    reason: fallbackBroadMenuReason(item, input.language),
  }));
  if (withFallback.length === 0) return withFallback;

  const system = isZhLanguage(input.language)
    ? [
        "你是 Primoria 的学习入口解释器。",
        "只解释候选 topic 为什么适合用户这次的学习目标。",
        "每个 reason 写一句中文, 不超过 60 个汉字左右。",
        "不要定义术语, 不要承诺系统没有的功能, 不要输出 Markdown。",
        "只输出 JSON: {\"reasons\":[{\"topicId\":\"...\",\"reason\":\"...\"}]}",
      ].join("\n")
    : [
        "You explain why each candidate learning entry matches the learner's current goal.",
        "Write one concise sentence per topic, about 25 words or fewer.",
        "Do not define the topic, do not promise unavailable features, and do not output Markdown.",
        "Output JSON only: {\"reasons\":[{\"topicId\":\"...\",\"reason\":\"...\"}]}",
      ].join("\n");

  const user = JSON.stringify({
    query: input.query,
    language: input.language,
    topics: input.menu.map((item) => ({
      topicId: item.topicId,
      name: item.name,
      concepts: topicConceptNames(item),
    })),
  });

  try {
    const raw = await invokeModel({
      system,
      user,
      timeoutMs: input.timeoutMs ?? 8_000,
    });
    const parsed = ReasonSchema.safeParse(raw);
    if (!parsed.success) return withFallback;

    const reasonByTopicId = new Map(
      parsed.data.reasons.map((item) => [item.topicId, normalizeReason(item.reason, input.language)]),
    );
    return withFallback.map((item) => ({
      ...item,
      reason: reasonByTopicId.get(item.topicId) || item.reason,
    }));
  } catch {
    return withFallback;
  }
}
