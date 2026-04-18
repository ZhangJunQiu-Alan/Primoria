import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractTutorDocumentText } from '@/features/ai-tutor/documentExtraction';
import {
  createTutorDocument,
  deleteTutorDocument,
  fetchTutorDocuments,
  TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE,
  updateTutorDocumentTitle,
} from '@/shared/api/viewer/tutorDocumentsApi';
import { captureViewerError } from '@/shared/platform/observability';
import {
  EMPTY_TUTOR_DOCUMENTS,
  resolveTutorErrorMessage,
} from '@/features/ai-tutor/aiTutorUtils';
import type {
  AiTutorCopyLike,
  PendingTutorUpload,
  TutorStatusNotice,
} from '@/features/ai-tutor/aiTutorTypes';
import type { TutorDocument } from '@/shared/api/viewer/types';

export function useAiTutorMaterials({
  userId,
  copy,
  setNotice,
}: {
  userId: string | undefined;
  copy: AiTutorCopyLike;
  setNotice: (notice: TutorStatusNotice | null) => void;
}) {
  const queryClient = useQueryClient();
  const [pendingUploads, setPendingUploads] = useState<PendingTutorUpload[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocumentTitle, setEditingDocumentTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const knownDocumentIdsRef = useRef<Set<string>>(new Set());
  const cancelTitleCommitRef = useRef<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['ai-tutor', 'documents', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: fetchTutorDocuments,
    staleTime: 30_000,
  });

  const createDocumentMutation = useMutation({
    mutationFn: createTutorDocument,
    onSuccess: (document) => {
      queryClient.setQueryData<TutorDocument[]>(['ai-tutor', 'documents', userId ?? 'anon'], (current) => {
        const next = current ? current.filter((item) => item.id !== document.id) : [];
        return [document, ...next];
      });
      setSelectedDocumentIds((current) => (current.includes(document.id) ? current : [...current, document.id]));
      setNotice({ tone: 'success', text: copy.aiTutor.materialUploaded });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: deleteTutorDocument,
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<TutorDocument[]>(['ai-tutor', 'documents', userId ?? 'anon'], (current) =>
        (current ?? []).filter((document) => document.id !== documentId),
      );
      setSelectedDocumentIds((current) => current.filter((id) => id !== documentId));
    },
  });

  const updateDocumentTitleMutation = useMutation({
    mutationFn: ({ documentId, displayTitle }: { documentId: string; displayTitle: string }) =>
      updateTutorDocumentTitle(documentId, displayTitle),
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData<TutorDocument[]>(['ai-tutor', 'documents', userId ?? 'anon'], (current) =>
        (current ?? []).map((document) => (document.id === updatedDocument.id ? updatedDocument : document)),
      );
      setNotice({ tone: 'success', text: copy.aiTutor.materialTitleSaved });
    },
  });

  const documents = documentsQuery.data ?? EMPTY_TUTOR_DOCUMENTS;
  const documentsErrorMessage = documentsQuery.error
    ? resolveTutorErrorMessage(documentsQuery.error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable)
    : null;

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) {
        return;
      }

      if (!userId) {
        setNotice({ tone: 'error', text: copy.aiTutor.materialsProtected });
        return;
      }

      for (const file of Array.from(files)) {
        const pendingId = `pending-${crypto.randomUUID()}`;
        setPendingUploads((current) => [...current, { id: pendingId, filename: file.name, mimeType: file.type }]);

        try {
          const extracted = await extractTutorDocumentText(file);
          await createDocumentMutation.mutateAsync({
            filename: file.name,
            mimeType: extracted.mimeType,
            extractedText: extracted.text,
          });
        } catch (error) {
          setNotice({
            tone: 'error',
            text: resolveTutorErrorMessage(error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable),
          });
          captureViewerError(error, { area: 'ai_tutor_document_upload', fileName: file.name });
        } finally {
          setPendingUploads((current) => current.filter((item) => item.id !== pendingId));
        }
      }
    },
    [copy.aiTutor.materialsProtected, copy.aiTutor.materialsUnavailable, copy.common.errorFallback, createDocumentMutation, setNotice, userId],
  );

  const handleDeleteDocument = useCallback(
    async (document: TutorDocument) => {
      try {
        await deleteDocumentMutation.mutateAsync(document.id);
      } catch (error) {
        setNotice({
          tone: 'error',
          text: resolveTutorErrorMessage(error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable),
        });
        captureViewerError(error, { area: 'ai_tutor_document_delete', documentId: document.id });
      }
    },
    [copy.aiTutor.materialsUnavailable, copy.common.errorFallback, deleteDocumentMutation, setNotice],
  );

  const handleCommitDocumentTitle = useCallback(
    async (document: TutorDocument, rawTitle: string) => {
      const nextDisplayTitle = rawTitle.trim();
      const currentDisplayTitle = document.display_title?.trim() ?? '';
      if (nextDisplayTitle === currentDisplayTitle) {
        setEditingDocumentId(null);
        setEditingDocumentTitle('');
        return;
      }

      try {
        await updateDocumentTitleMutation.mutateAsync({
          documentId: document.id,
          displayTitle: rawTitle,
        });
        setEditingDocumentId(null);
        setEditingDocumentTitle('');
      } catch (error) {
        const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
        const code = typeof record?.code === 'string' ? record.code : '';
        setNotice({
          tone: 'error',
          text:
            code === TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE
              ? copy.aiTutor.materialTitleUnavailable
              : resolveTutorErrorMessage(error, copy.common.errorFallback, copy.aiTutor.materialsUnavailable),
        });
        captureViewerError(error, { area: 'ai_tutor_document_title_update', documentId: document.id });
      }
    },
    [copy.aiTutor.materialTitleUnavailable, copy.aiTutor.materialsUnavailable, copy.common.errorFallback, setNotice, updateDocumentTitleMutation],
  );

  useEffect(() => {
    const currentIds = new Set(documents.map((document) => document.id));
    setSelectedDocumentIds((current) => {
      const next = current.filter((id) => currentIds.has(id));
      documents.forEach((document) => {
        if (!knownDocumentIdsRef.current.has(document.id)) {
          next.push(document.id);
        }
      });
      const deduped = [...new Set(next)];
      if (deduped.length === current.length && deduped.every((id, index) => id === current[index])) {
        return current;
      }
      return deduped;
    });
    knownDocumentIdsRef.current = currentIds;
  }, [documents]);

  return {
    cancelTitleCommitRef,
    createDocumentMutation,
    deleteDocumentMutation,
    documents,
    documentsErrorMessage,
    documentsQuery,
    editingDocumentId,
    editingDocumentTitle,
    fileInputRef,
    handleCommitDocumentTitle,
    handleDeleteDocument,
    handleUploadFiles,
    pendingUploads,
    selectedDocumentIds,
    setEditingDocumentId,
    setEditingDocumentTitle,
    setSelectedDocumentIds,
    updateDocumentTitleMutation,
  };
}
