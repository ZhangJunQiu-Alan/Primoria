import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/shared/utils/cn';

export const INTERACTIVE_VISUAL_HEALTH_EVENT = 'primoria-interactive-health';

export type InteractiveVisualHealthSnapshot = {
  when: string;
  errors: Array<{ message: string; source: string; line: number; col: number }>;
  trackEventCount: number;
  domStats: {
    interactives: number;
    svgChildren: number;
    hasObservation: boolean;
    canvasCount: number;
    paintedCanvases: number;
    visibleSvgShapes: number;
  };
  receivedAt: string;
};

export function classifyInteractiveVisualHealth(
  health: InteractiveVisualHealthSnapshot | null,
): 'unknown' | 'healthy' | 'partial' | 'broken' {
  if (!health) return 'unknown';
  if (health.errors.length > 0) return 'broken';
  if (health.domStats.visibleSvgShapes === 0 && health.domStats.paintedCanvases === 0) return 'partial';
  return 'healthy';
}

const INTERACTIVE_VISUAL_BRIDGE = `<script>
(function () {
  var HEALTH_TYPE = '${INTERACTIVE_VISUAL_HEALTH_EVENT}';
  var healthErrors = [];
  var trackCount = 0;
  function track(eventName, payload) {
    trackCount += 1;
    try {
      window.parent.postMessage(
        { type: 'primoria-interactive-track', eventName: eventName, payload: payload },
        '*',
      );
    } catch (_e) {}
  }
  window.PrimoriaInteractive = { track: track };

  window.addEventListener('error', function (event) {
    healthErrors.push({
      message: String((event && event.message) || 'unknown error'),
      source: String((event && event.filename) || ''),
      line: (event && event.lineno) || 0,
      col: (event && event.colno) || 0,
    });
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason && typeof event.reason === 'object'
      ? (event.reason.message || JSON.stringify(event.reason))
      : String(event && event.reason);
    healthErrors.push({ message: 'unhandledrejection: ' + reason, source: '', line: 0, col: 0 });
  });

  function isPaintVisible(value) {
    return !!value &&
      value !== 'none' &&
      value !== 'transparent' &&
      value !== 'rgba(0, 0, 0, 0)' &&
      value !== 'rgba(0,0,0,0)';
  }

  function countPaintedCanvases() {
    var canvases = document.querySelectorAll('canvas');
    var painted = 0;
    canvases.forEach(function (canvas) {
      try {
        var context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        var width = Math.max(1, Math.min(canvas.width || 1, 32));
        var height = Math.max(1, Math.min(canvas.height || 1, 32));
        var data = context.getImageData(0, 0, width, height).data;
        var nonWhite = 0;
        for (var index = 0; index < data.length; index += 4) {
          var red = data[index];
          var green = data[index + 1];
          var blue = data[index + 2];
          var alpha = data[index + 3];
          if (alpha > 0 && (red < 248 || green < 248 || blue < 248)) {
            nonWhite += 1;
            if (nonWhite > 12) {
              painted += 1;
              return;
            }
          }
        }
      } catch (_e) {}
    });
    return { canvasCount: canvases.length, paintedCanvases: painted };
  }

  function countVisibleSvgShapes() {
    var count = 0;
    var nodes = document.querySelectorAll('svg path,svg line,svg polyline,svg polygon,svg rect,svg circle,svg ellipse,svg text');
    nodes.forEach(function (node) {
      try {
        var style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') <= 0) {
          return;
        }
        if (
          node.tagName.toLowerCase() === 'text' ||
          isPaintVisible(style.fill) ||
          isPaintVisible(style.stroke)
        ) {
          count += 1;
        }
      } catch (_e) {
        count += 1;
      }
    });
    return count;
  }

  function emitHealth(when) {
    var interactives = 0;
    var svgChildren = 0;
    var hasObservation = false;
    var canvasCount = 0;
    var paintedCanvases = 0;
    var visibleSvgShapes = 0;
    try {
      interactives = document.querySelectorAll('button,input,select,textarea,[role="button"]').length;
      svgChildren = document.querySelectorAll('svg *').length;
      hasObservation = !!document.querySelector('.iv-observation-card,.iv-conclusion');
      var canvasStats = countPaintedCanvases();
      canvasCount = canvasStats.canvasCount;
      paintedCanvases = canvasStats.paintedCanvases;
      visibleSvgShapes = countVisibleSvgShapes();
    } catch (_e) {}
    try {
      window.parent.postMessage({
        type: HEALTH_TYPE,
        when: when,
        errors: healthErrors.slice(-10),
        trackEventCount: trackCount,
        domStats: {
          interactives: interactives,
          svgChildren: svgChildren,
          hasObservation: hasObservation,
          canvasCount: canvasCount,
          paintedCanvases: paintedCanvases,
          visibleSvgShapes: visibleSvgShapes,
        },
      }, '*');
    } catch (_e) {}
  }
  window.addEventListener('load', function () { setTimeout(function () { emitHealth('initial'); }, 400); });
  setTimeout(function () { emitHealth('post-1500ms'); }, 1500);
})();
</script>`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

function isCompleteHtmlDocument(html: string) {
  const trimmed = html.trim();
  return /^<!doctype html[\s>]/i.test(trimmed) || /<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed);
}

function injectInteractiveVisualBridge(html: string) {
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (bodyTag) => `${bodyTag}\n${INTERACTIVE_VISUAL_BRIDGE}`);
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<\/head>/i, `${INTERACTIVE_VISUAL_BRIDGE}\n</head>`);
  }

  return `${INTERACTIVE_VISUAL_BRIDGE}\n${html}`;
}

function buildInteractiveVisualDocument(html: string, title: string) {
  if (isCompleteHtmlDocument(html)) {
    return injectInteractiveVisualBridge(html);
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: transparent;
      }
    </style>
  </head>
  <body>
    ${INTERACTIVE_VISUAL_BRIDGE}
    ${html}
  </body>
</html>`;
}

export function InteractiveVisualEmbed({
  title,
  description,
  generatedHtml,
  className,
  frameClassName,
  onHealthUpdate,
}: {
  title?: string;
  description?: string;
  generatedHtml: string;
  className?: string;
  frameClassName?: string;
  onHealthUpdate?: (snapshot: InteractiveVisualHealthSnapshot) => void;
}) {
  const srcDoc = useMemo(
    () => buildInteractiveVisualDocument(generatedHtml, title?.trim() || 'Primoria interactive visual'),
    [generatedHtml, title],
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onHealthUpdateRef = useRef(onHealthUpdate);
  useEffect(() => {
    onHealthUpdateRef.current = onHealthUpdate;
  }, [onHealthUpdate]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== INTERACTIVE_VISUAL_HEALTH_EVENT) return;
      if (iframeRef.current && event.source && event.source !== iframeRef.current.contentWindow) return;
      const snapshot: InteractiveVisualHealthSnapshot = {
        when: typeof data.when === 'string' ? data.when : 'unknown',
        errors: Array.isArray(data.errors) ? data.errors.slice(0, 10) : [],
        trackEventCount: typeof data.trackEventCount === 'number' ? data.trackEventCount : 0,
        domStats:
          data.domStats && typeof data.domStats === 'object'
            ? {
                interactives: Number(data.domStats.interactives ?? 0),
                svgChildren: Number(data.domStats.svgChildren ?? 0),
                hasObservation: Boolean(data.domStats.hasObservation),
                canvasCount: Number(data.domStats.canvasCount ?? 0),
                paintedCanvases: Number(data.domStats.paintedCanvases ?? 0),
                visibleSvgShapes: Number(data.domStats.visibleSvgShapes ?? 0),
              }
            : {
                interactives: 0,
                svgChildren: 0,
                hasObservation: false,
                canvasCount: 0,
                paintedCanvases: 0,
                visibleSvgShapes: 0,
              },
        receivedAt: new Date().toISOString(),
      };
      onHealthUpdateRef.current?.(snapshot);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
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

      <div className={cn('h-[560px] bg-white/50', frameClassName)}>
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
