import { supabase } from '@/lib/supabase';
import { captureViewerError } from '@/shared/platform/observability';
import { runtimeEnv } from '@/shared/config/runtimeEnv';

export type ViewerAnalyticsEventType = 'course_view' | 'lesson_started';

interface TrackViewerAnalyticsInput {
  courseId: string;
  lessonId?: string | null;
}

const trackedRouteEvents = new Set<string>();

type RpcResponse = {
  data: boolean | null;
  error: Error | null;
};

async function invokeTrackViewerAnalyticsEvent(
  eventType: ViewerAnalyticsEventType,
  payload: TrackViewerAnalyticsInput,
) {
  return (supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResponse>)('track_viewer_analytics_event', {
    p_event_type: eventType,
    p_course_id: payload.courseId,
    p_lesson_id: payload.lessonId ?? null,
  });
}

export async function trackViewerAnalyticsEvent(
  eventType: ViewerAnalyticsEventType,
  payload: TrackViewerAnalyticsInput,
) {
  if (runtimeEnv.fixtureMode || !payload.courseId) {
    return false;
  }

  const { error, data } = await invokeTrackViewerAnalyticsEvent(eventType, payload);
  if (error) {
    captureViewerError(error, {
      area: 'viewer_analytics_event',
      eventType,
      courseId: payload.courseId,
      lessonId: payload.lessonId ?? null,
    });
    return false;
  }

  return Boolean(data);
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
