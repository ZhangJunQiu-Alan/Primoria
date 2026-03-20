import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { CODE_LANGUAGES, getSafeCodeLanguage } from '../../codeLanguages';
import { FormField, Select } from '../FormField';
import type { Block } from '@primoria/schema';

interface CodeBlockPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function CodeBlockPanel({ block, lessonId, pageId }: CodeBlockPanelProps) {
  const dispatch = useAppDispatch();
  const content = block.content as {
    language?: string;
    code?: string;
    showLineNumbers?: boolean;
  };

  if (block.type === 'code-block') {
    return (
      <div className="space-y-3">
        <PanelHint text="Double-click the block on the canvas to edit the code." />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={content.showLineNumbers ?? true}
            onChange={(event) =>
              dispatch(
                updateBlock({
                  lessonId,
                  pageId,
                  block: {
                    ...block,
                    content: {
                      ...content,
                      showLineNumbers: event.target.checked,
                    },
                  },
                }),
              )
            }
            className="h-4 w-4"
          />
          Show line numbers
        </label>
      </div>
    );
  }

  if (block.type === 'code-playground') {
    return (
      <div className="space-y-2">
        <PanelHint text="Double-click the block on the canvas to edit and run the playground." />
      </div>
    );
  }

  const language = getSafeCodeLanguage(content.language);

  return (
    <div className="space-y-3">
      <PanelHint text="Code Execution still uses the inspector for now." />
      <FormField label="Language">
        <Select
          value={language}
          onChange={(event) =>
            dispatch(
              updateBlock({
                lessonId,
                pageId,
                block: {
                  ...block,
                  content: {
                    ...content,
                    language: event.target.value,
                  },
                },
              }),
            )
          }
        >
          {CODE_LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Code">
        <textarea
          value={content.code ?? ''}
          onChange={(event) =>
            dispatch(
              updateBlock({
                lessonId,
                pageId,
                block: {
                  ...block,
                  content: {
                    ...content,
                    code: event.target.value,
                  },
                },
              }),
            )
          }
          className="min-h-[150px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono outline-none ring-ring focus:ring-2"
          spellCheck={false}
        />
      </FormField>
    </div>
  );
}

function PanelHint({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Content
      </p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
