import { fetchAgentJson } from '@/shared/api/agentService';
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
    const data = await fetchAgentJson('/v1/llm/interactive-visual', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        template: request.template,
        experienceMode: request.experienceMode,
        title: request.title,
        description: request.description,
        language: request.language ?? 'en',
        surface: request.surface ?? 'builder',
      }),
    });

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
