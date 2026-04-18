import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMindMap } from '@/shared/api/viewer/tutorDocumentsApi';
import { captureViewerError } from '@/shared/platform/observability';
import { normalizeMindMapDocumentForSave } from '@/features/ai-tutor/mindMapDocument';
import type { MindMapDocument } from '@/shared/api/viewer/types';
import type { SaveStatus } from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';

export function useMindMapAutosave({
  document,
  setDocument,
  availableDocumentIds,
  labels,
  mindMapId,
  userId,
}: {
  document: MindMapDocument | null;
  setDocument: React.Dispatch<React.SetStateAction<MindMapDocument | null>>;
  availableDocumentIds: Set<string> | null;
  labels: { saveError: string };
  mindMapId: string | undefined;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [lastSavedSerialized, setLastSavedSerialized] = useState('');
  const lastSavedSerializedRef = useRef('');
  const latestDocumentRef = useRef<MindMapDocument | null>(null);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: (nextDocument: MindMapDocument) => updateMindMap(nextDocument.id, nextDocument),
  });

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  const preparedDocument = useMemo(
    () => (document ? normalizeMindMapDocumentForSave(document, availableDocumentIds ?? undefined) : null),
    [availableDocumentIds, document],
  );

  const hasUnsavedChanges = Boolean(
    preparedDocument && (JSON.stringify(preparedDocument) !== lastSavedSerialized || saveStatus === 'saving'),
  );

  const resetAutosaveState = useCallback((snapshot: MindMapDocument) => {
    const serializedSnapshot = JSON.stringify(snapshot);
    lastSavedSerializedRef.current = serializedSnapshot;
    setLastSavedSerialized(serializedSnapshot);
    latestDocumentRef.current = snapshot;
    setSaveStatus('saved');
    setSaveErrorMessage(null);
  }, []);

  const markDirty = useCallback(() => {
    setSaveStatus('dirty');
    setSaveErrorMessage(null);
  }, []);

  const commitSave = useCallback(
    async (snapshot: MindMapDocument) => {
      if (saveInFlightRef.current) {
        savePendingRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      setSaveStatus('saving');
      setSaveErrorMessage(null);
      const prepared = normalizeMindMapDocumentForSave(snapshot, availableDocumentIds ?? undefined);
      const serializedSnapshot = JSON.stringify(prepared);

      try {
        const savedDocument = await saveMutation.mutateAsync(prepared);
        const serializedSavedDocument = JSON.stringify(savedDocument);
        lastSavedSerializedRef.current = serializedSavedDocument;
        setLastSavedSerialized(serializedSavedDocument);
        queryClient.setQueryData(['ai-tutor', 'mindmap', savedDocument.id], savedDocument);
        queryClient.setQueryData(['ai-tutor', 'mindmaps', userId ?? 'anon'], (current: unknown) => {
          if (!Array.isArray(current)) {
            return current;
          }

          const nextSummary = {
            id: savedDocument.id,
            title: savedDocument.title,
            sourceDocumentIds: savedDocument.sourceDocumentIds,
            nodeCount: Object.keys(savedDocument.nodes).length,
            createdAt: savedDocument.createdAt,
            updatedAt: savedDocument.updatedAt,
          };

          const filtered = current.filter((item) => {
            if (!item || typeof item !== 'object') {
              return false;
            }
            return (item as { id?: unknown }).id !== savedDocument.id;
          });

          return [nextSummary, ...filtered];
        });

        const latestPrepared = latestDocumentRef.current
          ? normalizeMindMapDocumentForSave(latestDocumentRef.current, availableDocumentIds ?? undefined)
          : null;
        if (latestPrepared && JSON.stringify(latestPrepared) === serializedSnapshot) {
          setDocument(savedDocument);
        }
        setSaveStatus('saved');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : labels.saveError;
        setSaveStatus('error');
        setSaveErrorMessage(errorMessage);
        captureViewerError(error, { area: 'ai_tutor_mindmap_save', mindMapId });
      } finally {
        saveInFlightRef.current = false;

        if (savePendingRef.current && latestDocumentRef.current) {
          savePendingRef.current = false;
          const latestPrepared = normalizeMindMapDocumentForSave(latestDocumentRef.current, availableDocumentIds ?? undefined);
          if (JSON.stringify(latestPrepared) !== lastSavedSerializedRef.current) {
            void commitSave(latestPrepared);
          }
        }
      }
    },
    [availableDocumentIds, labels.saveError, mindMapId, queryClient, saveMutation, setDocument, userId],
  );

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!preparedDocument) {
      return undefined;
    }

    const serialized = JSON.stringify(preparedDocument);
    if (serialized === lastSavedSerialized) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void commitSave(preparedDocument);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [commitSave, lastSavedSerialized, preparedDocument]);

  return {
    commitSave,
    hasUnsavedChanges,
    markDirty,
    preparedDocument,
    resetAutosaveState,
    saveErrorMessage,
    saveStatus,
    setSaveErrorMessage,
    setSaveStatus,
  };
}
