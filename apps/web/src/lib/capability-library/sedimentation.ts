import type { HtmlWidgetArtifact, VisualizationPlanArtifact } from "@/lib/agent-os";
import type { LearningApp } from "./types";
import { findAppByHtmlSignature, hashHtmlSource, saveApp } from "./store";

const MIN_HTML_LENGTH = 200;
const MAX_HTML_LENGTH = 80_000;

export type SedimentationContext = {
  userQuestion?: string;
  sessionId?: string;
};

export type SedimentationResult =
  | { saved: true; app: LearningApp }
  | { saved: false; reason: string };

export async function sedimentWidget(
  widget: HtmlWidgetArtifact,
  plan: VisualizationPlanArtifact | null,
  context: SedimentationContext = {},
): Promise<SedimentationResult> {
  if (!widget || widget.type !== "html_widget") {
    return { saved: false, reason: "not_a_widget" };
  }
  const title = widget.title?.trim();
  if (!title) {
    return { saved: false, reason: "empty_title" };
  }
  const html = widget.html ?? "";
  if (html.length < MIN_HTML_LENGTH) {
    return { saved: false, reason: "html_too_short" };
  }
  if (html.length > MAX_HTML_LENGTH) {
    return { saved: false, reason: "html_too_long" };
  }

  const signature = hashHtmlSource(html);
  const existing = await findAppByHtmlSignature(signature);
  if (existing) {
    return { saved: false, reason: "duplicate" };
  }

  const tags = deriveTags(widget, plan);
  const id = `app_${Date.now()}_${signature.slice(0, 6)}`;
  const now = Date.now();

  const app: LearningApp = {
    id,
    name: slugifyName(title),
    displayName: title,
    description: widget.description?.trim() || plan?.approach || undefined,
    tags,
    template: { type: "html", source: html },
    origin: {
      kind: "agent_generated",
      sourceQuestion: context.userQuestion?.trim() || undefined,
      sourceSessionId: context.sessionId,
    },
    metadata: {
      createdAt: now,
      lastUsedAt: now,
      usageCount: 1,
    },
    archivedAt: null,
    version: 1,
  };

  await saveApp(app);
  return { saved: true, app };
}

function deriveTags(
  widget: HtmlWidgetArtifact,
  plan: VisualizationPlanArtifact | null,
): string[] {
  const tags = new Set<string>(["simulation", "interactive"]);
  if (plan?.technology) {
    const tech = plan.technology.toLowerCase();
    if (/canvas|webgl|three/.test(tech)) tags.add("canvas");
    if (/svg/.test(tech)) tags.add("svg");
    if (/chart|d3/.test(tech)) tags.add("data-viz");
  }
  if (plan?.keyElements) {
    for (const elem of plan.keyElements) {
      const slug = slugifyTag(elem);
      if (slug) tags.add(slug);
    }
  }
  return Array.from(tags).slice(0, 8);
}

function slugifyName(title: string): string {
  const lower = title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return lower.slice(0, 64) || `app_${Date.now()}`;
}

function slugifyTag(value: string): string | null {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿\s-]/g, "")
    .trim();
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/).slice(0, 3).join("-");
  return words.length <= 32 ? words : null;
}
