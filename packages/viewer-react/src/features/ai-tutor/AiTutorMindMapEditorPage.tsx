import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import {
  createDefaultMindMapLayout,
  createDefaultMindMapNodeStyle,
  createDefaultMindMapTheme,
  normalizeMindMapLayout,
  normalizeMindMapNodeStyle,
  normalizeMindMapTheme,
  resolveMindMapThemePalette,
} from '@/features/ai-tutor/mindMapAppearance';
import { buildMindMapCanvasLayout } from '@/features/ai-tutor/mindMapCanvasLayout';
import {
  addChildMindMapNode,
  addSiblingMindMapNode,
  getMindMapRootNode,
  isMindMapDescendant,
  moveMindMapNode,
  normalizeMindMapDocumentForSave,
  promoteMindMapNode,
  removeMindMapNode,
  renameMindMapNode,
  toggleMindMapNodeCollapsed,
  updateMindMapNode,
  type MindMapDropPosition,
} from '@/features/ai-tutor/mindMapDocument';
import {
  ContextMenuButton,
  MindMapCanvas,
  MindMapEditorToolbar,
  MindMapInspector,
  MindMapShortcutsDialog,
} from '@/features/ai-tutor/components/mindmap-editor/MindMapEditorComponents';
import { uploadMindMapImage } from '@/features/ai-tutor/uploadMindMapImage';
import {
  fetchMindMap,
  fetchTutorDocuments,
} from '@/shared/api/viewer/tutorDocumentsApi';
import { useMindMapAutosave } from '@/features/ai-tutor/hooks/useMindMapAutosave';
import { useMindMapHistory } from '@/features/ai-tutor/hooks/useMindMapHistory';
import {
  clampZoom,
  editorCopy,
  type InspectorSectionKey,
  isEditableElement,
  ZOOM_STEP,
  type MindMapDropTarget,
} from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import type {
  MindMapDocument,
  MindMapMarker,
  MindMapNode,
  MindMapThemePreset,
} from '@/shared/api/viewer/types';

export function AiTutorMindMapEditorPage() {
  const language = useProductLanguage();
  const labels = editorCopy(language);
  const { mindMapId } = useParams<{ mindMapId: string }>();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const [document, setDocument] = useState<MindMapDocument | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MindMapDropTarget>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [openMenuNodeId, setOpenMenuNodeId] = useState<string | null>(null);
  const [sectionState, setSectionState] = useState<Record<InspectorSectionKey, boolean>>({
    topic: true,
    style: true,
    assets: false,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hydratedMindMapIdRef = useRef<string | null>(null);

  const documentQuery = useQuery({
    queryKey: ['ai-tutor', 'mindmap', mindMapId ?? 'missing'],
    enabled: Boolean(mindMapId),
    queryFn: () => fetchMindMap(mindMapId!),
    staleTime: 30_000,
  });

  const documentsQuery = useQuery({
    queryKey: ['ai-tutor', 'documents', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: fetchTutorDocuments,
    staleTime: 30_000,
  });

  const availableDocuments = documentsQuery.data ?? [];
  const availableDocumentIds = useMemo(
    () => (documentsQuery.data ? new Set(documentsQuery.data.map((item) => item.id)) : null),
    [documentsQuery.data],
  );

  const {
    markDirty,
    resetAutosaveState,
    saveErrorMessage,
    saveStatus,
    setSaveStatus,
  } = useMindMapAutosave({
    document,
    setDocument,
    availableDocumentIds,
    labels,
    mindMapId,
    userId,
  });

  const { pushSnapshot, redo, resetHistory, undo } = useMindMapHistory({
    document,
    selectedNodeId,
    setDocument,
    setSelectedNodeId,
    setSaveStatus,
  });

  useEffect(() => {
    if (!documentQuery.data) {
      return;
    }

    const normalizedDocument = normalizeMindMapDocumentForSave({
      ...documentQuery.data,
      theme: normalizeMindMapTheme(documentQuery.data.theme ?? createDefaultMindMapTheme()),
      layout: normalizeMindMapLayout(documentQuery.data.layout ?? createDefaultMindMapLayout()),
      nodes: Object.fromEntries(
        Object.entries(documentQuery.data.nodes).map(([nodeId, node]) => [
          nodeId,
          {
            ...node,
            markers: node.markers ?? [],
            style: normalizeMindMapNodeStyle(node.style ?? createDefaultMindMapNodeStyle()),
          },
        ]),
      ),
    });

    const isNewMindMap = hydratedMindMapIdRef.current !== normalizedDocument.id;
    if (!document || isNewMindMap) {
      hydratedMindMapIdRef.current = normalizedDocument.id;
      setDocument(normalizedDocument);
      setSelectedNodeId(normalizedDocument.rootNodeId);
      resetHistory();
      setFocusNodeId(null);
      setZoom(1);
      resetAutosaveState(normalizedDocument);
    }
  }, [document, documentQuery.data, resetAutosaveState, resetHistory]);

  const resolvedSelectedNodeId = document
    ? (document.nodes[selectedNodeId] ? selectedNodeId : document.rootNodeId)
    : '';
  const resolvedFocusNodeId = document && focusNodeId && document.nodes[focusNodeId] ? focusNodeId : null;
  const rootNode = document ? getMindMapRootNode(document) : null;
  const themePalette = resolveMindMapThemePalette(document?.theme ?? createDefaultMindMapTheme());
  const canvasLayout = useMemo(
    () => (document ? buildMindMapCanvasLayout(document, resolvedFocusNodeId) : null),
    [document, resolvedFocusNodeId],
  );
  const visibleSelectedNodeId =
    canvasLayout?.nodeBoxes[resolvedSelectedNodeId]
      ? resolvedSelectedNodeId
      : canvasLayout?.visualRootId ?? resolvedSelectedNodeId;
  const selectedNode = document ? document.nodes[visibleSelectedNodeId] ?? null : null;
  const selectedBox = selectedNode && canvasLayout ? canvasLayout.nodeBoxes[selectedNode.id] ?? null : null;
  const currentThemePreset = normalizeMindMapTheme(document?.theme ?? createDefaultMindMapTheme()).preset;
  const activeOpenMenuNodeId = openMenuNodeId === selectedNode?.id ? openMenuNodeId : null;

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setOpenMenuNodeId(null);
    viewportRef.current?.focus();
  };

  const centerOnNode = (nodeId: string, nextZoom = zoom, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    const targetBox = canvasLayout?.nodeBoxes[nodeId];
    if (!viewport || !targetBox) {
      return;
    }

    const nextLeft = targetBox.x * nextZoom + (targetBox.width * nextZoom) / 2 - viewport.clientWidth / 2;
    const nextTop = targetBox.y * nextZoom + (targetBox.height * nextZoom) / 2 - viewport.clientHeight / 2;
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({
        left: nextLeft,
        top: nextTop,
        behavior,
      });
      return;
    }

    viewport.scrollLeft = nextLeft;
    viewport.scrollTop = nextTop;
  };

  const replaceDocument = (
    nextDocument: MindMapDocument,
    options: { pushHistory?: boolean } = { pushHistory: true },
  ) => {
    if (!document) {
      return;
    }

    if (JSON.stringify(nextDocument) === JSON.stringify(document)) {
      return;
    }

    if (options.pushHistory !== false) {
      pushSnapshot(document);
    }

    setDocument(nextDocument);
    markDirty();
  };

  const applyDocumentChange = (
    updater: (current: MindMapDocument) => MindMapDocument,
    options: { pushHistory?: boolean } = { pushHistory: true },
  ) => {
    if (!document) {
      return;
    }

    replaceDocument(updater(document), options);
  };

  const handleCommitEditing = () => {
    if (!document || !editingNodeId) {
      return;
    }

    replaceDocument(renameMindMapNode(document, editingNodeId, editingLabel));
    setEditingNodeId(null);
  };

  const updateSelectedNode = (patch: Partial<MindMapNode>) => {
    if (!document || !selectedNode) {
      return;
    }

    applyDocumentChange((current) => updateMindMapNode(current, selectedNode.id, patch));
  };

  const toggleMarker = (marker: MindMapMarker) => {
    if (!selectedNode) {
      return;
    }

    updateSelectedNode({
      markers: selectedNode.markers.includes(marker)
        ? selectedNode.markers.filter((item) => item !== marker)
        : [...selectedNode.markers, marker],
    });
  };

  const updateSelectedNodeStyle = (patch: Partial<MindMapNode['style']>) => {
    if (!selectedNode) {
      return;
    }

    updateSelectedNode({
      style: {
        ...selectedNode.style,
        ...patch,
      },
    });
  };

  const handleAddChild = (nodeId: string) => {
    if (!document) {
      return;
    }

    const result = addChildMindMapNode(document, nodeId);
    if (!result.nodeId) {
      return;
    }

    replaceDocument(result.document);
    setSelectedNodeId(result.nodeId);
    setEditingNodeId(result.nodeId);
    setEditingLabel('');
  };

  const handleAddSibling = (nodeId: string) => {
    if (!document) {
      return;
    }

    const result = addSiblingMindMapNode(document, nodeId);
    if (!result.nodeId) {
      return;
    }

    replaceDocument(result.document);
    setSelectedNodeId(result.nodeId);
    setEditingNodeId(result.nodeId);
    setEditingLabel('');
  };

  const handleDelete = (nodeId: string) => {
    if (!document) {
      return;
    }

    const currentNode = document.nodes[nodeId];
    if (!currentNode) {
      return;
    }

    const nextDocument = removeMindMapNode(document, nodeId);
    replaceDocument(nextDocument);
    setSelectedNodeId(currentNode.parentId && nextDocument.nodes[currentNode.parentId] ? currentNode.parentId : nextDocument.rootNodeId);
  };

  const handlePromote = (nodeId: string) => {
    if (!document) {
      return;
    }

    replaceDocument(promoteMindMapNode(document, nodeId));
  };

  const handleToggleCollapse = (nodeId: string) => {
    if (!document) {
      return;
    }

    replaceDocument(toggleMindMapNodeCollapsed(document, nodeId));
  };

  const handleDragOverTarget = (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLElement>) => {
    if (!document || !draggingNodeId) {
      return;
    }

    if (
      draggingNodeId === targetId ||
      draggingNodeId === document.rootNodeId ||
      (position !== 'inside' && targetId === document.rootNodeId) ||
      isMindMapDescendant(document, draggingNodeId, targetId)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDropTarget({ nodeId: targetId, position });
  };

  const handleDropTarget = (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLElement>) => {
    if (!document || !draggingNodeId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextDocument = moveMindMapNode(document, draggingNodeId, targetId, position);
    replaceDocument(nextDocument);
    setSelectedNodeId(draggingNodeId);
    setDraggingNodeId(null);
    setDropTarget(null);
  };

  const handleNodeDragStart = (nodeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    setDraggingNodeId(nodeId);
  };

  const handleNodeDragEnd = () => {
    setDraggingNodeId(null);
    setDropTarget(null);
  };

  const fitMapToViewport = () => {
    if (!canvasLayout || !viewportRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    const nextZoom = clampZoom(
      Math.min(
        (viewport.clientWidth - 72) / Math.max(canvasLayout.width, 1),
        (viewport.clientHeight - 72) / Math.max(canvasLayout.height, 1),
      ),
    );
    setZoom(nextZoom);
    window.requestAnimationFrame(() => centerOnNode(canvasLayout.visualRootId, nextZoom, 'auto'));
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!document || !selectedNode || isEditableElement(event.target)) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedNode.id !== document.rootNodeId) {
        handleAddSibling(selectedNode.id);
      }
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        handlePromote(selectedNode.id);
      } else {
        handleAddChild(selectedNode.id);
      }
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (selectedNode.id !== document.rootNodeId) {
        event.preventDefault();
        handleDelete(selectedNode.id);
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !document || !selectedNode || !userId) {
      return;
    }

    setImageUploadError(null);
    try {
      setSaveStatus('saving');
      const imageUrl = await uploadMindMapImage({
        file,
        userId,
        mindMapId: document.id,
        nodeId: selectedNode.id,
      });
      updateSelectedNode({ imageUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.imageUploading;
      setImageUploadError(message);
      captureViewerError(error, { area: 'ai_tutor_mindmap_image_upload', mindMapId: document.id, nodeId: selectedNode.id });
    }
  };

  useEffect(() => {
    if (!canvasLayout) {
      return;
    }

    window.requestAnimationFrame(() => centerOnNode(canvasLayout.visualRootId, zoom, 'auto'));
  }, [canvasLayout?.visualRootId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mindMapId) {
    return <Navigate to="/ai-tutor" replace />;
  }

  if (documentQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-medium text-[#8b7d72]">
        {labels.loading}
      </div>
    );
  }

  if (documentQuery.error || !document || !selectedNode || !rootNode || !canvasLayout) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1380px] flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
          <ContextMenuButton onClick={() => window.history.back()}>{labels.back}</ContextMenuButton>
        </div>
        <div className="viewer-surface flex flex-1 items-center justify-center bg-[rgba(254,250,245,0.94)] p-8">
          <div className="text-center">
            <div className="text-[1.6rem] font-semibold text-[#3d342a]">{labels.unavailable}</div>
          </div>
        </div>
      </div>
    );
  }

  const staleDocumentRefs = availableDocumentIds
    ? selectedNode.documentRefs.filter((documentId) => !availableDocumentIds.has(documentId))
    : [];
  const contextToolbarTop = selectedBox ? Math.max(12, selectedBox.y - 54) : 12;

  return (
    <div className={`mx-auto flex h-full w-full flex-col overflow-hidden ${isFocusMode ? 'max-w-none px-2 py-2 md:px-4' : 'max-w-[1680px] px-4 py-4 md:px-5'}`}>
      <MindMapEditorToolbar
        labels={labels}
        themePalette={themePalette}
        documentTitle={document.title || labels.untitledMap}
        saveStatus={saveStatus}
        zoom={zoom}
        isSelectedNodeFocused={resolvedFocusNodeId === selectedNode.id}
        isFocusMode={isFocusMode}
        inspectorOpen={inspectorOpen}
        onDocumentTitleChange={(value) =>
          applyDocumentChange((current) => renameMindMapNode(current, current.rootNodeId, value || labels.untitledMap))
        }
        onUndo={undo}
        onRedo={redo}
        onZoomOut={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
        onZoomIn={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
        onFitMap={fitMapToViewport}
        onCenterRoot={() => centerOnNode(canvasLayout.visualRootId)}
        onToggleSelectedFocus={() =>
          setFocusNodeId((current) =>
            selectedNode.id === document.rootNodeId
              ? null
              : current === selectedNode.id
                ? null
                : selectedNode.id,
          )
        }
        onToggleFocusMode={() => setIsFocusMode((current) => !current)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onToggleInspector={() => setInspectorOpen((current) => !current)}
      />

      <div className={`mt-4 min-h-0 flex-1 gap-4 ${inspectorOpen ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid grid-cols-[minmax(0,1fr)]'}`}>
        <MindMapCanvas
          labels={labels}
          themePalette={themePalette}
          inspectorOpen={inspectorOpen}
          viewportRef={viewportRef}
          zoom={zoom}
          onCanvasKeyDown={handleCanvasKeyDown}
          onCanvasWheelZoom={(event) => {
            if (!(event.metaKey || event.ctrlKey)) {
              return;
            }
            event.preventDefault();
            setZoom((current) => clampZoom(current + (event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
          }}
          canvasLayout={canvasLayout}
          documentNodes={document.nodes}
          draggingNodeId={draggingNodeId}
          dropTarget={dropTarget}
          documentRootNodeId={document.rootNodeId}
          selectedBox={selectedBox}
          contextToolbarTop={contextToolbarTop}
          selectedNode={selectedNode}
          focusNodeId={resolvedFocusNodeId}
          openMenuNodeId={activeOpenMenuNodeId}
          currentThemePreset={currentThemePreset}
          editingNodeId={editingNodeId}
          editingLabel={editingLabel}
          onToggleOpenMenu={() => setOpenMenuNodeId((current) => (current === selectedNode.id ? null : selectedNode.id))}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onToggleCollapse={handleToggleCollapse}
          onPromote={(nodeId) => {
            handlePromote(nodeId);
            setOpenMenuNodeId(null);
          }}
          onToggleFocus={() => {
            setFocusNodeId(selectedNode.id === document.rootNodeId ? null : selectedNode.id);
            setOpenMenuNodeId(null);
          }}
          onDelete={(nodeId) => {
            handleDelete(nodeId);
            setOpenMenuNodeId(null);
          }}
          onSelectNode={selectNode}
          onBeginEdit={(nodeId, label) => {
            selectNode(nodeId);
            setEditingNodeId(nodeId);
            setEditingLabel(label);
          }}
          onEditingLabelChange={setEditingLabel}
          onCommitEditing={handleCommitEditing}
          onCancelEditing={(label) => {
            setEditingNodeId(null);
            setEditingLabel(label);
          }}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragEnd={handleNodeDragEnd}
          onDragOverTarget={handleDragOverTarget}
          onDropTarget={handleDropTarget}
        />

        <MindMapInspector
          labels={labels}
          themePalette={themePalette}
          isFocusMode={isFocusMode}
          inspectorOpen={inspectorOpen}
          sectionState={sectionState}
          selectedNode={selectedNode}
          selectedNodeLabel={selectedNode.label}
          currentThemePreset={currentThemePreset}
          focusNodeId={focusNodeId}
          rootNodeId={document.rootNodeId}
          availableDocuments={availableDocuments}
          staleDocumentRefs={staleDocumentRefs}
          imageUploadError={imageUploadError}
          saveStatus={saveStatus}
          saveErrorMessage={saveErrorMessage}
          onToggleSection={(section) => setSectionState((current) => ({ ...current, [section]: !current[section] }))}
          onRenameSelectedNode={(value) => applyDocumentChange((current) => renameMindMapNode(current, selectedNode.id, value))}
          onUpdateSelectedNode={updateSelectedNode}
          onToggleMarker={toggleMarker}
          onAddChild={() => handleAddChild(selectedNode.id)}
          onAddSibling={() => handleAddSibling(selectedNode.id)}
          onPromote={() => handlePromote(selectedNode.id)}
          onToggleCollapse={() => handleToggleCollapse(selectedNode.id)}
          onToggleFocus={() => setFocusNodeId(selectedNode.id === document.rootNodeId ? null : selectedNode.id)}
          onDelete={() => handleDelete(selectedNode.id)}
          onUpdateSelectedNodeStyle={updateSelectedNodeStyle}
          onSetTheme={(preset: MindMapThemePreset) =>
            applyDocumentChange((current) => ({
              ...current,
              theme: { preset },
            }))
          }
          onAddLink={() =>
            updateSelectedNode({
              links: [
                ...selectedNode.links,
                { id: `link-${crypto.randomUUID()}`, label: '', url: '' },
              ],
            })
          }
          onUpdateLink={(index, patch) =>
            updateSelectedNode({
              links: selectedNode.links.map((link, linkIndex) =>
                linkIndex === index ? { ...link, ...patch } : link,
              ),
            })
          }
          onRemoveLink={(index) =>
            updateSelectedNode({
              links: selectedNode.links.filter((_, linkIndex) => linkIndex !== index),
            })
          }
          onUploadImage={(file) => {
            void handleImageUpload(file);
          }}
        />
      </div>

      <MindMapShortcutsDialog
        labels={labels}
        open={showShortcuts}
        close={() => setShowShortcuts(false)}
      />
    </div>
  );
}
