import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import type * as React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Link2,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MIND_MAP_BRANCH_COLOR_OPTIONS,
  MIND_MAP_FILL_OPTIONS,
  MIND_MAP_MARKERS,
  resolveMindMapThemePalette,
} from '@/features/ai-tutor/mindMapAppearance';
import { buildMindMapCanvasLayout } from '@/features/ai-tutor/mindMapCanvasLayout';
import type { MindMapDropPosition } from '@/features/ai-tutor/mindMapDocument';
import type {
  MindMapMarker,
  MindMapNode,
  MindMapThemePreset,
  TutorDocument,
} from '@/shared/api/viewer/types';
import {
  branchLabel,
  BRANCH_SWATCHES,
  buildCanvasPattern,
  FILL_SWATCHES,
  fillLabel,
  MARKER_META,
  markerLabel,
  markerToneStyles,
  resolveNodeSurface,
  saveStatusTone,
  shapeLabel,
  themeLabel,
} from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';
import type {
  EditorCopy,
  MindMapDropTarget,
  SaveStatus,
} from '@/features/ai-tutor/mindmap-editor/mindMapEditorShared';

function NoteEditor({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (nextValue: string) => void;
}) {
  const lastSavedRef = useRef(value);
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
      ],
      content: value,
      immediatelyRender: false,
      onUpdate({ editor: instance }) {
        const nextValue = instance.getHTML();
        lastSavedRef.current = nextValue;
        onChange(nextValue);
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (value !== lastSavedRef.current) {
      editor.commands.setContent(value || '<p></p>', false);
      lastSavedRef.current = value;
    }
  }, [editor, value]);

  return (
    <div className="rounded-[20px] border border-[#ddd3c3] bg-white/75 px-3 py-3">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[180px] text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#9c8f80] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

function InspectorSection({
  title,
  isOpen,
  onToggle,
  children,
  labels,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  labels: EditorCopy;
}) {
  return (
    <section className="rounded-[24px] border border-[#ddd3c3] bg-white/82 shadow-[0_10px_26px_rgba(56,42,28,0.05)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        aria-label={isOpen ? labels.closeSection : labels.openSection}
      >
        <span className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7e7367]">{title}</span>
        {isOpen ? <ChevronDown size={16} className="text-[#8c8074]" /> : <ChevronRight size={16} className="text-[#8c8074]" />}
      </button>
      {isOpen ? <div className="border-t border-[#ebe1d3] px-4 py-4">{children}</div> : null}
    </section>
  );
}

export function ContextMenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="rounded-full border border-[#ddd3c3] bg-white/90 px-2.5 py-1 text-[0.72rem] font-semibold text-[#6d6358] transition hover:border-[#c8bbab] hover:bg-white"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function MindMapNodeCard({
  node,
  box,
  isRoot,
  isSelected,
  isEditing,
  editingLabel,
  labels,
  themePreset,
  dropTarget,
  draggingNodeId,
  onSelect,
  onBeginEdit,
  onEditingLabelChange,
  onCommitEditing,
  onCancelEditing,
  onDragStart,
  onDragEnd,
  onDragOverInside,
  onDropInside,
}: {
  node: MindMapNode;
  box: ReturnType<typeof buildMindMapCanvasLayout>['nodeBoxes'][string];
  isRoot: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingLabel: string;
  labels: EditorCopy;
  themePreset: MindMapThemePreset;
  dropTarget: MindMapDropTarget;
  draggingNodeId: string | null;
  onSelect: () => void;
  onBeginEdit: () => void;
  onEditingLabelChange: (value: string) => void;
  onCommitEditing: () => void;
  onCancelEditing: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOverInside: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropInside: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const surface = resolveNodeSurface({
    node,
    themePreset,
    depth: box.depth,
    side: box.side,
    isRoot,
    isSelected,
  });

  return (
    <div
      data-testid={`mindmap-node-${node.id}`}
      data-side={box.side}
      className="absolute"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        minHeight: box.height,
      }}
    >
      <div
        className={`group relative overflow-hidden border px-4 py-3 transition ${draggingNodeId === node.id ? 'opacity-40' : ''}`}
        style={{
          background: surface.background,
          borderColor: dropTarget?.nodeId === node.id && dropTarget.position === 'inside' ? surface.accent : surface.border,
          borderBottomColor: surface.borderBottom,
          borderBottomWidth: node.style.shape === 'underline' ? 3 : 1,
          borderRadius: surface.borderRadius,
          boxShadow: surface.boxShadow,
        }}
        draggable={!isRoot}
        onClick={onSelect}
        onDoubleClick={onBeginEdit}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOverInside}
        onDrop={onDropInside}
      >
        <div className="flex items-start gap-3">
          {!isRoot ? (
            <div className="mt-1 cursor-grab text-[#9d8e82] active:cursor-grabbing">
              <GripVertical size={15} />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingLabel}
                    onChange={(event) => onEditingLabelChange(event.target.value)}
                    onBlur={onCommitEditing}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onCommitEditing();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        onCancelEditing();
                      }
                    }}
                    className="w-full border-0 bg-transparent text-[1rem] font-semibold leading-7 text-[#322820] outline-none"
                  />
                ) : (
                  <div className={`text-[1rem] leading-7 text-[#322820] ${node.style.emphasis === 'strong' || isRoot ? 'font-bold' : 'font-semibold'}`}>
                    {node.icon ? <span className="mr-2">{node.icon}</span> : null}
                    {node.label || labels.untitledNode}
                  </div>
                )}

                {node.markers.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {node.markers.map((marker) => (
                      <span
                        key={`${node.id}-${marker}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.63rem] font-bold uppercase tracking-[0.08em] ${markerToneStyles(MARKER_META[marker].tone)}`}
                      >
                        {MARKER_META[marker].short}
                      </span>
                    ))}
                  </div>
                ) : null}

                {node.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {node.tags.map((tag) => (
                      <span
                        key={`${node.id}-${tag}`}
                        className="rounded-full border border-[#d8dfcf] bg-white/70 px-2 py-0.5 text-[0.68rem] font-semibold text-[#617154]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {node.imageUrl ? (
                  <img
                    src={node.imageUrl}
                    alt={node.label}
                    className="mt-3 h-20 w-full rounded-[16px] border border-white/60 object-cover"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MindMapSelectionToolbar({
  labels,
  selectedBox,
  contextToolbarTop,
  selectedNodeId,
  selectedNodeIsRoot,
  selectedNodeCollapsed,
  openMenuNodeId,
  focusNodeId,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onToggleOpenMenu,
  onPromote,
  onToggleFocus,
  onDelete,
}: {
  labels: EditorCopy;
  selectedBox: ReturnType<typeof buildMindMapCanvasLayout>['nodeBoxes'][string] | null;
  contextToolbarTop: number;
  selectedNodeId: string;
  selectedNodeIsRoot: boolean;
  selectedNodeCollapsed: boolean;
  openMenuNodeId: string | null;
  focusNodeId: string | null;
  onAddChild: () => void;
  onAddSibling: () => void;
  onToggleCollapse: () => void;
  onToggleOpenMenu: () => void;
  onPromote: () => void;
  onToggleFocus: () => void;
  onDelete: () => void;
}) {
  if (!selectedBox) {
    return null;
  }

  return (
    <div
      data-testid="mindmap-selection-toolbar"
      className="absolute z-10"
      style={{
        left: selectedBox.x + selectedBox.width / 2,
        top: contextToolbarTop,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="relative flex items-center gap-2 rounded-full border border-white/80 bg-white/92 px-2.5 py-2 shadow-[0_16px_34px_rgba(28,22,18,0.12)]">
        <ContextMenuButton onClick={onAddChild}>{labels.addChild}</ContextMenuButton>
        <ContextMenuButton onClick={onAddSibling}>{labels.addSibling}</ContextMenuButton>
        <ContextMenuButton onClick={onToggleCollapse}>
          {selectedNodeCollapsed ? labels.expand : labels.collapse}
        </ContextMenuButton>
        <ContextMenuButton onClick={onToggleOpenMenu}>{labels.more}</ContextMenuButton>

        {openMenuNodeId === selectedNodeId ? (
          <div className="absolute right-0 top-[calc(100%+10px)] w-44 rounded-[18px] border border-[#ddd3c3] bg-white p-2 shadow-[0_18px_48px_rgba(44,34,24,0.12)]">
            <button
              type="button"
              className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#53483d] hover:bg-[#f5efe6]"
              onClick={onPromote}
            >
              {labels.promote}
            </button>
            <button
              type="button"
              className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#53483d] hover:bg-[#f5efe6]"
              onClick={onToggleFocus}
            >
              {focusNodeId === selectedNodeId ? labels.clearFocus : labels.focusSelected}
            </button>
            <button
              type="button"
              className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#9d5555] hover:bg-[#fff3f3]"
              disabled={selectedNodeIsRoot}
              onClick={onDelete}
            >
              {labels.deleteNode}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MindMapEditorToolbar({
  labels,
  themePalette,
  documentTitle,
  saveStatus,
  zoom,
  isSelectedNodeFocused,
  isFocusMode,
  inspectorOpen,
  onDocumentTitleChange,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onFitMap,
  onCenterRoot,
  onToggleSelectedFocus,
  onToggleFocusMode,
  onShowShortcuts,
  onToggleInspector,
}: {
  labels: EditorCopy;
  themePalette: ReturnType<typeof resolveMindMapThemePalette>;
  documentTitle: string;
  saveStatus: SaveStatus;
  zoom: number;
  isSelectedNodeFocused: boolean;
  isFocusMode: boolean;
  inspectorOpen: boolean;
  onDocumentTitleChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitMap: () => void;
  onCenterRoot: () => void;
  onToggleSelectedFocus: () => void;
  onToggleFocusMode: () => void;
  onShowShortcuts: () => void;
  onToggleInspector: () => void;
}) {
  return (
    <div
      data-testid="mindmap-editor-toolbar"
      className="rounded-[30px] border px-4 py-3 shadow-[0_16px_38px_rgba(44,34,24,0.08)]"
      style={{
        background: themePalette.panel,
        borderColor: themePalette.edge,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
            <span className="flex items-center gap-2">
              <ArrowLeft size={16} />
              {labels.back}
            </span>
          </Link>
          <div className="min-w-0">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#86796b]">{labels.toolbarTitle}</div>
            <input
              value={documentTitle}
              onChange={(event) => onDocumentTitleChange(event.target.value)}
              className="mt-1 min-w-[18rem] max-w-[28rem] border-0 bg-transparent p-0 text-[1.08rem] font-semibold text-[#2f2822] outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`rounded-full border px-3 py-1.5 text-[0.76rem] font-semibold ${saveStatusTone(saveStatus)}`}>
            {saveStatus === 'saving'
              ? labels.saving
              : saveStatus === 'error'
                ? labels.saveError
                : saveStatus === 'dirty'
                  ? labels.dirty
                  : labels.saved}
          </div>

          <ContextMenuButton onClick={onUndo}>{labels.undo}</ContextMenuButton>
          <ContextMenuButton onClick={onRedo}>{labels.redo}</ContextMenuButton>
          <ContextMenuButton onClick={onZoomOut}>{labels.zoomOut}</ContextMenuButton>
          <div className="rounded-full border border-[#ddd3c3] bg-white/75 px-3 py-1.5 text-[0.76rem] font-semibold text-[#6d6358]">
            {Math.round(zoom * 100)}%
          </div>
          <ContextMenuButton onClick={onZoomIn}>{labels.zoomIn}</ContextMenuButton>
          <ContextMenuButton onClick={onFitMap}>{labels.fitMap}</ContextMenuButton>
          <ContextMenuButton onClick={onCenterRoot}>{labels.centerRoot}</ContextMenuButton>
          <ContextMenuButton onClick={onToggleSelectedFocus}>
            {isSelectedNodeFocused ? labels.clearFocus : labels.focusSelected}
          </ContextMenuButton>
          <ContextMenuButton onClick={onToggleFocusMode}>
            {isFocusMode ? labels.exitFocusMode : labels.focusMode}
          </ContextMenuButton>
          <ContextMenuButton onClick={onShowShortcuts}>{labels.shortcuts}</ContextMenuButton>
          <ContextMenuButton onClick={onToggleInspector}>
            {inspectorOpen ? labels.hideInspector : labels.showInspector}
          </ContextMenuButton>
        </div>
      </div>
    </div>
  );
}

export function MindMapCanvas({
  labels,
  themePalette,
  inspectorOpen,
  viewportRef,
  zoom,
  onCanvasKeyDown,
  onCanvasWheelZoom,
  canvasLayout,
  documentNodes,
  draggingNodeId,
  dropTarget,
  documentRootNodeId,
  selectedBox,
  contextToolbarTop,
  selectedNode,
  focusNodeId,
  openMenuNodeId,
  currentThemePreset,
  editingNodeId,
  editingLabel,
  onToggleOpenMenu,
  onAddChild,
  onAddSibling,
  onToggleCollapse,
  onPromote,
  onToggleFocus,
  onDelete,
  onSelectNode,
  onBeginEdit,
  onEditingLabelChange,
  onCommitEditing,
  onCancelEditing,
  onNodeDragStart,
  onNodeDragEnd,
  onDragOverTarget,
  onDropTarget,
}: {
  labels: EditorCopy;
  themePalette: ReturnType<typeof resolveMindMapThemePalette>;
  inspectorOpen: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onCanvasKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onCanvasWheelZoom: (event: React.WheelEvent<HTMLDivElement>) => void;
  canvasLayout: ReturnType<typeof buildMindMapCanvasLayout>;
  documentNodes: Record<string, MindMapNode>;
  draggingNodeId: string | null;
  dropTarget: MindMapDropTarget;
  documentRootNodeId: string;
  selectedBox: ReturnType<typeof buildMindMapCanvasLayout>['nodeBoxes'][string] | null;
  contextToolbarTop: number;
  selectedNode: MindMapNode;
  focusNodeId: string | null;
  openMenuNodeId: string | null;
  currentThemePreset: MindMapThemePreset;
  editingNodeId: string | null;
  editingLabel: string;
  onToggleOpenMenu: () => void;
  onAddChild: (nodeId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onPromote: (nodeId: string) => void;
  onToggleFocus: () => void;
  onDelete: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onBeginEdit: (nodeId: string, label: string) => void;
  onEditingLabelChange: (value: string) => void;
  onCommitEditing: () => void;
  onCancelEditing: (label: string) => void;
  onNodeDragStart: (nodeId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onNodeDragEnd: () => void;
  onDragOverTarget: (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLElement>) => void;
  onDropTarget: (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLElement>) => void;
}) {
  return (
    <section
      data-testid="mindmap-editor-canvas"
      className="relative min-h-0 overflow-hidden rounded-[34px] border shadow-[0_24px_64px_rgba(40,30,22,0.08)]"
      style={{
        background: themePalette.canvas,
        borderColor: themePalette.edge,
      }}
    >
      <div className="absolute left-5 top-4 z-10 flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[0.72rem] font-semibold text-[#6d6358]">
          {focusNodeId ? `${labels.focusSelected}: ${selectedNode.label || labels.untitledNode}` : labels.canvasHint}
        </div>
        {!inspectorOpen ? (
          <div className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[0.72rem] font-medium text-[#7b7268]">
            {labels.mobileInspectorBody}
          </div>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        data-testid="mindmap-canvas-viewport"
        tabIndex={0}
        className="viewer-scrollbar-hidden h-full overflow-auto outline-none"
        onKeyDown={onCanvasKeyDown}
        onWheel={onCanvasWheelZoom}
      >
        <div
          className="relative"
          style={{
            width: canvasLayout.width * zoom,
            height: canvasLayout.height * zoom,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: canvasLayout.width,
              height: canvasLayout.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              ...buildCanvasPattern(themePalette.grid),
            }}
          >
            <svg
              data-testid="mindmap-connection-layer"
              className="absolute inset-0"
              width={canvasLayout.width}
              height={canvasLayout.height}
              viewBox={`0 0 ${canvasLayout.width} ${canvasLayout.height}`}
              fill="none"
              aria-hidden="true"
            >
              {canvasLayout.connections.map((connection) => (
                <path
                  key={`${connection.fromId}-${connection.toId}`}
                  d={connection.d}
                  stroke={connection.side === 'left' ? '#8f9288' : '#7a9e7e'}
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  opacity="0.86"
                />
              ))}
            </svg>

            {draggingNodeId
              ? Object.values(canvasLayout.nodeBoxes).map((box) => {
                  if (box.nodeId === documentRootNodeId || box.nodeId === draggingNodeId) {
                    return null;
                  }

                  return (
                    <div key={`drop-${box.nodeId}`}>
                      <div
                        className={`absolute rounded-full border border-dashed transition ${dropTarget?.nodeId === box.nodeId && dropTarget.position === 'before' ? 'border-[#7a9e7e] bg-[#eef6ed]' : 'border-transparent bg-transparent'}`}
                        style={{
                          left: box.x - 10,
                          top: box.y - 12,
                          width: box.width + 20,
                          height: 8,
                        }}
                        onDragOver={onDragOverTarget(box.nodeId, 'before')}
                        onDrop={onDropTarget(box.nodeId, 'before')}
                      />
                      <div
                        className={`absolute rounded-full border border-dashed transition ${dropTarget?.nodeId === box.nodeId && dropTarget.position === 'after' ? 'border-[#7a9e7e] bg-[#eef6ed]' : 'border-transparent bg-transparent'}`}
                        style={{
                          left: box.x - 10,
                          top: box.y + box.height + 6,
                          width: box.width + 20,
                          height: 8,
                        }}
                        onDragOver={onDragOverTarget(box.nodeId, 'after')}
                        onDrop={onDropTarget(box.nodeId, 'after')}
                      />
                    </div>
                  );
                })
              : null}

            <MindMapSelectionToolbar
              labels={labels}
              selectedBox={selectedBox}
              contextToolbarTop={contextToolbarTop}
              selectedNodeId={selectedNode.id}
              selectedNodeIsRoot={selectedNode.id === documentRootNodeId}
              selectedNodeCollapsed={selectedNode.collapsed}
              openMenuNodeId={openMenuNodeId}
              focusNodeId={focusNodeId}
              onAddChild={() => onAddChild(selectedNode.id)}
              onAddSibling={() => onAddSibling(selectedNode.id)}
              onToggleCollapse={() => onToggleCollapse(selectedNode.id)}
              onToggleOpenMenu={onToggleOpenMenu}
              onPromote={() => onPromote(selectedNode.id)}
              onToggleFocus={onToggleFocus}
              onDelete={() => onDelete(selectedNode.id)}
            />

            {Object.values(canvasLayout.nodeBoxes).map((box) => {
              const node = documentNodes[box.nodeId];
              if (!node) {
                return null;
              }

              return (
                <MindMapNodeCard
                  key={box.nodeId}
                  node={node}
                  box={box}
                  isRoot={box.nodeId === canvasLayout.visualRootId}
                  isSelected={box.nodeId === selectedNode.id}
                  isEditing={box.nodeId === editingNodeId}
                  editingLabel={editingLabel}
                  labels={labels}
                  themePreset={currentThemePreset}
                  dropTarget={dropTarget}
                  draggingNodeId={draggingNodeId}
                  onSelect={() => onSelectNode(box.nodeId)}
                  onBeginEdit={() => onBeginEdit(box.nodeId, node.label)}
                  onEditingLabelChange={onEditingLabelChange}
                  onCommitEditing={onCommitEditing}
                  onCancelEditing={() => onCancelEditing(node.label)}
                  onDragStart={onNodeDragStart(box.nodeId)}
                  onDragEnd={onNodeDragEnd}
                  onDragOverInside={onDragOverTarget(box.nodeId, 'inside')}
                  onDropInside={onDropTarget(box.nodeId, 'inside')}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MindMapInspector({
  labels,
  themePalette,
  isFocusMode,
  inspectorOpen,
  sectionState,
  selectedNode,
  selectedNodeLabel,
  currentThemePreset,
  focusNodeId,
  rootNodeId,
  availableDocuments,
  staleDocumentRefs,
  imageUploadError,
  saveStatus,
  saveErrorMessage,
  onToggleSection,
  onRenameSelectedNode,
  onUpdateSelectedNode,
  onToggleMarker,
  onAddChild,
  onAddSibling,
  onPromote,
  onToggleCollapse,
  onToggleFocus,
  onDelete,
  onUpdateSelectedNodeStyle,
  onSetTheme,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
  onUploadImage,
}: {
  labels: EditorCopy;
  themePalette: ReturnType<typeof resolveMindMapThemePalette>;
  isFocusMode: boolean;
  inspectorOpen: boolean;
  sectionState: Record<'topic' | 'style' | 'assets', boolean>;
  selectedNode: MindMapNode;
  selectedNodeLabel: string;
  currentThemePreset: MindMapThemePreset;
  focusNodeId: string | null;
  rootNodeId: string;
  availableDocuments: TutorDocument[];
  staleDocumentRefs: string[];
  imageUploadError: string | null;
  saveStatus: SaveStatus;
  saveErrorMessage: string | null;
  onToggleSection: (section: 'topic' | 'style' | 'assets') => void;
  onRenameSelectedNode: (value: string) => void;
  onUpdateSelectedNode: (patch: Partial<MindMapNode>) => void;
  onToggleMarker: (marker: MindMapMarker) => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onPromote: () => void;
  onToggleCollapse: () => void;
  onToggleFocus: () => void;
  onDelete: () => void;
  onUpdateSelectedNodeStyle: (patch: Partial<MindMapNode['style']>) => void;
  onSetTheme: (preset: MindMapThemePreset) => void;
  onAddLink: () => void;
  onUpdateLink: (index: number, patch: Partial<{ label: string; url: string }>) => void;
  onRemoveLink: (index: number) => void;
  onUploadImage: (file: File | null) => void;
}) {
  return (
    <aside
      data-testid="mindmap-editor-inspector"
      className={`viewer-scrollbar-hidden overflow-auto rounded-[30px] border border-[#ddd3c3] shadow-[0_18px_48px_rgba(44,34,24,0.08)] ${isFocusMode ? 'xl:w-[320px]' : 'xl:w-[360px]'} ${inspectorOpen ? 'fixed inset-x-4 bottom-4 top-[5.6rem] z-30 flex xl:static' : 'hidden'} xl:flex xl:min-h-0`}
      style={{ background: themePalette.panel }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="rounded-[22px] border border-white/70 bg-white/58 px-4 py-3">
          <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7e7367]">{labels.topic}</div>
          <div className="mt-2 text-[1.05rem] font-semibold text-[#312821]">{selectedNodeLabel || labels.untitledNode}</div>
          <div className="mt-2 text-[0.78rem] font-medium text-[#7a7065]">{labels.canvasHint}</div>
        </div>

        <InspectorSection
          title={labels.topic}
          isOpen={sectionState.topic}
          onToggle={() => onToggleSection('topic')}
          labels={labels}
        >
          <div className="space-y-4">
            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.topicTitle}</div>
              <input
                value={selectedNode.label}
                onChange={(event) => onRenameSelectedNode(event.target.value || labels.untitledNode)}
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-white/75 px-4 py-3 text-[0.92rem] font-semibold text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.icon}</div>
              <input
                value={selectedNode.icon ?? ''}
                onChange={(event) => onUpdateSelectedNode({ icon: event.target.value || null })}
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-white/75 px-4 py-3 text-[0.9rem] font-medium text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.labels}</div>
              {selectedNode.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedNode.tags.map((tag) => (
                    <span
                      key={`${selectedNode.id}-${tag}`}
                      className="rounded-full border border-[#d7dfcc] bg-[#f5faf1] px-2 py-0.5 text-[0.72rem] font-semibold text-[#617154]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <input
                value={selectedNode.tags.join(', ')}
                placeholder={labels.labelsPlaceholder}
                onChange={(event) =>
                  onUpdateSelectedNode({
                    tags: event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-white/75 px-4 py-3 text-[0.9rem] font-medium text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.markers}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {MIND_MAP_MARKERS.map((marker) => {
                  const active = selectedNode.markers.includes(marker);
                  return (
                    <button
                      key={marker}
                      type="button"
                      className={`rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition ${active ? markerToneStyles(MARKER_META[marker].tone) : 'border-[#ddd3c3] bg-white/75 text-[#6d6358]'}`}
                      onClick={() => onToggleMarker(marker)}
                    >
                      {MARKER_META[marker].short} · {markerLabel(marker, labels)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.structure}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ContextMenuButton onClick={onAddChild}>{labels.addChild}</ContextMenuButton>
                <ContextMenuButton onClick={onAddSibling}>{labels.addSibling}</ContextMenuButton>
                <ContextMenuButton onClick={onPromote}>{labels.promote}</ContextMenuButton>
                <ContextMenuButton onClick={onToggleCollapse}>
                  {selectedNode.collapsed ? labels.expand : labels.collapse}
                </ContextMenuButton>
                <ContextMenuButton onClick={onToggleFocus}>
                  {focusNodeId === selectedNode.id ? labels.clearFocus : labels.focusSelected}
                </ContextMenuButton>
                <button
                  type="button"
                  className="rounded-full border border-[#e8c2c2] bg-[#fff1f1] px-3 py-1.5 text-[0.72rem] font-semibold text-[#9d5555] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={onDelete}
                  disabled={selectedNode.id === rootNodeId}
                >
                  {labels.deleteNode}
                </button>
              </div>
            </section>
          </div>
        </InspectorSection>

        <InspectorSection
          title={labels.style}
          isOpen={sectionState.style}
          onToggle={() => onToggleSection('style')}
          labels={labels}
        >
          <div className="space-y-4">
            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.theme}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['sage', 'amber', 'stone'] as MindMapThemePreset[]).map((preset) => {
                  const palette = resolveMindMapThemePalette({ preset });
                  const active = currentThemePreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-[18px] border p-2 text-left transition ${active ? 'border-[#8a7f72] shadow-[0_12px_24px_rgba(50,36,24,0.10)]' : 'border-[#ddd3c3]'}`}
                      style={{ background: palette.panel }}
                      onClick={() => onSetTheme(preset)}
                    >
                      <div className="h-10 rounded-[12px]" style={{ background: palette.canvas }} />
                      <div className="mt-2 text-[0.74rem] font-semibold text-[#3a3027]">{themeLabel(preset, labels)}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.nodeShape}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['capsule', 'rounded', 'underline'] as MindMapNode['style']['shape'][]).map((shape) => {
                  const active = selectedNode.style.shape === shape;
                  return (
                    <button
                      key={shape}
                      type="button"
                      className={`rounded-[16px] border px-3 py-2 text-[0.78rem] font-semibold transition ${active ? 'border-[#8a7f72] bg-[#f4efe6] text-[#3d342a]' : 'border-[#ddd3c3] bg-white/75 text-[#6d6358]'}`}
                      onClick={() => onUpdateSelectedNodeStyle({ shape })}
                    >
                      {shapeLabel(shape, labels)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.fillTone}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {MIND_MAP_FILL_OPTIONS.map((fill) => (
                  <button
                    key={fill}
                    type="button"
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.74rem] font-semibold transition ${selectedNode.style.fill === fill ? 'border-[#8a7f72] text-[#3d342a]' : 'border-[#ddd3c3] text-[#6d6358]'}`}
                    onClick={() => onUpdateSelectedNodeStyle({ fill })}
                  >
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{
                        background: FILL_SWATCHES[fill].fill,
                        borderColor: FILL_SWATCHES[fill].border,
                      }}
                    />
                    {fillLabel(fill, labels)}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.branchTone}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {MIND_MAP_BRANCH_COLOR_OPTIONS.map((branchColor) => (
                  <button
                    key={branchColor}
                    type="button"
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.74rem] font-semibold transition ${selectedNode.style.branchColor === branchColor ? 'border-[#8a7f72] text-[#3d342a]' : 'border-[#ddd3c3] text-[#6d6358]'}`}
                    onClick={() => onUpdateSelectedNodeStyle({ branchColor })}
                  >
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{
                        background: branchColor === 'auto' ? themePalette.connection : BRANCH_SWATCHES[branchColor],
                        borderColor: branchColor === 'auto' ? themePalette.connection : BRANCH_SWATCHES[branchColor],
                      }}
                    />
                    {branchLabel(branchColor, labels)}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.emphasis}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['normal', 'strong'] as const).map((emphasis) => (
                  <button
                    key={emphasis}
                    type="button"
                    className={`rounded-[16px] border px-3 py-2 text-[0.78rem] font-semibold transition ${selectedNode.style.emphasis === emphasis ? 'border-[#8a7f72] bg-[#f4efe6] text-[#3d342a]' : 'border-[#ddd3c3] bg-white/75 text-[#6d6358]'}`}
                    onClick={() => onUpdateSelectedNodeStyle({ emphasis })}
                  >
                    {emphasis === 'strong' ? labels.emphasisStrong : labels.emphasisNormal}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </InspectorSection>

        <InspectorSection
          title={labels.notesAssets}
          isOpen={sectionState.assets}
          onToggle={() => onToggleSection('assets')}
          labels={labels}
        >
          <div className="space-y-5">
            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.note}</div>
              <div className="mt-2">
                <NoteEditor
                  key={selectedNode.id}
                  value={selectedNode.noteHtml}
                  placeholder={labels.notePlaceholder}
                  onChange={(nextValue) => onUpdateSelectedNode({ noteHtml: nextValue })}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.links}</div>
                <ContextMenuButton onClick={onAddLink}>{labels.addLink}</ContextMenuButton>
              </div>

              <div className="mt-3 space-y-3">
                {selectedNode.links.map((link, index) => (
                  <div key={link.id} className="rounded-[18px] border border-[#ddd3c3] bg-white/75 p-3">
                    <div className="grid gap-2">
                      <input
                        value={link.label}
                        placeholder={labels.linkLabel}
                        onChange={(event) => onUpdateLink(index, { label: event.target.value })}
                        className="w-full rounded-[12px] border border-[#e1d7c8] bg-white/75 px-3 py-2 text-[0.86rem] font-medium text-[#3d342a] outline-none"
                      />
                      <div className="flex gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-[#e1d7c8] bg-white/75 px-3 py-2">
                          <Link2 size={15} className="text-[#8b7d72]" />
                          <input
                            value={link.url}
                            placeholder={labels.linkUrl}
                            onChange={(event) => onUpdateLink(index, { url: event.target.value })}
                            className="min-w-0 flex-1 border-0 bg-transparent text-[0.82rem] font-medium text-[#3d342a] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/75 text-[#9d8e82]"
                          onClick={() => onRemoveLink(index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[0.74rem] font-medium text-[#8b7d72]">{labels.invalidUrl}</div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.image}</div>
              <div className="mt-3 rounded-[18px] border border-[#ddd3c3] bg-white/75 p-3">
                {selectedNode.imageUrl ? (
                  <img
                    src={selectedNode.imageUrl}
                    alt={selectedNode.label}
                    className="h-36 w-full rounded-[16px] border border-[#ddd3c3] object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-[16px] border border-dashed border-[#ddcfbe] text-[0.82rem] font-medium text-[#8b7d72]">
                    {labels.uploadImage}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <label className="viewer-botanical-button viewer-botanical-button--secondary cursor-pointer">
                    <span className="flex items-center gap-2">
                      <ImagePlus size={16} />
                      {labels.uploadImage}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        onUploadImage(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {selectedNode.imageUrl ? (
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--secondary"
                      onClick={() => onUpdateSelectedNode({ imageUrl: null })}
                    >
                      {labels.removeImage}
                    </button>
                  ) : null}
                </div>
                {imageUploadError ? (
                  <div className="mt-2 text-[0.78rem] font-medium text-[#a04b4b]">{imageUploadError}</div>
                ) : null}
              </div>
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.documents}</div>
              <div className="mt-3 rounded-[18px] border border-[#ddd3c3] bg-white/75 p-3">
                {availableDocuments.length ? (
                  <div className="space-y-2">
                    {availableDocuments.map((item) => (
                      <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#e1d7c8] bg-white/75 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedNode.documentRefs.includes(item.id)}
                          onChange={() =>
                            onUpdateSelectedNode({
                              documentRefs: selectedNode.documentRefs.includes(item.id)
                                ? selectedNode.documentRefs.filter((documentId) => documentId !== item.id)
                                : [...selectedNode.documentRefs, item.id],
                            })
                          }
                          className="mt-1 h-4 w-4 rounded border-[#cdbda8] text-[#7a9e7e] focus:ring-[#7a9e7e]"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[0.82rem] font-semibold text-[#3d342a]">
                            {item.display_title?.trim() || item.filename}
                          </div>
                          <div className="mt-1 text-[0.72rem] font-medium text-[#8b7d72]">{item.mime_type.toUpperCase()}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-[0.82rem] font-medium text-[#8b7d72]">{labels.noDocuments}</div>
                )}

                {staleDocumentRefs.length ? (
                  <div className="mt-4 rounded-[14px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-3 py-2">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9d5555]">{labels.staleDocuments}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {staleDocumentRefs.map((documentId) => (
                        <span
                          key={documentId}
                          className="rounded-full border border-[#e7bcbc] bg-white/75 px-2 py-0.5 text-[0.72rem] font-medium text-[#9d5555]"
                        >
                          {documentId}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </InspectorSection>

        {saveStatus === 'error' ? (
          <section className="rounded-[18px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-4 py-3 text-[#9d5555]">
            <div className="flex items-center gap-2 text-[0.82rem] font-semibold">
              <AlertCircle size={16} />
              {labels.saveError}
            </div>
            <div className="mt-2 text-[0.78rem] font-medium leading-6">
              {saveErrorMessage || labels.saveErrorBody}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

export function MindMapShortcutsDialog({
  labels,
  open,
  close,
}: {
  labels: EditorCopy;
  open: boolean;
  close: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(27,21,18,0.34)] px-4">
      <div className="w-full max-w-[32rem] rounded-[28px] border border-[#ddd3c3] bg-[rgba(255,251,244,0.98)] p-5 shadow-[0_28px_64px_rgba(24,18,14,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#86796b]">{labels.shortcuts}</div>
            <div className="mt-1 text-[1.1rem] font-semibold text-[#2f2822]">{labels.shortcutsTitle}</div>
          </div>
          <button
            type="button"
            className="rounded-full border border-[#ddd3c3] bg-white/80 px-3 py-1.5 text-[0.76rem] font-semibold text-[#6d6358]"
            onClick={close}
          >
            {labels.close}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {labels.shortcutItems.map(([shortcut, description]) => (
            <div
              key={shortcut}
              className="flex items-center justify-between gap-4 rounded-[18px] border border-[#e7ddd0] bg-white/76 px-4 py-3"
            >
              <div className="rounded-full border border-[#ddd3c3] bg-[#f8f4ed] px-3 py-1 text-[0.74rem] font-bold text-[#53483d]">
                {shortcut}
              </div>
              <div className="text-right text-[0.84rem] font-medium text-[#6d6358]">{description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
