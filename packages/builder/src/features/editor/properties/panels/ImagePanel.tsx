import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input } from '../FormField';
import type { Block } from '@primoria/schema';

const schema = z.object({
  url: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ImagePanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function ImagePanel({ block, lessonId, pageId }: ImagePanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as { url?: string; altText?: string; caption?: string };

  const { register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: c.url ?? '', altText: c.altText ?? '', caption: c.caption ?? '' },
  });

  useEffect(() => {
    reset({ url: c.url ?? '', altText: c.altText ?? '', caption: c.caption ?? '' });
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = watch((values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    });
    return () => sub.unsubscribe();
  }, [watch, block, lessonId, pageId, dispatch]);

  const url = watch('url');

  return (
    <div className="space-y-4">
      <FormField label="Image URL">
        <Input {...register('url')} placeholder="https://…" type="url" />
      </FormField>
      {url && (
        <img
          src={url}
          alt={watch('altText') ?? ''}
          className="w-full rounded-md border object-contain max-h-48"
        />
      )}
      <FormField label="Alt text">
        <Input {...register('altText')} placeholder="Describe the image…" />
      </FormField>
      <FormField label="Caption (optional)">
        <Input {...register('caption')} placeholder="Caption shown below image" />
      </FormField>
    </div>
  );
}
