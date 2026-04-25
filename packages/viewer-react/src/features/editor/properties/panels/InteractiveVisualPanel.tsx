import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchAgentJson } from '@/shared/api/agentService';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Select, Textarea } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import type { Block } from '@primoria/schema';

const TEMPLATES = [
  'pendulum',
  'spring',
  'projectile',
  'wave',
  'orbit',
  'circuit',
  'optics',
  'buoyancy',
  'gas',
  'collision',
  'gradient-descent',
  'sorting',
  'generic',
] as const;

const schema = z.object({
  template: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  aiPrompt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InteractiveVisualPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function InteractiveVisualPanel({ block, lessonId, pageId }: InteractiveVisualPanelProps) {
  const dispatch = useAppDispatch();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const c = block.content as {
    template?: string;
    title?: string;
    description?: string;
    aiPrompt?: string;
  };
  const formValues: FormValues = {
    template: c.template ?? 'generic',
    title: c.title ?? '',
    description: c.description ?? '',
    aiPrompt: c.aiPrompt ?? '',
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
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: { ...(block.content as object), ...values } },
        }),
      );
    },
  });

  async function handleGenerate() {
    const content = block.content as {
      aiPrompt?: string;
      template?: string;
      title?: string;
      description?: string;
    };
    const prompt = content.aiPrompt ?? '';
    if (!prompt.trim()) {
      setGenError('Enter an AI prompt first.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const data = await fetchAgentJson<{ html?: string }>('/v1/builder/interactive-visuals/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          template: content.template,
          title: content.title,
          description: content.description,
        }),
      });
      const html = data.html ?? '';
      if (!html) throw new Error('No HTML returned from AI');
      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: { ...(block.content as object), generatedHtml: html } },
        }),
      );
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <FormField label="Template">
        <Select {...register('template')}>
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Title">
        <Input {...register('title')} placeholder="Shown above the visual" />
      </FormField>
      <FormField label="Description (optional)">
        <Input {...register('description')} placeholder="Brief context for learners" />
      </FormField>
      <FormField label="AI Prompt (optional)">
        <Textarea
          rows={4}
          {...register('aiPrompt')}
          placeholder="Describe what you want the visual to show…"
        />
      </FormField>

      <button
        onClick={() => void handleGenerate()}
        disabled={generating}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {generating ? 'Generating…' : '✨ Generate with AI'}
      </button>

      {genError && (
        <p className="text-xs text-destructive">{genError}</p>
      )}

      {(block.content as { generatedHtml?: string }).generatedHtml && (
        <p className="text-xs text-green-600">AI-generated HTML ready — will render in player.</p>
      )}
    </div>
  );
}
