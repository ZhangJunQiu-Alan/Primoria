import { and, desc, eq, gte } from "drizzle-orm";

import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { learningEvents } from "@/lib/db/schema";

const MAX_EVENTS = 50_000;
const COMMAND_WORDS = /\b(?:please|show|demonstrate|visualize|display|explain|simulate|create|make|an?|the|me)\b/gi;
const COMMAND_PHRASES = /(?:请|麻烦|帮我|给我|做一个|创建一个|演示一下|展示一下|可视化一下|演示|展示|可视化|模拟一下|模拟)/g;

export type VisualizationEventSample = {
  source: "sandbox" | "interactive";
  topic: string;
  componentId: string | null;
  status: "rendered" | "script_error" | "config_invalid" | "api_error";
};

export type VisualizationAnalytics = {
  days: 14 | 28;
  generatedAt: string;
  truncated: boolean;
  totals: {
    all: number;
    sandbox: number;
    interactive: number;
    rendered: number;
    failed: number;
  };
  sandboxClusters: Array<{
    topic: string;
    attempts: number;
    rendered: number;
    failed: number;
    examples: string[];
  }>;
  interactiveComponents: Array<{
    componentId: string;
    attempts: number;
    rendered: number;
    failed: number;
    successRate: number;
  }>;
};

function payloadString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export function normalizeVisualizationTopic(topic: string) {
  const normalized = topic
    .normalize("NFKC")
    .toLowerCase()
    .replace(COMMAND_WORDS, " ")
    .replace(COMMAND_PHRASES, " ")
    .replace(/[\s，。！？、；：,.!?;:()（）\[\]【】"“”'‘’]+/g, " ")
    .trim();
  return normalized || topic.trim().toLowerCase();
}

export function aggregateVisualizationEvents(
  events: VisualizationEventSample[],
  options: { days: 14 | 28; truncated?: boolean; generatedAt?: Date },
): VisualizationAnalytics {
  const sandbox = new Map<string, { attempts: number; rendered: number; failed: number; examples: Set<string> }>();
  const interactive = new Map<string, { attempts: number; rendered: number; failed: number }>();
  let rendered = 0;

  for (const event of events) {
    const succeeded = event.status === "rendered";
    if (succeeded) rendered += 1;
    if (event.source === "sandbox") {
      const key = normalizeVisualizationTopic(event.topic);
      const item = sandbox.get(key) ?? { attempts: 0, rendered: 0, failed: 0, examples: new Set<string>() };
      item.attempts += 1;
      item.rendered += succeeded ? 1 : 0;
      item.failed += succeeded ? 0 : 1;
      if (item.examples.size < 3) item.examples.add(event.topic);
      sandbox.set(key, item);
      continue;
    }

    const componentId = event.componentId || "unknown";
    const item = interactive.get(componentId) ?? { attempts: 0, rendered: 0, failed: 0 };
    item.attempts += 1;
    item.rendered += succeeded ? 1 : 0;
    item.failed += succeeded ? 0 : 1;
    interactive.set(componentId, item);
  }

  const sandboxCount = events.filter((event) => event.source === "sandbox").length;
  return {
    days: options.days,
    generatedAt: (options.generatedAt ?? new Date()).toISOString(),
    truncated: Boolean(options.truncated),
    totals: {
      all: events.length,
      sandbox: sandboxCount,
      interactive: events.length - sandboxCount,
      rendered,
      failed: events.length - rendered,
    },
    sandboxClusters: [...sandbox.entries()]
      .map(([topic, item]) => ({ ...item, topic, examples: [...item.examples] }))
      .sort((left, right) => right.attempts - left.attempts || left.topic.localeCompare(right.topic)),
    interactiveComponents: [...interactive.entries()]
      .map(([componentId, item]) => ({
        componentId,
        ...item,
        successRate: item.attempts ? item.rendered / item.attempts : 0,
      }))
      .sort((left, right) => right.attempts - left.attempts || left.componentId.localeCompare(right.componentId)),
  };
}

export async function getVisualizationAnalytics(days: 14 | 28): Promise<VisualizationAnalytics> {
  if (!hasDatabaseUrl()) return aggregateVisualizationEvents([], { days });
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await getDb()
    .select({ payload: learningEvents.payload })
    .from(learningEvents)
    .where(and(eq(learningEvents.type, "visualization.render"), gte(learningEvents.createdAt, cutoff)))
    .orderBy(desc(learningEvents.createdAt))
    .limit(MAX_EVENTS + 1);
  const truncated = rows.length > MAX_EVENTS;
  const events = rows.slice(0, MAX_EVENTS).flatMap((row): VisualizationEventSample[] => {
    const source = payloadString(row.payload, "source");
    const topic = payloadString(row.payload, "topic");
    const status = payloadString(row.payload, "status");
    if (
      (source !== "sandbox" && source !== "interactive") ||
      !topic ||
      (status !== "rendered" && status !== "script_error" && status !== "config_invalid" && status !== "api_error")
    ) {
      return [];
    }
    return [{ source, topic, status, componentId: payloadString(row.payload, "component_id") }];
  });
  return aggregateVisualizationEvents(events, { days, truncated });
}
