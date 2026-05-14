import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPrimoriaInteractiveVisualSrcDoc,
  INTERACTIVE_VISUAL_ANALYTICS_EVENT,
  INTERACTIVE_VISUAL_OPEN_LINK_EVENT,
  INTERACTIVE_VISUAL_RESIZE_EVENT,
} from '@/shared/interactive/interactiveVisualDocument';
import { cn } from '@/shared/utils/cn';

const MIN_HEIGHT = 320;
const MAX_HEIGHT = 1200;

export function InteractiveVisualEmbed({
  title,
  description,
  generatedHtml,
  className,
  frameClassName,
}: {
  title?: string;
  description?: string;
  generatedHtml: string;
  className?: string;
  frameClassName?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(560);
  const srcDoc = useMemo(
    () => buildPrimoriaInteractiveVisualSrcDoc(generatedHtml, title?.trim() || 'Primoria interactive visual'),
    [generatedHtml, title],
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      const payload = event.data;
      if (!payload || typeof payload !== 'object') {
        return;
      }
      if (payload.type === INTERACTIVE_VISUAL_RESIZE_EVENT && typeof payload.height === 'number') {
        setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(payload.height))));
        return;
      }
      if (payload.type === INTERACTIVE_VISUAL_OPEN_LINK_EVENT && typeof payload.url === 'string') {
        window.open(payload.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (payload.type === INTERACTIVE_VISUAL_ANALYTICS_EVENT) {
        // Reserved for future persistence; keeping the bridge active matches lesson runtime embeds.
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-[#d9cdbd] bg-[rgba(255,252,247,0.96)] shadow-[0_14px_28px_rgba(90,70,50,0.08)]',
        className,
      )}
    >
      {title || description ? (
        <div className="border-b border-[#e9dece] px-4 py-3 md:px-5">
          {title ? (
            <h3
              className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#3d342a]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {title}
            </h3>
          ) : null}
          {description ? <p className="mt-1 text-sm font-medium leading-6 text-[#7c6f64]">{description}</p> : null}
        </div>
      ) : null}

      <div className={cn('bg-white/50', frameClassName)} style={frameClassName ? undefined : { height }}>
        <iframe
          ref={iframeRef}
          title={title?.trim() || 'Interactive visual'}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="h-full w-full border-0 bg-transparent"
        />
      </div>
    </div>
  );
}
