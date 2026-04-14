import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';
import type { LegacyMindMapNode } from '@/shared/api/viewer/types';

const AI_TUTOR_SESSION_STORAGE_KEY = 'viewer:ai-tutor-session:v3';
const AI_TUTOR_LEGACY_SESSION_STORAGE_KEY = 'viewer:ai-tutor-session:v2';

function isLegacyMindMapNode(value: unknown): value is LegacyMindMapNode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as { id?: unknown; label?: unknown; children?: unknown };
  if (typeof node.id !== 'string' || typeof node.label !== 'string') {
    return false;
  }

  if (node.children === undefined) {
    return true;
  }

  return Array.isArray(node.children) && node.children.every((child) => isLegacyMindMapNode(child));
}

function isStoredMindMapModal(value: unknown): value is Extract<TutorToolModal, { kind: 'mindmap' }> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const modal = value as { kind?: unknown; payload?: Record<string, unknown> };
  return (
    modal.kind === 'mindmap' &&
    typeof modal.payload?.title === 'string' &&
    Array.isArray(modal.payload?.sourceDocumentIds) &&
    typeof modal.payload?.userPrompt === 'string' &&
    isLegacyMindMapNode(modal.payload?.root)
  );
}

export function readLegacyMindMapModal() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(AI_TUTOR_SESSION_STORAGE_KEY) ??
      window.localStorage.getItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { artifacts?: Array<{ modal?: unknown }> };
    if (!Array.isArray(parsed.artifacts)) {
      return null;
    }

    for (const artifact of parsed.artifacts) {
      if (isStoredMindMapModal(artifact?.modal)) {
        return artifact.modal;
      }
    }
  } catch {
    return null;
  }

  return null;
}
