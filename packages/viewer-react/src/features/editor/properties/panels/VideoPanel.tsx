import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import { resolveVideoProvider, resolveVideoSource } from '@/shared/media/videoSource';
import type { Block } from '@primoria/schema';

const schema = z.object({
  url: z.string().optional(),
  caption: z.string().optional(),
  autoplay: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface VideoPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function VideoPanel({ block, lessonId, pageId }: VideoPanelProps) {
  const dispatch = useAppDispatch();
  const content = block.content as {
    provider?: 'youtube' | 'vimeo' | 'custom';
    url?: string;
    caption?: string;
    autoplay?: boolean;
  };
  const formValues: FormValues = {
    url: content.url ?? '',
    caption: content.caption ?? '',
    autoplay: content.autoplay ?? false,
  };

  const { control, register, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  useSyncedInspectorForm({
    entityKey: block.id,
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      const nextUrl = values.url?.trim() ?? '';
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: {
            ...block,
            content: {
              ...content,
              url: nextUrl || undefined,
              provider: nextUrl ? resolveVideoProvider(content.provider, nextUrl) : undefined,
              caption: values.caption?.trim() || undefined,
              autoplay: values.autoplay ?? false,
            },
          },
        }),
      );
    },
  });

  const watchedUrl = useWatch({ control, name: 'url' });
  const watchedAutoplay = useWatch({ control, name: 'autoplay' });
  const video = resolveVideoSource({
    url: watchedUrl,
    provider: content.provider,
    autoplay: watchedAutoplay,
  });

  return (
    <div className="space-y-4">
      <FormField label="Source">
        <p className="text-sm text-muted-foreground">
          Upload on the canvas or paste a video URL here.
        </p>
      </FormField>

      <FormField label="Video URL">
        <Input {...register('url')} placeholder="https://..." type="url" />
      </FormField>

      {video.kind === 'embed' ? (
        <div className="aspect-video overflow-hidden rounded-md border">
          <iframe
            src={video.embedUrl}
            className="h-full w-full border-0"
            allowFullScreen
            title="Video preview"
          />
        </div>
      ) : video.kind === 'native' ? (
        <div className="overflow-hidden rounded-md border bg-muted/20">
          <video
            src={video.url}
            controls
            autoPlay={video.autoPlay}
            muted={video.autoPlay}
            playsInline
            className="aspect-video h-full w-full"
          />
        </div>
      ) : null}

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
