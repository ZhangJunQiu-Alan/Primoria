import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Select } from '../FormField';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

const schema = z.object({
  mode: z.enum(['list', 'graph']),
  pairs: z.array(
    z.object({
      id: z.string(),
      left: z.string(),
      right: z.string(),
    }),
  ),
});

type FormValues = z.infer<typeof schema>;

interface MatchingPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function MatchingPanel({ block, lessonId, pageId }: MatchingPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    mode?: 'list' | 'graph';
    pairs?: Array<{ id: string; left: string; right: string }>;
  };

  const { register, watch, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: c.mode ?? 'list',
      pairs: c.pairs ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'pairs' });

  useEffect(() => {
    reset({ mode: c.mode ?? 'list', pairs: c.pairs ?? [] });
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps -- 仅在切换 block 时重置表单；不跟踪 reset/content，避免与用户输入冲突

  useEffect(() => {
    const sub = watch((values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    });
    return () => sub.unsubscribe();
  }, [watch, block, lessonId, pageId, dispatch]);

  return (
    <div className="space-y-4">
      <FormField label="Display mode">
        <Select {...register('mode')}>
          <option value="list">List</option>
          <option value="graph">Graph</option>
        </Select>
      </FormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pairs
          </div>
          <button
            type="button"
            onClick={() => append({ id: nanoid(8), left: '', right: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add pair
          </button>
        </div>

        {fields.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center text-xs font-medium text-muted-foreground mb-1">
            <span>Left</span>
            <span />
            <span>Right</span>
            <span />
          </div>
        )}

        {fields.map((field, i) => (
          <div key={field.id} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
            <Input {...register(`pairs.${i}.left`)} placeholder="Item A" />
            <span className="text-muted-foreground text-xs">↔</span>
            <Input {...register(`pairs.${i}.right`)} placeholder="Item B" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1 rounded hover:bg-destructive/10 text-destructive"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Add pairs for learners to match.</p>
        )}
      </div>
    </div>
  );
}
