// Fire-and-forget browser reporter for visualization render telemetry.
// Deduped per browser session via sessionStorage so re-opening a chat (which
// re-mounts every historical widget) does not re-count old renders. Failures
// are swallowed — telemetry must never affect the widget itself.

export type VisualizationTelemetryEvent = {
  source: "sandbox" | "interactive";
  topic: string;
  componentId?: string | null;
  status: "rendered" | "script_error" | "config_invalid" | "api_error";
  detail?: string | null;
};

function eventKey(event: VisualizationTelemetryEvent) {
  return `viz:${event.source}:${event.topic}:${event.componentId ?? ""}:${event.status}`;
}

function hashKey(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function reportVisualizationEvent(event: VisualizationTelemetryEvent) {
  if (typeof window === "undefined") return;
  const key = eventKey(event);
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable (private mode) — still report, without dedupe.
  }
  const id = `viz_${hashKey(key)}_${Date.now().toString(36)}`;
  void fetch("/api/telemetry/visualization", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ...event }),
    keepalive: true,
  }).catch(() => undefined);
}
