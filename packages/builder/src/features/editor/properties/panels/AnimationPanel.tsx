import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Select, Textarea } from '../FormField';
import type { Block } from '@primoria/schema';

const PRESETS = [
  { value: '', label: '(none — use AI prompt)' },
  { value: 'bubble-sort', label: 'Bubble Sort' },
  { value: 'merge-sort', label: 'Merge Sort' },
  { value: 'binary-search', label: 'Binary Search' },
  { value: 'linked-list', label: 'Linked List' },
  { value: 'bfs', label: 'BFS / DFS' },
  { value: 'stack-queue', label: 'Stack & Queue' },
  { value: 'dijkstra', label: "Dijkstra's Algorithm" },
];

const schema = z.object({
  preset: z.string().optional(),
  aiPrompt: z.string().optional(),
  customHtml: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AnimationPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function AnimationPanel({ block, lessonId, pageId }: AnimationPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    preset?: string;
    aiPrompt?: string;
    customHtml?: string;
  };

  const { register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      preset: c.preset ?? '',
      aiPrompt: c.aiPrompt ?? '',
      customHtml: c.customHtml ?? '',
    },
  });

  useEffect(() => {
    reset({ preset: c.preset ?? '', aiPrompt: c.aiPrompt ?? '', customHtml: c.customHtml ?? '' });
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = watch((values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    });
    return () => sub.unsubscribe();
  }, [watch, block, lessonId, pageId, dispatch]);

  return (
    <div className="space-y-4">
      <FormField label="Preset animation">
        <Select {...register('preset')}>
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="AI prompt (optional)">
        <Textarea
          rows={3}
          {...register('aiPrompt')}
          placeholder="Describe the animation you want…"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave blank to use the preset, or write a prompt to generate a custom animation.
        </p>
      </FormField>

      <FormField label="Custom HTML (advanced)">
        <Textarea
          rows={5}
          {...register('customHtml')}
          placeholder="<canvas id='c'></canvas><script>…</script>"
          className="font-mono text-xs"
        />
      </FormField>
    </div>
  );
}
