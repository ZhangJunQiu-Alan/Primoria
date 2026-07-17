import { after, NextResponse } from "next/server";
import { z } from "zod";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { pruneVisualizationTelemetry, recordLearningEvent } from "@/lib/learning-events/store";
import {
  sanitizeVisualizationTelemetryText,
  shouldPruneVisualizationTelemetry,
} from "@/lib/telemetry/visualization-privacy";

// Visualization telemetry ingest. One row per render outcome; `sandbox` rows
// are catalog misses and drive interactive-component catalog expansion.
// Client supplies a deterministic id so retried reports count once.
const VisualizationEventSchema = z.object({
  id: z.string().min(1).max(120).regex(/^viz_[a-zA-Z0-9_-]+$/),
  source: z.enum(["sandbox", "interactive"]),
  topic: z.string().trim().min(1).max(300),
  componentId: z.string().max(100).nullish(),
  status: z.enum(["rendered", "script_error", "config_invalid", "api_error"]),
  detail: z.string().max(500).nullish(),
});

export async function POST(request: Request) {
  const { denied, user } = await requireConfiguredAuthUser("visualization-telemetry");
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = VisualizationEventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid telemetry payload" }, { status: 400 });

  await recordLearningEvent({
    type: "visualization.render",
    ownerId: user.id,
    id: parsed.data.id,
    source: parsed.data.source,
    topic: sanitizeVisualizationTelemetryText(parsed.data.topic, 160),
    componentId: parsed.data.componentId ?? null,
    status: parsed.data.status,
    detail: parsed.data.detail ? sanitizeVisualizationTelemetryText(parsed.data.detail, 240) : null,
  });
  if (shouldPruneVisualizationTelemetry(parsed.data.id)) {
    const retentionDays = Math.max(1, Number(process.env.VISUALIZATION_TELEMETRY_RETENTION_DAYS ?? 90));
    after(() => pruneVisualizationTelemetry(retentionDays));
  }
  return NextResponse.json({ ok: true });
}
