import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Textarea } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import { nanoid } from '@/lib/nanoid';
import type { Block } from '@primoria/schema';

const schema = z.object({
  template: z.string().min(1, 'Template is required'),
  blanks: z.array(
    z.object({
      id: z.string(),
      answer: z.string(),
      alternatives: z.array(z.string()),
    }),
  ),
});

type FormValues = z.infer<typeof schema>;

interface FillBlankPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function FillBlankPanel({ block, lessonId, pageId }: FillBlankPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    template?: string;
    blanks?: Array<{ id: string; answer: string; alternatives?: string[] }>;
  };
  const formValues: FormValues = {
    template: c.template ?? '',
    blanks: (c.blanks ?? []).map((b) => ({
      ...b,
      alternatives: b.alternatives ?? [],
    })),
  };

  const { register, watch, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'blanks' });

  useSyncedInspectorForm({
    entityKey: block.id,
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    },
  });

  return (
    <div className="space-y-4">
      <FormField label="Template">
        <Textarea
          rows={3}
          {...register('template')}
          placeholder="The capital of France is ___."
        />
        <p className="text-xs text-muted-foreground mt-1">Use ___ to mark each blank.</p>
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Blanks
          </div>
          <button
            type="button"
            onClick={() => append({ id: nanoid(8), answer: '', alternatives: [] })}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add blank
          </button>
        </div>
        {fields.map((field, i) => (
          <div key={field.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Blank {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <FormField label="Correct answer">
              <Input {...register(`blanks.${i}.answer`)} placeholder="e.g. Paris" />
            </FormField>
            <FormField label="Alternatives (comma-separated)">
              <Controller
                control={control}
                name={`blanks.${i}.alternatives`}
                render={({ field: alternativesField }) => (
                  <Input
                    placeholder="e.g. paris, PARIS"
                    value={(alternativesField.value ?? []).join(', ')}
                    onChange={(event) =>
                      alternativesField.onChange(
                        event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                )}
              />
            </FormField>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No blanks defined. Add one for each ___ in the template.
          </p>
        )}
      </div>
    </div>
  );
}
