import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Textarea } from '../FormField';
import type { Block } from '@primoria/schema';

const schema = z.object({
  statement: z.string().min(1, 'Statement is required'),
  isTrue: z.boolean(),
  explanation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TrueFalsePanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function TrueFalsePanel({ block, lessonId, pageId }: TrueFalsePanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as { statement?: string; isTrue?: boolean; explanation?: string };

  const { register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      statement: c.statement ?? '',
      isTrue: c.isTrue ?? true,
      explanation: c.explanation ?? '',
    },
  });

  useEffect(() => {
    reset({ statement: c.statement ?? '', isTrue: c.isTrue ?? true, explanation: c.explanation ?? '' });
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps -- 仅在切换 block 时重置表单；不跟踪 reset/content，避免与用户输入冲突

  useEffect(() => {
    const sub = watch((values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    });
    return () => sub.unsubscribe();
  }, [watch, block, lessonId, pageId, dispatch]);

  return (
    <div className="space-y-4">
      <FormField label="Statement">
        <Textarea rows={3} {...register('statement')} placeholder="Enter a true or false statement…" />
      </FormField>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Correct answer</div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" value="true" {...register('isTrue')} className="h-4 w-4" />
            True
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" value="false" {...register('isTrue')} className="h-4 w-4" />
            False
          </label>
        </div>
      </div>

      <FormField label="Explanation (optional)">
        <Input {...register('explanation')} placeholder="Shown after answering…" />
      </FormField>
    </div>
  );
}
