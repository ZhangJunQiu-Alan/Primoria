import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch } from '@/store';
import { updateBlock } from '@/store/editorSlice';
import { FormField, Input, Select, Textarea } from '../FormField';
import { useSyncedInspectorForm } from '../useSyncedInspectorForm';
import {
  createInteractiveVisual,
  postDevHealthLog,
  type InteractiveVisualGenerationJob,
} from '@/shared/api/viewer/interactiveVisualApi';
import {
  INTERACTIVE_VISUAL_HEALTH_EVENT,
  classifyInteractiveVisualHealth,
  type InteractiveVisualHealthSnapshot,
} from '@/shared/interactive-visual/InteractiveVisualEmbed';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
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

function containsChineseText(value: string) {
  return /[㐀-鿿豈-﫿]/.test(value);
}

function resolveGenerationLanguage(prompt: string, productLanguage: 'en' | 'zh-CN') {
  return containsChineseText(prompt) ? 'zh-CN' : productLanguage;
}

interface InteractiveVisualPanelProps {
  block: Block;
  lessonId: string;
  pageId: string;
}

export function InteractiveVisualPanel({ block, lessonId, pageId }: InteractiveVisualPanelProps) {
  const dispatch = useAppDispatch();
  const language = useProductLanguage();
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationJob, setGenerationJob] = useState<InteractiveVisualGenerationJob | null>(null);
  const [health, setHealth] = useState<InteractiveVisualHealthSnapshot | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== INTERACTIVE_VISUAL_HEALTH_EVENT) return;
      const snapshot: InteractiveVisualHealthSnapshot = {
        when: typeof data.when === 'string' ? data.when : 'unknown',
        errors: Array.isArray(data.errors) ? data.errors.slice(0, 10) : [],
        trackEventCount: typeof data.trackEventCount === 'number' ? data.trackEventCount : 0,
        domStats:
          data.domStats && typeof data.domStats === 'object'
            ? {
                interactives: Number(data.domStats.interactives ?? 0),
                svgChildren: Number(data.domStats.svgChildren ?? 0),
                hasObservation: Boolean(data.domStats.hasObservation),
              }
            : { interactives: 0, svgChildren: 0, hasObservation: false },
        receivedAt: new Date().toISOString(),
      };
      setHealth(snapshot);
      postDevHealthLog(snapshot);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

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

  const { register, watch, reset, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValues,
  });

  useSyncedInspectorForm({
    entityKey: block.id,
    sourceValues: formValues,
    reset,
    watch,
    onChange: (values) => {
      const nextContent: Record<string, unknown> = {
        ...(block.content as object),
        template: values.template,
        title: values.title,
        description: values.description,
        aiPrompt: values.aiPrompt,
      };

      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: nextContent },
        }),
      );
    },
  });

  async function handleGenerate() {
    const values = getValues();
    const prompt = values.aiPrompt?.trim() ?? '';
    if (prompt.length < 8) {
      setGenError('Describe the interactive visual in at least a few words before generating.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setGenerationJob(null);
    setHealth(null);

    try {
      const artifact = await createInteractiveVisual({
        prompt,
        template: values.template,
        title: values.title?.trim() || undefined,
        description: values.description?.trim() || undefined,
        language: resolveGenerationLanguage(prompt, language),
        surface: 'builder',
        allowFallback: false,
        onJobUpdate: setGenerationJob,
      });
      const currentContent =
        block.content && typeof block.content === 'object' ? (block.content as Record<string, unknown>) : {};
      const nextContent: Record<string, unknown> = {
        ...currentContent,
        version: artifact.version,
        template: artifact.template,
        title: artifact.title,
        description: artifact.description,
        aiPrompt: artifact.aiPrompt ?? prompt,
        generatedHtml: artifact.generatedHtml,
        themeTone: artifact.themeTone,
        experienceMode: artifact.experienceMode,
      };

      dispatch(
        updateBlock({
          lessonId,
          pageId,
          block: { ...block, content: nextContent },
        }),
      );
      setGenerationJob(null);
    } catch (error) {
      setGenError(error instanceof Error ? error.message : 'AI interactive visual generation failed.');
    } finally {
      setIsGenerating(false);
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
      <FormField label="AI Prompt">
        <Textarea
          rows={4}
          {...register('aiPrompt')}
          placeholder="Describe what you want the visual to show..."
        />
      </FormField>

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isGenerating}
        aria-busy={isGenerating}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? 'Generating interactive HTML...' : 'Generate with AI'}
      </button>

      {genError && <p className="text-xs text-destructive">{genError}</p>}

      {generationJob && (
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            Generation job {generationJob.id.slice(0, 8)}: {generationJob.status}
          </p>
          <p className="mt-1">
            Attempts: {generationJob.attemptCount}
            {generationJob.nextAttemptAt
              ? ` · next retry ${new Date(generationJob.nextAttemptAt).toLocaleTimeString()}`
              : ''}
          </p>
          {generationJob.lastError ? <p className="mt-1 text-destructive">{generationJob.lastError}</p> : null}
        </div>
      )}

      {(block.content as { generatedHtml?: string }).generatedHtml && (
        <p className="text-xs text-green-600">AI-generated HTML ready - will render in player.</p>
      )}

      {import.meta.env.DEV ? <DevHealthBadge health={health} /> : null}
    </div>
  );
}

function DevHealthBadge({ health }: { health: InteractiveVisualHealthSnapshot | null }) {
  const status = classifyInteractiveVisualHealth(health);
  const palette =
    status === 'healthy'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' }
      : status === 'partial'
        ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' }
        : status === 'broken'
          ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' }
          : { bg: 'bg-muted/30', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };

  return (
    <div className={`rounded-md border ${palette.border} ${palette.bg} ${palette.text} px-3 py-2 text-xs`}>
      <div className="flex items-center gap-2 font-semibold">
        <span className={`inline-block h-2 w-2 rounded-full ${palette.dot}`} />
        <span>Runtime health (dev): {status}</span>
      </div>
      {health ? (
        <ul className="mt-1 space-y-0.5">
          <li>
            captured: {health.when} @ {new Date(health.receivedAt).toLocaleTimeString()}
          </li>
          <li>
            errors: {health.errors.length}
            {health.errors[0] ? ` · "${health.errors[0].message.slice(0, 80)}"` : ''}
          </li>
          <li>
            dom: interactives={health.domStats.interactives}, svgChildren={health.domStats.svgChildren},
            observation={health.domStats.hasObservation ? 'yes' : 'no'}
          </li>
          <li>track events: {health.trackEventCount}</li>
        </ul>
      ) : (
        <p className="mt-1">Waiting for iframe probe…</p>
      )}
    </div>
  );
}
