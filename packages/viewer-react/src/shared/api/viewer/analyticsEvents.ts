import { fetchAgentJson } from '@/shared/api/agentService';
import { captureViewerError } from '@/shared/platform/observability';
import { runtimeEnv } from '@/shared/config/runtimeEnv';

export type ViewerAnalyticsEventType = 'course_view' | 'lesson_started';

interface TrackViewerAnalyticsInput {
  courseId: string;
  lessonId?: string | null;
}

const trackedRouteEvents = new Set<string>();

async function invokeTrackViewerAnalyticsEvent(
  eventType: ViewerAnalyticsEventType,
  payload: TrackViewerAnalyticsInput,
) {
  return fetchAgentJson<{ ok: boolean }>('/v1/viewer/analytics-events/track', {
    method: 'POST',
    body: JSON.stringify({
      eventType,
      courseId: payload.courseId,
      lessonId: payload.lessonId ?? null,
    }),
  });
}

export async function trackViewerAnalyticsEvent(
  eventType: ViewerAnalyticsEventType,
  payload: TrackViewerAnalyticsInput,
) {
  if (runtimeEnv.fixtureMode || !payload.courseId) {
    return false;
  }

  try {
    const { ok } = await invokeTrackViewerAnalyticsEvent(eventType, payload);
    return Boolean(ok);
  } catch (error) {
    captureViewerError(error, {
      area: 'viewer_analytics_event',
      eventType,
      courseId: payload.courseId,
      lessonId: payload.lessonId ?? null,
    });
    return false;
  }
}

export function trackViewerAnalyticsEventOnce(
  routeKey: string,
  eventType: ViewerAnalyticsEventType,
  payload: TrackViewerAnalyticsInput,
) {
  if (!routeKey || trackedRouteEvents.has(routeKey)) {
    return;
  }

  trackedRouteEvents.add(routeKey);
  void trackViewerAnalyticsEvent(eventType, payload).then((ok) => {
    if (!ok) {
      trackedRouteEvents.delete(routeKey);
    }
  });
}
