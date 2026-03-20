import { useAppSelector } from '@/store';
import { BLOCK_META } from '../blockRegistry';
import { TextPanel } from './panels/TextPanel';
import { CodeBlockPanel } from './panels/CodeBlockPanel';
import { MultipleChoicePanel } from './panels/MultipleChoicePanel';
import { ImagePanel } from './panels/ImagePanel';
import { TrueFalsePanel } from './panels/TrueFalsePanel';
import { FillBlankPanel } from './panels/FillBlankPanel';
import { MatchingPanel } from './panels/MatchingPanel';
import { VideoPanel } from './panels/VideoPanel';
import { InteractiveVisualPanel } from './panels/InteractiveVisualPanel';
import { FunctionFlowPanel } from './panels/FunctionFlowPanel';
import { BlockSettings } from './BlockSettings';
import { BlockStyleEditor } from './BlockStyleEditor';
import type { Block } from '@primoria/schema';

interface PropertyPanelProps {
  lessonId: string;
  pageId: string;
}

export function PropertyPanel({ lessonId, pageId }: PropertyPanelProps) {
  const selectedId = useAppSelector((s) => s.editor.selectedBlockId);
  const draft = useAppSelector((s) => s.editor.draft);

  const lesson = draft?.lessons.find((l) => l.lesson_id === lessonId);
  const page = lesson?.pages.find((p) => p.page_id === pageId);
  const block = page?.blocks.find((b) => b.id === selectedId);

  return (
    <div className="editor-property-panel flex h-full flex-col">
      <div className="editor-property-panel__scroll flex-1 overflow-y-auto">
        {block ? (
          <>
            <div className="editor-property-panel__block-head border-b px-4 py-3 flex items-center gap-2 shrink-0">
              <span className="text-base" aria-hidden>
                {BLOCK_META[block.type].icon}
              </span>
              <span className="text-sm font-semibold">{BLOCK_META[block.type].label}</span>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {block.id.slice(0, 8)}
              </span>
            </div>
            <div className="p-4">
              <BlockPropertyPanel block={block} lessonId={lessonId} pageId={pageId} />
            </div>
          </>
        ) : (
          <div className="editor-property-panel__empty flex h-full items-center justify-center p-6">
            <p className="text-sm text-muted-foreground text-center">
              Select a block to edit its properties
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockPropertyPanel({
  block,
  lessonId,
  pageId,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
}) {
  const props = { block, lessonId, pageId };
  const specificPanel = renderSpecificPanel(props);

  return (
    <div className="space-y-4">
      {specificPanel}
      <BlockStyleEditor {...props} />
      <BlockSettings {...props} />
    </div>
  );
}

function renderSpecificPanel({
  block,
  lessonId,
  pageId,
}: {
  block: Block;
  lessonId: string;
  pageId: string;
}) {
  const props = { block, lessonId, pageId };

  switch (block.type) {
    case 'text':
      return <TextPanel {...props} />;
    case 'image':
      return <ImagePanel {...props} />;
    case 'code-block':
    case 'code-playground':
    case 'code-execution':
      return <CodeBlockPanel {...props} />;
    case 'multiple-choice':
      return <MultipleChoicePanel {...props} />;
    case 'true-false':
      return <TrueFalsePanel {...props} />;
    case 'fill-blank':
      return <FillBlankPanel {...props} />;
    case 'matching':
      return <MatchingPanel {...props} />;
    case 'video':
      return <VideoPanel {...props} />;
    case 'interactive-visual':
      return <InteractiveVisualPanel {...props} />;
    case 'function-flow':
      return <FunctionFlowPanel {...props} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Property editor for <strong>{block.type}</strong> coming soon.
        </p>
      );
  }
}
