import { z } from "zod";
import type { ImplementedComponent } from "./types";

const TimelineEventSchema = z.object({
  id: z.string().min(1).max(48),
  label: z.string().min(1).max(100),
  dateLabel: z.string().min(1).max(48),
  summary: z.string().min(1).max(280),
});

const CausalLinkSchema = z.object({
  fromEventId: z.string().min(1).max(48),
  toEventId: z.string().min(1).max(48),
  explanation: z.string().min(1).max(280),
});

const DEFAULT_EVENTS = [
  { id: "event-1", label: "Initial condition", dateLabel: "Phase 1", summary: "The situation before change." },
  { id: "event-2", label: "Turning point", dateLabel: "Phase 2", summary: "A change redirects what follows." },
  { id: "event-3", label: "Outcome", dateLabel: "Phase 3", summary: "The later consequence." },
];

const DEFAULT_LINKS = [
  { fromEventId: "event-1", toEventId: "event-2", explanation: "The initial condition makes the turning point possible." },
  { fromEventId: "event-2", toEventId: "event-3", explanation: "The turning point changes the final outcome." },
];

export const TimelineCausalityConfigSchema = z.object({
  timelineTitle: z.string().min(1).max(120).default("A sequence of connected events"),
  events: z.array(TimelineEventSchema).min(2).max(12).default(DEFAULT_EVENTS),
  causalLinks: z.array(CausalLinkSchema).min(1).max(16).default(DEFAULT_LINKS),
});

export type TimelineCausalityConfig = z.infer<typeof TimelineCausalityConfigSchema>;

export const TimelineCausalityPatchSchema = z
  .object({
    timelineTitle: z.string().min(1).max(120),
    events: z.array(TimelineEventSchema).min(2).max(12),
    causalLinks: z.array(CausalLinkSchema).min(1).max(16),
  })
  .partial();

export const DEFAULT_TIMELINE_CAUSALITY_CONFIG = TimelineCausalityConfigSchema.parse({});

export function deriveTimelineCausality(config: TimelineCausalityConfig) {
  const eventIds = new Set(config.events.map((event) => event.id));
  const validLinks = config.causalLinks.filter(
    (link) => eventIds.has(link.fromEventId) && eventIds.has(link.toEventId) && link.fromEventId !== link.toEventId,
  );
  const invalidLinks = config.causalLinks.filter((link) => !validLinks.includes(link));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const link of validLinks) {
    outgoing.set(link.fromEventId, (outgoing.get(link.fromEventId) ?? 0) + 1);
    incoming.set(link.toEventId, (incoming.get(link.toEventId) ?? 0) + 1);
  }
  return {
    events: config.events.map((event, index) => ({
      ...event,
      order: index + 1,
      incoming: incoming.get(event.id) ?? 0,
      outgoing: outgoing.get(event.id) ?? 0,
    })),
    validLinks,
    invalidLinks,
  };
}

export const timelineCausalityComponent: ImplementedComponent = {
  implemented: true,
  componentId: "general.timeline-causality",
  name: "因果时间线",
  catalogDescription: "按时间排列事件,区分先后关系、直接因果与转折点",
  configSchema: TimelineCausalityConfigSchema,
  patchSchema: TimelineCausalityPatchSchema,
  schemaDoc: `general.timeline-causality 的 config 字段(全部字段都有默认值,只写有把握的字段):
- timelineTitle: 时间线标题,1~120 字符,默认 "A sequence of connected events"
- events: 2~12 个按时间顺序排列的事件;每项含 id、label、dateLabel、summary,整体替换
- causalLinks: 1~16 条直接因果关系;每项含 fromEventId、toEventId、explanation,整体替换`,
  patchHints: `「补上转折点」同时更新 events 与确实涉及该事件的 causalLinks;「说明它为什么发生」优先更新 causalLinks,不要把时间先后自动当作因果。`,
};
