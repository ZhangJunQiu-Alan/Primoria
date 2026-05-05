import { supabase } from '@/shared/api/supabase';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import {
  createInteractiveVisualFallback,
  normalizeInteractiveVisualArtifact,
  type InteractiveVisualArtifact,
} from '@/shared/interactive/interactiveVisual';
import type { InteractiveVisualMode } from '@/shared/interactive/interactiveVisualModes';

export type CreateInteractiveVisualRequest = {
  prompt: string;
  template?: string;
  experienceMode?: InteractiveVisualMode;
  title?: string;
  description?: string;
  language?: 'en' | 'zh-CN';
  surface?: 'builder' | 'ai-tutor';
};

async function getInteractiveVisualAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token ?? null;
}

export async function createInteractiveVisual(
  request: CreateInteractiveVisualRequest,
): Promise<InteractiveVisualArtifact> {
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw new Error('An AI element prompt is required.');
  }

  if (usesViewerFixtures()) {
    return createInteractiveVisualFallback(request);
  }

  try {
    const accessToken = await getInteractiveVisualAccessToken();
    const { data, error } = await supabase.functions.invoke('viewer-ai-interactive-visual', {
      body: {
        prompt,
        template: request.template,
        experienceMode: request.experienceMode,
        title: request.title,
        description: request.description,
        language: request.language ?? 'en',
        surface: request.surface ?? 'builder',
      },
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    });

    if (error) {
      throw error;
    }

    const artifact = normalizeInteractiveVisualArtifact(data, {
      prompt,
      template: request.template,
      experienceMode: request.experienceMode,
    });
    if (!artifact) {
      throw new Error('AI interactive visual generation returned an empty result.');
    }
    return artifact;
  } catch {
    return createInteractiveVisualFallback(request);
  }
}
