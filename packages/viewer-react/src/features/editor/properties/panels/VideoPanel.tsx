import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Select } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import type { Block } from '@primoria/schema';

const schema = z.object({
  provider: z.enum(['youtube', 'vimeo', 'custom']),
  url: z.string().optional(),
  caption: z.string().optional(),
  autoplay: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return m ? m[1] : null;
}

interface VideoPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function VideoPanel({ block, lessonId, pageId }: VideoPanelProps) {
  const dispatch = useAppDispatch();
  const c = block.content as {
    provider?: 'youtube' | 'vimeo' | 'custom';
    url?: string;
    caption?: string;
    autoplay?: boolean;
  };
  const formValues: FormValues = {
    provider: c.provider ?? 'youtube',
    url: c.url ?? '',
    caption: c.caption ?? '',
    autoplay: c.autoplay ?? false,
  };

  const { register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  useSyncedInspectorForm({
    entityKey: block.id,
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      dispatch(updateBlock({ lessonId, pageId, block: { ...block, content: values } }));
    },
  });

  const url = watch('url') ?? '';
  const provider = watch('provider');
  const ytId = provider === 'youtube' ? youtubeId(url) : null;

  return (
    <div className="space-y-4">
      <FormField label="Provider">
        <Select {...register('provider')}>
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
          <option value="custom">Custom URL</option>
        </Select>
      </FormField>

      <FormField label="URL">
        <Input
          {...register('url')}
          placeholder={
            provider === 'youtube'
              ? 'https://youtube.com/watch?v=...'
              : provider === 'vimeo'
              ? 'https://vimeo.com/...'
              : 'https://...'
          }
          type="url"
        />
      </FormField>

      {/* YouTube preview */}
      {ytId && (
        <div className="aspect-video rounded-md overflow-hidden border">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            className="w-full h-full"
            allowFullScreen
            title="YouTube preview"
          />
        </div>
      )}

      <FormField label="Caption (optional)">
        <Input {...register('caption')} placeholder="Caption shown below video" />
      </FormField>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" {...register('autoplay')} className="h-4 w-4" />
        Autoplay
      </label>
    </div>
  );
}
