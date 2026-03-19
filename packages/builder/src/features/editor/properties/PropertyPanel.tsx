import { useState } from 'react';
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
import { AnimationPanel } from './panels/AnimationPanel';
import { InteractiveVisualPanel } from './panels/InteractiveVisualPanel';
import { FunctionFlowPanel } from './panels/FunctionFlowPanel';
import { MetadataPanel } from './panels/MetadataPanel';
import { CourseSettingsPanel } from './panels/CourseSettingsPanel';
import { BlockSettings } from './BlockSettings';
import { BlockStyleEditor } from './BlockStyleEditor';
import { cn } from '@/lib/utils';
import type { Block } from '@primoria/schema';

type Tab = 'block' | 'course' | 'settings';

interface PropertyPanelProps {
  lessonId: string;
  pageId: string;
}

export function PropertyPanel({ lessonId, pageId }: PropertyPanelProps) {
  const [tab, setTab] = useState<Tab>('block');
  const selectedId = useAppSelector((s) => s.editor.selectedBlockId);
  const draft = useAppSelector((s) => s.editor.draft);

  const lesson = draft?.lessons.find((l) => l.lesson_id === lessonId);
  const page = lesson?.pages.find((p) => p.page_id === pageId);
  const block = page?.blocks.find((b) => b.id === selectedId);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'block', label: 'Block' },
    { id: 'course', label: 'Course' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'course' ? (
          <div className="p-4">
            <MetadataPanel />
          </div>
        ) : tab === 'settings' ? (
          <div className="p-4">
            <CourseSettingsPanel />
          </div>
        ) : block ? (
          <>
            {/* Block header */}
            <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
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
              <BlockStyleEditor block={block} lessonId={lessonId} pageId={pageId} />
              <BlockSettings block={block} lessonId={lessonId} pageId={pageId} />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
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

  switch (block.type) {
    case 'text':            return <TextPanel {...props} />;
    case 'image':           return <ImagePanel {...props} />;
    case 'code-block':
    case 'code-playground':
    case 'code-execution':  return <CodeBlockPanel {...props} />;
    case 'multiple-choice': return <MultipleChoicePanel {...props} />;
    case 'true-false':      return <TrueFalsePanel {...props} />;
    case 'fill-blank':      return <FillBlankPanel {...props} />;
    case 'matching':        return <MatchingPanel {...props} />;
    case 'video':           return <VideoPanel {...props} />;
    case 'animation':       return <AnimationPanel {...props} />;
    case 'interactive-visual': return <InteractiveVisualPanel {...props} />;
    case 'function-flow':   return <FunctionFlowPanel {...props} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Property editor for <strong>{block.type}</strong> coming soon.
        </p>
      );
  }
}
