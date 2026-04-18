import { useCallback, useEffect, useRef, useState } from 'react';
import type { MindMapDocument } from '@/shared/api/viewer/types';
import type { HistoryState, SaveStatus } from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';
import { cloneMindMapDocument, MAX_HISTORY_ENTRIES } from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';

export function useMindMapHistory({
  document,
  selectedNodeId,
  setDocument,
  setSelectedNodeId,
  setSaveStatus,
}: {
  document: MindMapDocument | null;
  selectedNodeId: string;
  setDocument: React.Dispatch<React.SetStateAction<MindMapDocument | null>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
}) {
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const historyRef = useRef(history);
  const latestDocumentRef = useRef(document);
  const latestSelectedNodeIdRef = useRef(selectedNodeId);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  useEffect(() => {
    latestSelectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const resetHistory = useCallback(() => {
    const nextHistory = { past: [], future: [] };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const pushSnapshot = useCallback((snapshot: MindMapDocument) => {
    setHistory((current) => {
      const nextHistory = {
        past: [...current.past.slice(-MAX_HISTORY_ENTRIES + 1), cloneMindMapDocument(snapshot)],
        future: [],
      };
      historyRef.current = nextHistory;
      return nextHistory;
    });
  }, []);

  const undo = useCallback(() => {
    const currentDocument = latestDocumentRef.current;
    const currentHistory = historyRef.current;
    if (!currentDocument || currentHistory.past.length === 0) {
      return;
    }

    const previous = cloneMindMapDocument(currentHistory.past[currentHistory.past.length - 1]);
    const nextHistory = {
      past: currentHistory.past.slice(0, -1),
      future: [cloneMindMapDocument(currentDocument), ...currentHistory.future.slice(0, MAX_HISTORY_ENTRIES - 1)],
    };
    const nextSelectedNodeId = previous.nodes[latestSelectedNodeIdRef.current]
      ? latestSelectedNodeIdRef.current
      : previous.rootNodeId;

    historyRef.current = nextHistory;
    latestDocumentRef.current = previous;
    latestSelectedNodeIdRef.current = nextSelectedNodeId;
    setHistory(nextHistory);
    setDocument(previous);
    setSelectedNodeId(nextSelectedNodeId);
    setSaveStatus('dirty');
  }, [setDocument, setSaveStatus, setSelectedNodeId]);

  const redo = useCallback(() => {
    const currentDocument = latestDocumentRef.current;
    const currentHistory = historyRef.current;
    if (!currentDocument || currentHistory.future.length === 0) {
      return;
    }

    const [nextSnapshot, ...remaining] = currentHistory.future;
    const next = cloneMindMapDocument(nextSnapshot);
    const nextHistory = {
      past: [...currentHistory.past.slice(-MAX_HISTORY_ENTRIES + 1), cloneMindMapDocument(currentDocument)],
      future: remaining,
    };
    const nextSelectedNodeId = next.nodes[latestSelectedNodeIdRef.current]
      ? latestSelectedNodeIdRef.current
      : next.rootNodeId;

    historyRef.current = nextHistory;
    latestDocumentRef.current = next;
    latestSelectedNodeIdRef.current = nextSelectedNodeId;
    setHistory(nextHistory);
    setDocument(next);
    setSelectedNodeId(nextSelectedNodeId);
    setSaveStatus('dirty');
  }, [setDocument, setSaveStatus, setSelectedNodeId]);

  return {
    history,
    pushSnapshot,
    redo,
    resetHistory,
    setHistory,
    undo,
  };
}
