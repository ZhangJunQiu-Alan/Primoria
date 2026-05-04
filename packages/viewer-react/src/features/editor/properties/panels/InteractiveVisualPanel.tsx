import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { createInteractiveVisual } from '@/shared/api/viewer/interactiveVisualApi';
import { InteractiveVisualEmbed } from '@/shared/interactive/InteractiveVisualEmbed';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import {
  getInteractiveVisualGenerationPreview,
  getInteractiveVisualModeOption,
  INTERACTIVE_VISUAL_MODE_OPTIONS,
  type InteractiveVisualMode,
} from '@/shared/interactive/interactiveVisualModes';
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
  experienceMode: z.enum(['simulation', 'graph', 'scenario', 'story']),
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
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const language = useProductLanguage();
  const c = block.content as {
    experienceMode?: InteractiveVisualMode;
    template?: string;
    title?: string;
    description?: string;
    aiPrompt?: string;
  };
  const formValues: FormValues = {
    experienceMode: c.experienceMode ?? 'simulation',
    template: c.template ?? 'generic',
    title: c.title ?? '',
    description: c.description ?? '',
    aiPrompt: c.aiPrompt ?? '',
  };

  const { register, watch, reset, getValues, setValue } = useForm<FormValues>({
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
    const values = getValues();
    const prompt = values.aiPrompt?.trim() ?? '';
    if (!prompt) {
      setGenError('Add a prompt so the AI element knows what to generate.');
      return;
    }

    setGenError(null);
    setIsGenerating(true);

    try {
      const artifact = await createInteractiveVisual({
        prompt,
        template: values.template,
        experienceMode: values.experienceMode,
        title: values.title,
        description: values.description,
        language,
        surface: 'builder',
      });

      const nextContent = {
        ...(block.content as object),
        ...values,
        ...artifact,
      };

      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: nextContent },
        }),
      );

      reset({
        experienceMode: artifact.experienceMode,
        template: artifact.template,
        title: artifact.title,
        description: artifact.description ?? values.description ?? '',
        aiPrompt: prompt,
      });
    } catch (error) {
      setGenError(error instanceof Error ? error.message : 'Unable to generate the AI element right now.');
    } finally {
      setIsGenerating(false);
    }
  }

  const previewValues = watch();
  const modeOption = getInteractiveVisualModeOption(previewValues.experienceMode);
  const generationPreview = getInteractiveVisualGenerationPreview({
    mode: previewValues.experienceMode,
    prompt: previewValues.aiPrompt ?? '',
    template: previewValues.template,
  });

  return (
    <div className="space-y-4">
      <FormField label="Generation mode">
        <div className="grid gap-2">
          {INTERACTIVE_VISUAL_MODE_OPTIONS.map((option) => {
            const active = previewValues.experienceMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setValue('experienceMode', option.value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
                className={[
                  'rounded-xl border px-3 py-3 text-left transition',
                  active
                    ? 'border-primary bg-primary/10 shadow-[0_10px_22px_rgba(96,145,118,0.12)]'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40',
                ].join(' ')}
              >
                <div className="text-sm font-semibold text-foreground">{option.label}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Experience type">
        <Select {...register('template')}>
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Title">
        <Input {...register('title')} placeholder="Shown above the AI element" />
      </FormField>
      <FormField label="Description (optional)">
        <Input {...register('description')} placeholder="Brief context for learners" />
      </FormField>
      <FormField label="AI Prompt">
        <Textarea
          rows={6}
          {...register('aiPrompt')}
          placeholder="Describe the concept, learner goal, controls, animation, and the exact interaction you want..."
        />
      </FormField>

      <div className="rounded-[20px] border border-[#d9dde3] bg-[rgba(247,250,252,0.72)] p-4 shadow-[0_12px_24px_rgba(31,72,110,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6c879f]">Generation preview</p>
            <h4 className="mt-1 text-base font-semibold text-foreground">{generationPreview.title}</h4>
          </div>
          <span className="rounded-full bg-[rgba(116,189,240,0.14)] px-3 py-1 text-xs font-semibold text-[#3477ae]">
            {generationPreview.badge}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{generationPreview.body}</p>
        <div className="mt-3 rounded-2xl border border-white/70 bg-white/80 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8ea2]">{modeOption.previewTitle}</p>
          <p className="mt-2 text-sm text-foreground">{generationPreview.promptHint}</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">{generationPreview.detail}</p>
        </div>
      </div>

      <button
        onClick={() => void handleGenerate()}
        disabled={isGenerating}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isGenerating ? 'Generating AI element...' : '✨ Generate AI element'}
      </button>

      <p className="text-xs text-muted-foreground">
        Prompts work best when you describe the topic, what should be animated, the learner controls, and how the student should interact with it.
      </p>

      {genError && (
        <p className="text-xs text-destructive">{genError}</p>
      )}

      {(block.content as { generatedHtml?: string }).generatedHtml && (
        <div className="space-y-2">
          <p className="text-xs text-green-600">AI-generated HTML ready — previewing below and available in the player.</p>
          <div className="overflow-hidden rounded-[22px] border border-[#d9dde3] bg-[rgba(247,250,252,0.68)] p-2 shadow-[0_12px_24px_rgba(31,72,110,0.08)]">
            <InteractiveVisualEmbed
              title={String((block.content as { title?: string }).title ?? 'AI Element')}
              html={String((block.content as { generatedHtml?: string }).generatedHtml ?? '')}
              minHeight={360}
              className="w-full rounded-[18px] bg-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
