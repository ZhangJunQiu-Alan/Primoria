import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import type { Extension } from '@uiw/react-codemirror';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Select } from '../FormField';
import type { Block } from '@primoria/schema';

const LANGUAGES: Array<{ value: string; label: string; ext: () => Extension }> = [
  { value: 'python', label: 'Python', ext: () => python() },
  { value: 'javascript', label: 'JavaScript', ext: () => javascript() },
  { value: 'typescript', label: 'TypeScript', ext: () => javascript({ typescript: true }) },
  { value: 'java', label: 'Java', ext: () => java() },
  { value: 'rust', label: 'Rust', ext: () => rust() },
  { value: 'sql', label: 'SQL', ext: () => sql() },
  { value: 'c', label: 'C / C++', ext: () => [] as unknown as Extension },
  { value: 'go', label: 'Go', ext: () => [] as unknown as Extension },
];

interface CodeBlockPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function CodeBlockPanel({ block, lessonId, pageId }: CodeBlockPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    language?: string;
    code?: string;
    starterCode?: string;
    showLineNumbers?: boolean;
  };

  const language = c.language ?? 'python';
  const code = c.code ?? c.starterCode ?? '';

  const langEntry = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];
  const extensions = useMemo(() => [langEntry!.ext()], [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeChange = useCallback(
    (value: string) => {
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: {
            ...block,
            content: { ...c, code: value, starterCode: value },
          },
        }),
      );
    },
    [dispatch, block, lessonId, pageId, c],
  );

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    dispatch(
      updateBlock({
        lessonId,
        pageId,
        block: { ...block, content: { ...c, language: e.target.value } },
      }),
    );
  }

  return (
    <div className="space-y-3">
      <FormField label="Language">
        <Select value={language} onChange={handleLanguageChange}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Code
        </div>
        <div className="overflow-hidden rounded-md border text-sm">
          <CodeMirror
            value={code}
            extensions={extensions}
            theme={oneDark}
            onChange={handleCodeChange}
            minHeight="120px"
            maxHeight="400px"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              bracketMatching: true,
            }}
          />
        </div>
      </div>

      {block.type === 'code-playground' && (
        <p className="text-xs text-muted-foreground">
          This is starter code. Learners will be able to edit and run it.
        </p>
      )}
      {block.type === 'code-block' && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={c.showLineNumbers ?? true}
            onChange={(e) =>
              dispatch(
                updateBlock({
                  lessonId,
                  pageId,
                  block: { ...block, content: { ...c, showLineNumbers: e.target.checked } },
                }),
              )
            }
            className="h-4 w-4"
          />
          Show line numbers
        </label>
      )}
    </div>
  );
}
