import { useMemo } from 'react';
import { cn } from '@/shared/utils/cn';

function buildInteractiveVisualDocument(html: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <script>
      window.PrimoriaInteractive = {
        track(eventName, payload) {
          try {
            window.parent.postMessage(
              { type: 'primoria-interactive-track', eventName, payload },
              '*',
            );
          } catch {}
        },
      };
    </script>
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
}: {
  title?: string;
  description?: string;
  generatedHtml: string;
  className?: string;
  frameClassName?: string;
}) {
  const srcDoc = useMemo(
    () => buildInteractiveVisualDocument(generatedHtml, title?.trim() || 'Primoria interactive visual'),
    [generatedHtml, title],
  );

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
          title={title?.trim() || 'Interactive visual'}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="h-full w-full border-0 bg-transparent"
        />
      </div>
    </div>
  );
}
