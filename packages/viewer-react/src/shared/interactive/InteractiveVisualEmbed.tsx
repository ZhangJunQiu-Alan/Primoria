import { useEffect, useMemo, useRef, useState } from 'react';
import { buildInteractiveVisualSrcDoc, interactiveVisualEmbedDefaults } from '@/shared/interactive/interactiveVisual';

type InteractiveVisualEmbedProps = {
  html: string;
  title: string;
  className?: string;
  minHeight?: number;
  onAnalyticsEvent?: (payload: { eventName: string; payload: Record<string, unknown> }) => void;
};

export function InteractiveVisualEmbed({
  html,
  title,
  className,
  minHeight,
  onAnalyticsEvent,
}: InteractiveVisualEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const defaults = interactiveVisualEmbedDefaults();
  const [height, setHeight] = useState(Math.max(minHeight ?? defaults.defaultHeight, defaults.minHeight));
  const srcDoc = useMemo(() => buildInteractiveVisualSrcDoc(html, title), [html, title]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const payload = event.data;
      if (!payload || typeof payload !== 'object' || payload.type !== defaults.resizeEventType) {
        if (
          payload &&
          typeof payload === 'object' &&
          payload.type === defaults.analyticsEventType &&
          typeof payload.eventName === 'string'
        ) {
          onAnalyticsEvent?.({
            eventName: payload.eventName,
            payload:
              payload.payload && typeof payload.payload === 'object'
                ? (payload.payload as Record<string, unknown>)
                : {},
          });
        }
        return;
      }

      const nextHeight =
        typeof payload.height === 'number' && Number.isFinite(payload.height)
          ? Math.max(minHeight ?? defaults.minHeight, Math.min(defaults.maxHeight, Math.ceil(payload.height)))
          : null;

      if (nextHeight) {
        setHeight(nextHeight);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [defaults.analyticsEventType, defaults.maxHeight, defaults.minHeight, defaults.resizeEventType, minHeight, onAnalyticsEvent]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className={className ?? 'w-full rounded-[24px] border-0 bg-transparent'}
      style={{ height }}
    />
  );
}
