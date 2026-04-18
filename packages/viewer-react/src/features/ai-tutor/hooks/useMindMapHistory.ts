import { useCallback, useState } from 'react';
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

  const resetHistory = useCallback(() => {
    setHistory({ past: [], future: [] });
  }, []);

  const pushSnapshot = useCallback((snapshot: MindMapDocument) => {
    setHistory((current) => ({
      past: [...current.past.slice(-MAX_HISTORY_ENTRIES + 1), cloneMindMapDocument(snapshot)],
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    if (!document || history.past.length === 0) {
      return;
    }

    const previous = cloneMindMapDocument(history.past[history.past.length - 1]);
    setHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [cloneMindMapDocument(document), ...current.future.slice(0, MAX_HISTORY_ENTRIES - 1)],
    }));
    setDocument(previous);
    setSelectedNodeId(previous.nodes[selectedNodeId] ? selectedNodeId : previous.rootNodeId);
    setSaveStatus('dirty');
  }, [document, history.past, selectedNodeId, setDocument, setSaveStatus, setSelectedNodeId]);

  const redo = useCallback(() => {
    if (!document || history.future.length === 0) {
      return;
    }

    const [nextSnapshot, ...remaining] = history.future;
    const next = cloneMindMapDocument(nextSnapshot);
    setHistory((current) => ({
      past: [...current.past.slice(-MAX_HISTORY_ENTRIES + 1), cloneMindMapDocument(document)],
      future: remaining,
    }));
    setDocument(next);
    setSelectedNodeId(next.nodes[selectedNodeId] ? selectedNodeId : next.rootNodeId);
    setSaveStatus('dirty');
  }, [document, history.future, selectedNodeId, setDocument, setSaveStatus, setSelectedNodeId]);

  return {
    history,
    pushSnapshot,
    redo,
    resetHistory,
    setHistory,
    undo,
  };
}
