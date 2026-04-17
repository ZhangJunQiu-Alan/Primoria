import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Textarea } from '../FormField';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

const schema = z.object({
  question: z.string().min(1, 'Question is required'),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.coerce.boolean(),
    }),
  ),
  explanation: z.string().optional(),
  allowMultiple: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MultipleChoicePanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

type MultipleChoiceContent = {
  question?: string;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation?: string;
  allowMultiple?: boolean;
};

function toFormValues(content: MultipleChoiceContent): FormValues {
  return {
    question: content.question ?? '',
    options: (content.options ?? []).map((option) => ({
      id: option.id,
      text: option.text ?? '',
      isCorrect: Boolean(option.isCorrect),
    })),
    explanation: content.explanation ?? '',
    allowMultiple: Boolean(content.allowMultiple),
  };
}

export function MultipleChoicePanel({ block, lessonId, pageId }: MultipleChoicePanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    question?: string;
    options?: Array<{ id: string; text: string; isCorrect: boolean }>;
    explanation?: string;
    allowMultiple?: boolean;
  };

  const { register, watch, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(c),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  useEffect(() => {
    reset(toFormValues(c));
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps -- 仅在切换 block 时重置表单；不跟踪 reset/content，避免与用户输入冲突

  useEffect(() => {
    const sub = watch((values) => {
      const nextContent = toFormValues(values as MultipleChoiceContent);
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: nextContent },
        }),
      );
    });
    return () => sub.unsubscribe();
  }, [watch, block, lessonId, pageId, dispatch]);

  return (
    <div className="space-y-4">
      <FormField label="Question">
        <Textarea rows={3} {...register('question')} placeholder="Enter question…" />
      </FormField>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Options
        </div>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <input
              type={watch('allowMultiple') ? 'checkbox' : 'radio'}
              {...register(`options.${i}.isCorrect`)}
              className="h-4 w-4 cursor-pointer"
              title="Mark as correct"
            />
            <Input
              {...register(`options.${i}.text`)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ id: nanoid(8), text: '', isCorrect: false })}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add option
        </button>
      </div>

      <FormField label="Explanation (optional)">
        <Input {...register('explanation')} placeholder="Shown after answering…" />
      </FormField>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" {...register('allowMultiple')} className="h-4 w-4" />
        Allow multiple correct answers
      </label>
    </div>
  );
}
