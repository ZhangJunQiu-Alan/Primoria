import { supabase } from '@/shared/api/supabase';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';

export type InteractiveVisualAnalyticsEvent = {
  surface: 'lesson' | 'ai-tutor' | 'builder-preview';
  courseId?: string | null;
  lessonId?: string | null;
  blockId: string;
  interactionType: 'view' | 'input' | 'action' | 'custom';
  eventName: string;
  payload?: Record<string, unknown>;
};

const LOCAL_STORAGE_KEY = 'primoria.viewer.interactive-visual-events';
const LOCAL_STORAGE_LIMIT = 250;

type RpcResponse = {
  data: boolean | null;
  error: Error | null;
};

function persistInteractiveVisualAnalyticsLocal(event: InteractiveVisualAnalyticsEvent) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const next = [
      ...existing.slice(-(LOCAL_STORAGE_LIMIT - 1)),
      {
        ...event,
        occurredAt: new Date().toISOString(),
      },
    ];
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore local fallback persistence errors.
  }
}

async function invokeTrackInteractiveVisualEvent(event: InteractiveVisualAnalyticsEvent) {
  return (supabase.rpc as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResponse>)('track_interactive_visual_event', {
    p_surface: event.surface,
    p_course_id: event.courseId ?? null,
    p_lesson_id: event.lessonId ?? null,
    p_block_id: event.blockId,
    p_interaction_type: event.interactionType,
    p_event_name: event.eventName,
    p_payload: event.payload ?? {},
  });
}

export async function trackInteractiveVisualAnalyticsEvent(event: InteractiveVisualAnalyticsEvent) {
  captureViewerEvent('viewer_interactive_visual_event', {
    surface: event.surface,
    blockId: event.blockId,
    interactionType: event.interactionType,
    eventName: event.eventName,
  });

  try {
    const { data, error } = await invokeTrackInteractiveVisualEvent(event);
    if (error || !data) {
      throw error ?? new Error('Interactive visual analytics could not be saved.');
    }
    return true;
  } catch (error) {
    captureViewerError(error, {
      area: 'interactive_visual_analytics',
      surface: event.surface,
      blockId: event.blockId,
      interactionType: event.interactionType,
      eventName: event.eventName,
    });
    persistInteractiveVisualAnalyticsLocal(event);
    return false;
  }
}
