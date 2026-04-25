import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/store';
import { updateMetadata } from '@/store/editorSlice';
import { FormField, Input, Select, Textarea } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  estimated_minutes: z.coerce.number().min(0).optional(),
  tags: z.string().optional(), // comma-separated in UI
});

type FormValues = z.infer<typeof schema>;

export function MetadataPanel() {
  const dispatch = useAppDispatch();
  const metadata = useAppSelector((s) => s.editor.draft?.metadata);
  const formValues: FormValues = {
    title: metadata?.title ?? '',
    description: metadata?.description ?? '',
    difficulty_level: metadata?.difficulty_level,
    estimated_minutes: metadata?.estimated_minutes,
    tags: metadata?.tags?.join(', ') ?? '',
  };

  const { register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  useSyncedInspectorForm({
    entityKey: 'course-metadata',
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      dispatch(
        updateMetadata({
          title: values.title ?? '',
          description: values.description ?? undefined,
          difficulty_level: values.difficulty_level ?? undefined,
          estimated_minutes: values.estimated_minutes
            ? Number(values.estimated_minutes)
            : undefined,
          tags: values.tags
            ? values.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
        }),
      );
    },
  });

  if (!metadata) return null;

  return (
    <div className="space-y-4">
      <FormField label="Course title">
        <Input {...register('title')} placeholder="e.g. Introduction to Python" />
      </FormField>

      <FormField label="Description">
        <Textarea
          rows={3}
          {...register('description')}
          placeholder="What will learners achieve?"
        />
      </FormField>

      <FormField label="Difficulty">
        <Select {...register('difficulty_level')}>
          <option value="">Not set</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
      </FormField>

      <FormField label="Estimated duration (minutes)">
        <Input
          type="number"
          min={0}
          step={5}
          {...register('estimated_minutes')}
          placeholder="e.g. 30"
        />
      </FormField>

      <FormField label="Tags (comma-separated)">
        <Input
          {...register('tags')}
          placeholder="e.g. python, algorithms, beginner"
        />
      </FormField>
    </div>
  );
}
