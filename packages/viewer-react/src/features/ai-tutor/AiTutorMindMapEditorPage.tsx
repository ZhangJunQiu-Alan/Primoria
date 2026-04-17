import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  MIND_MAP_BRANCH_COLOR_OPTIONS,
  MIND_MAP_FILL_OPTIONS,
  MIND_MAP_MARKERS,
  MIND_MAP_THEME_PALETTES,
  createDefaultMindMapLayout,
  createDefaultMindMapNodeStyle,
  createDefaultMindMapTheme,
  normalizeMindMapLayout,
  normalizeMindMapNodeStyle,
  normalizeMindMapTheme,
  resolveMindMapThemePalette,
} from '@/features/ai-tutor/mindMapAppearance';
import { buildMindMapCanvasLayout, type MindMapCanvasSide } from '@/features/ai-tutor/mindMapCanvasLayout';
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
import { uploadMindMapImage } from '@/features/ai-tutor/uploadMindMapImage';
import {
  fetchMindMap,
  fetchTutorDocuments,
  updateMindMap,
} from '@/shared/api/viewer/tutorDocumentsApi';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import type {
  MindMapBranchColor,
  MindMapDocument,
  MindMapLink,
  MindMapMarker,
  MindMapNode,
  MindMapNodeFill,
  MindMapThemePreset,
  TutorDocument,
} from '@/shared/api/viewer/types';

type EditorCopy = ReturnType<typeof editorCopy>;
type InspectorSectionKey = 'topic' | 'style' | 'assets';
type SaveStatus = 'dirty' | 'saving' | 'saved' | 'error';
type HistoryState = {
  past: MindMapDocument[];
  future: MindMapDocument[];
};

const MAX_HISTORY_ENTRIES = 80;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.45;
const ZOOM_STEP = 0.1;

const MARKER_META: Record<MindMapMarker, { short: string; tone: 'rose' | 'amber' | 'sage' | 'stone' }> = {
  'priority-high': { short: 'P1', tone: 'rose' },
  'priority-medium': { short: 'P2', tone: 'amber' },
  'status-active': { short: 'ING', tone: 'amber' },
  'status-done': { short: 'OK', tone: 'sage' },
  star: { short: '★', tone: 'stone' },
};

const FILL_SWATCHES: Record<MindMapNodeFill, { fill: string; border: string; solid: string }> = {
  auto: { fill: '#f8f5ef', border: '#ddd3c3', solid: '#7a9e7e' },
  sage: { fill: '#edf6eb', border: '#bdd4b7', solid: '#6f9875' },
  amber: { fill: '#fff0d8', border: '#efc18f', solid: '#cf8b45' },
  stone: { fill: '#eef2f6', border: '#c7d4df', solid: '#6f7d8d' },
  slate: { fill: '#eef0f5', border: '#c2c9d8', solid: '#5f6d83' },
};

const BRANCH_SWATCHES: Record<Exclude<MindMapBranchColor, 'auto'>, string> = {
  sage: '#6f9875',
  amber: '#cf8b45',
  stone: '#6f7d8d',
  rose: '#c97878',
  slate: '#64748b',
};

function editorCopy(language: 'zh-CN' | 'en') {
  if (language === 'zh-CN') {
    return {
      back: '返回学习助手',
      loading: '正在加载思维导图…',
      unavailable: '这张思维导图暂时不可用。',
      saved: '已保存',
      saving: '保存中…',
      dirty: '本地未同步',
      saveError: '保存失败',
      saveErrorBody: '修改仍保留在本地页面里，你可以继续编辑并等待自动重试。',
      untitledNode: '未命名节点',
      untitledMap: '未命名导图',
      toolbarTitle: '导图标题',
      inspector: '检查器',
      hideInspector: '隐藏检查器',
      showInspector: '显示检查器',
      zoomOut: '缩小',
      zoomIn: '放大',
      fitMap: '适配画布',
      centerRoot: '居中根节点',
      focusSelected: '聚焦选中节点',
      clearFocus: '退出节点聚焦',
      focusMode: '专注模式',
      exitFocusMode: '退出专注模式',
      shortcuts: '快捷键',
      shortcutsTitle: '思维导图快捷键',
      undo: '撤销',
      redo: '重做',
      topic: '主题',
      style: '样式',
      notesAssets: '备注与资源',
      topicTitle: '标题',
      icon: '图标',
      labels: 'Labels',
      labelsPlaceholder: '用逗号分隔多个标签',
      markers: 'Markers',
      structure: '结构操作',
      addChild: '子主题',
      addSibling: '同级主题',
      promote: '提升一级',
      deleteNode: '删除节点',
      collapse: '折叠分支',
      expand: '展开分支',
      more: '更多',
      theme: '主题',
      nodeShape: '节点形状',
      fillTone: '节点填充',
      branchTone: '分支强调',
      emphasis: '文字强调',
      emphasisNormal: '常规',
      emphasisStrong: '重点',
      note: '备注',
      notePlaceholder: '在这里补充解释、例子或复习要点…',
      links: '链接',
      addLink: '新增链接',
      linkLabel: '名称',
      linkUrl: 'URL',
      image: '图片',
      uploadImage: '上传图片',
      removeImage: '移除图片',
      documents: '资料引用',
      staleDocuments: '失效引用',
      invalidUrl: '无效链接不会被保存。',
      imageUploading: '图片上传中…',
      noDocuments: '当前没有可引用的资料。',
      openSection: '展开分组',
      closeSection: '收起分组',
      canvasHint: '单击选中、双击改名，Enter 新增同级，Tab 新增子级，Shift+Tab 提升一级。',
      branchLeft: '左侧分支',
      branchRight: '右侧分支',
      mobileInspectorBody: '在较窄屏幕上，检查器会作为底部抽屉出现。',
      close: '关闭',
      markerPriorityHigh: '高优先级',
      markerPriorityMedium: '中优先级',
      markerStatusActive: '进行中',
      markerStatusDone: '已完成',
      markerStar: '重点',
      themeSage: 'Sage',
      themeAmber: 'Amber',
      themeStone: 'Stone',
      shapeCapsule: '胶囊',
      shapeRounded: '圆角卡片',
      shapeUnderline: '下划线',
      fillAuto: '跟随主题',
      fillSage: '鼠尾草',
      fillAmber: '琥珀',
      fillStone: '石灰',
      fillSlate: '石板',
      branchAuto: '自动',
      branchSage: '绿色',
      branchAmber: '橙金',
      branchStone: '灰蓝',
      branchRose: '玫瑰',
      branchSlate: '冷灰',
      shortcutItems: [
        ['Enter', '新增同级主题'],
        ['Tab', '新增子主题'],
        ['Shift + Tab', '提升一级'],
        ['Delete', '删除当前主题'],
        ['双击', '直接编辑节点标题'],
      ] as Array<[string, string]>,
    };
  }

  return {
      back: 'Back to Study Helper',
    loading: 'Loading mind map…',
    unavailable: 'This mind map is unavailable.',
    saved: 'Saved',
    saving: 'Saving…',
    dirty: 'Local changes',
    saveError: 'Save failed',
    saveErrorBody: 'Your edits are still in the page locally, so you can keep editing while autosave retries.',
    untitledNode: 'Untitled node',
    untitledMap: 'Untitled map',
    toolbarTitle: 'Map title',
    inspector: 'Inspector',
    hideInspector: 'Hide inspector',
    showInspector: 'Show inspector',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    fitMap: 'Fit to map',
    centerRoot: 'Center root',
    focusSelected: 'Focus selected',
    clearFocus: 'Clear focus',
    focusMode: 'Focus mode',
    exitFocusMode: 'Exit focus mode',
    shortcuts: 'Shortcuts',
    shortcutsTitle: 'Mind map shortcuts',
    undo: 'Undo',
    redo: 'Redo',
    topic: 'Topic',
    style: 'Style',
    notesAssets: 'Notes & Assets',
    topicTitle: 'Title',
    icon: 'Icon',
    labels: 'Labels',
    labelsPlaceholder: 'Separate labels with commas',
    markers: 'Markers',
    structure: 'Structure',
    addChild: 'Add child',
    addSibling: 'Add sibling',
    promote: 'Promote',
    deleteNode: 'Delete node',
    collapse: 'Collapse branch',
    expand: 'Expand branch',
    more: 'More',
    theme: 'Theme',
    nodeShape: 'Node shape',
    fillTone: 'Node fill',
    branchTone: 'Branch accent',
    emphasis: 'Emphasis',
    emphasisNormal: 'Normal',
    emphasisStrong: 'Strong',
    note: 'Notes',
    notePlaceholder: 'Add examples, reminders, or context here…',
    links: 'Links',
    addLink: 'Add link',
    linkLabel: 'Label',
    linkUrl: 'URL',
    image: 'Image',
    uploadImage: 'Upload image',
    removeImage: 'Remove image',
    documents: 'Referenced documents',
    staleDocuments: 'Unavailable references',
    invalidUrl: 'Invalid links are stripped before save.',
    imageUploading: 'Uploading image…',
    noDocuments: 'No uploaded documents are available yet.',
    openSection: 'Open section',
    closeSection: 'Close section',
    canvasHint: 'Click to select, double-click to rename, Enter for a sibling, Tab for a child, Shift+Tab to promote.',
    branchLeft: 'Left branch',
    branchRight: 'Right branch',
    mobileInspectorBody: 'On smaller screens the inspector appears as a bottom drawer.',
    close: 'Close',
    markerPriorityHigh: 'High priority',
    markerPriorityMedium: 'Medium priority',
    markerStatusActive: 'In progress',
    markerStatusDone: 'Done',
    markerStar: 'Highlight',
    themeSage: 'Sage',
    themeAmber: 'Amber',
    themeStone: 'Stone',
    shapeCapsule: 'Capsule',
    shapeRounded: 'Rounded card',
    shapeUnderline: 'Underline',
    fillAuto: 'Follow theme',
    fillSage: 'Sage',
    fillAmber: 'Amber',
    fillStone: 'Stone',
    fillSlate: 'Slate',
    branchAuto: 'Auto',
    branchSage: 'Green',
    branchAmber: 'Amber',
    branchStone: 'Stone',
    branchRose: 'Rose',
    branchSlate: 'Slate',
    shortcutItems: [
      ['Enter', 'Add a sibling topic'],
      ['Tab', 'Add a child topic'],
      ['Shift + Tab', 'Promote a topic'],
      ['Delete', 'Delete the current topic'],
      ['Double-click', 'Rename the selected topic'],
    ] as Array<[string, string]>,
  };
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function isEditableElement(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function saveStatusTone(status: SaveStatus) {
  if (status === 'saved') {
    return 'border-[#bfd4b7] bg-[#eff7ed] text-[#4c6b4f]';
  }
  if (status === 'saving') {
    return 'border-[#e0c8ab] bg-[#fdf2e5] text-[#8a5d2d]';
  }
  if (status === 'error') {
    return 'border-[#e8c2c2] bg-[#fff1f1] text-[#9d5555]';
  }
  return 'border-[#d7d1c6] bg-white/80 text-[#6d645a]';
}

function markerToneStyles(tone: 'rose' | 'amber' | 'sage' | 'stone') {
  if (tone === 'rose') {
    return 'border-[#e7c0c0] bg-[#fff0f0] text-[#a25858]';
  }
  if (tone === 'amber') {
    return 'border-[#efcfab] bg-[#fff2df] text-[#9d6c34]';
  }
  if (tone === 'sage') {
    return 'border-[#c7dac4] bg-[#eef6ed] text-[#58725c]';
  }
  return 'border-[#cad3de] bg-[#eef2f6] text-[#5f6d83]';
}

function markerLabel(marker: MindMapMarker, labels: EditorCopy) {
  if (marker === 'priority-high') {
    return labels.markerPriorityHigh;
  }
  if (marker === 'priority-medium') {
    return labels.markerPriorityMedium;
  }
  if (marker === 'status-active') {
    return labels.markerStatusActive;
  }
  if (marker === 'status-done') {
    return labels.markerStatusDone;
  }
  return labels.markerStar;
}

function themeLabel(preset: MindMapThemePreset, labels: EditorCopy) {
  if (preset === 'amber') {
    return labels.themeAmber;
  }
  if (preset === 'stone') {
    return labels.themeStone;
  }
  return labels.themeSage;
}

function shapeLabel(shape: MindMapNode['style']['shape'], labels: EditorCopy) {
  if (shape === 'capsule') {
    return labels.shapeCapsule;
  }
  if (shape === 'underline') {
    return labels.shapeUnderline;
  }
  return labels.shapeRounded;
}

function fillLabel(fill: MindMapNodeFill, labels: EditorCopy) {
  if (fill === 'sage') {
    return labels.fillSage;
  }
  if (fill === 'amber') {
    return labels.fillAmber;
  }
  if (fill === 'stone') {
    return labels.fillStone;
  }
  if (fill === 'slate') {
    return labels.fillSlate;
  }
  return labels.fillAuto;
}

function branchLabel(branchColor: MindMapBranchColor, labels: EditorCopy) {
  if (branchColor === 'sage') {
    return labels.branchSage;
  }
  if (branchColor === 'amber') {
    return labels.branchAmber;
  }
  if (branchColor === 'stone') {
    return labels.branchStone;
  }
  if (branchColor === 'rose') {
    return labels.branchRose;
  }
  if (branchColor === 'slate') {
    return labels.branchSlate;
  }
  return labels.branchAuto;
}

function updateLinkAtIndex(links: MindMapLink[], index: number, patch: Partial<MindMapLink>) {
  return links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link));
}

function buildCanvasPattern(gridColor: string) {
  return {
    backgroundImage: `radial-gradient(circle at 1px 1px, ${gridColor} 1px, transparent 0)`,
    backgroundSize: '28px 28px',
  };
}

function resolveNodeAccent(node: MindMapNode, side: MindMapCanvasSide, themePreset: MindMapThemePreset, depth: number) {
  if (node.style.branchColor !== 'auto') {
    return BRANCH_SWATCHES[node.style.branchColor];
  }

  if (side === 'left') {
    return MIND_MAP_THEME_PALETTES[themePreset].branchBorders[Math.min(depth, 2)] ?? MIND_MAP_THEME_PALETTES[themePreset].connection;
  }

  return MIND_MAP_THEME_PALETTES[themePreset].branchBorders[Math.min(depth, 2)] ?? MIND_MAP_THEME_PALETTES[themePreset].connection;
}

function resolveNodeSurface(params: {
  node: MindMapNode;
  themePreset: MindMapThemePreset;
  depth: number;
  side: MindMapCanvasSide;
  isRoot: boolean;
  isSelected: boolean;
}) {
  const { node, themePreset, depth, side, isRoot, isSelected } = params;
  const palette = resolveMindMapThemePalette({ preset: themePreset });
  const accent = resolveNodeAccent(node, side, themePreset, Math.max(depth - 1, 0));
  const autoFill =
    isRoot
      ? { fill: palette.rootFill, border: palette.rootBorder }
      : {
          fill: palette.branchFills[Math.min(depth - 1, 2)] ?? palette.branchFills[2],
          border: palette.branchBorders[Math.min(depth - 1, 2)] ?? palette.branchBorders[2],
        };

  const swatch = node.style.fill === 'auto' ? autoFill : FILL_SWATCHES[node.style.fill];
  const ring = isSelected ? `0 0 0 3px ${accent}33, 0 26px 52px rgba(40, 32, 26, 0.12)` : '0 18px 40px rgba(50, 40, 30, 0.09)';

  if (node.style.shape === 'underline') {
    return {
      background: 'rgba(255,255,255,0.2)',
      border: 'transparent',
      borderBottom: accent,
      borderRadius: '18px',
      boxShadow: isSelected ? `0 0 0 2px ${accent}22` : 'none',
      accent,
      ring,
    };
  }

  return {
    background: swatch.fill,
    border: swatch.border,
    borderBottom: swatch.border,
    borderRadius: node.style.shape === 'capsule' ? '999px' : '26px',
    boxShadow: ring,
    accent,
    ring,
  };
}

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

function ContextMenuButton({
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
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MindMapNodeCard({
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
  dropTarget: { nodeId: string; position: MindMapDropPosition } | null;
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

export function AiTutorMindMapEditorPage() {
  const language = useProductLanguage();
  const labels = editorCopy(language);
  const { mindMapId } = useParams<{ mindMapId: string }>();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const [document, setDocument] = useState<MindMapDocument | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: MindMapDropPosition } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
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
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSerializedRef = useRef('');
  const latestDocumentRef = useRef<MindMapDocument | null>(null);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);

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

  const saveMutation = useMutation({
    mutationFn: (nextDocument: MindMapDocument) => updateMindMap(nextDocument.id, nextDocument),
  });

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

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

    setDocument(normalizedDocument);
    setSelectedNodeId((current) => current || normalizedDocument.rootNodeId);
    setHistory({ past: [], future: [] });
    setFocusNodeId(null);
    setZoom(1);
    lastSavedSerializedRef.current = JSON.stringify(normalizedDocument);
    setSaveStatus('saved');
    setSaveErrorMessage(null);
  }, [documentQuery.data]);

  useEffect(() => {
    if (!document || document.nodes[selectedNodeId]) {
      return;
    }

    setSelectedNodeId(document.rootNodeId);
  }, [document, selectedNodeId]);

  useEffect(() => {
    if (!document) {
      return;
    }

    if (focusNodeId && !document.nodes[focusNodeId]) {
      setFocusNodeId(null);
    }
  }, [document, focusNodeId]);

  useEffect(() => {
    setOpenMenuNodeId(null);
  }, [selectedNodeId]);

  const availableDocuments = documentsQuery.data ?? [];
  const availableDocumentIds = useMemo(
    () => (documentsQuery.data ? new Set(documentsQuery.data.map((item) => item.id)) : null),
    [documentsQuery.data],
  );
  const selectedNode = document ? document.nodes[selectedNodeId] ?? null : null;
  const rootNode = document ? getMindMapRootNode(document) : null;
  const preparedDocument = useMemo(
    () => (document ? normalizeMindMapDocumentForSave(document, availableDocumentIds ?? undefined) : null),
    [availableDocumentIds, document],
  );
  const hasUnsavedChanges = Boolean(preparedDocument && (JSON.stringify(preparedDocument) !== lastSavedSerializedRef.current || saveInFlightRef.current));
  const themePalette = resolveMindMapThemePalette(document?.theme ?? createDefaultMindMapTheme());
  const canvasLayout = useMemo(
    () => (document ? buildMindMapCanvasLayout(document, focusNodeId) : null),
    [document, focusNodeId],
  );
  const selectedBox = selectedNode && canvasLayout ? canvasLayout.nodeBoxes[selectedNode.id] ?? null : null;

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
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
      setHistory((current) => ({
        past: [...current.past.slice(-MAX_HISTORY_ENTRIES + 1), document],
        future: [],
      }));
    }

    setDocument(nextDocument);
    setSaveStatus('dirty');
    setSaveErrorMessage(null);
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

  const commitSave = async (snapshot: MindMapDocument) => {
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
      lastSavedSerializedRef.current = JSON.stringify(savedDocument);
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
  };

  useEffect(() => {
    if (!preparedDocument) {
      return undefined;
    }

    const serialized = JSON.stringify(preparedDocument);
    if (serialized === lastSavedSerializedRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void commitSave(preparedDocument);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [preparedDocument]);

  const handleCommitEditing = () => {
    if (!document || !editingNodeId) {
      return;
    }

    replaceDocument(renameMindMapNode(document, editingNodeId, editingLabel));
    setEditingNodeId(null);
  };

  const handleUndo = () => {
    if (!document || history.past.length === 0) {
      return;
    }

    const previous = history.past[history.past.length - 1];
    setHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [document, ...current.future.slice(0, MAX_HISTORY_ENTRIES - 1)],
    }));
    setDocument(previous);
    setSelectedNodeId(previous.nodes[selectedNodeId] ? selectedNodeId : previous.rootNodeId);
    setSaveStatus('dirty');
  };

  const handleRedo = () => {
    if (!document || history.future.length === 0) {
      return;
    }

    const [next, ...remaining] = history.future;
    setHistory((current) => ({
      past: [...current.past.slice(-MAX_HISTORY_ENTRIES + 1), document],
      future: remaining,
    }));
    setDocument(next);
    setSelectedNodeId(next.nodes[selectedNodeId] ? selectedNodeId : next.rootNodeId);
    setSaveStatus('dirty');
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
        handleRedo();
      } else {
        handleUndo();
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
  }, [canvasLayout?.visualRootId]);

  useEffect(() => {
    if (!canvasLayout || !selectedNode) {
      return;
    }

    if (!canvasLayout.nodeBoxes[selectedNode.id]) {
      setSelectedNodeId(canvasLayout.visualRootId);
    }
  }, [canvasLayout, selectedNode]);

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
          <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
            <span className="flex items-center gap-2">
              <ArrowLeft size={16} />
              {labels.back}
            </span>
          </Link>
        </div>
        <div className="viewer-surface flex flex-1 items-center justify-center bg-[rgba(254,250,245,0.94)] p-8">
          <div className="text-center">
            <div className="text-[1.6rem] font-semibold text-[#3d342a]">{labels.unavailable}</div>
          </div>
        </div>
      </div>
    );
  }

  const currentThemePreset = normalizeMindMapTheme(document.theme).preset;
  const staleDocumentRefs = availableDocumentIds
    ? selectedNode.documentRefs.filter((documentId) => !availableDocumentIds.has(documentId))
    : [];
  const contextToolbarTop = selectedBox ? Math.max(12, selectedBox.y - 54) : 12;
  const inspectorPanel = (
    <aside
      data-testid="mindmap-editor-inspector"
      className={`viewer-scrollbar-hidden overflow-auto rounded-[30px] border border-[#ddd3c3] shadow-[0_18px_48px_rgba(44,34,24,0.08)] ${isFocusMode ? 'xl:w-[320px]' : 'xl:w-[360px]'} ${inspectorOpen ? 'fixed inset-x-4 bottom-4 top-[5.6rem] z-30 flex xl:static' : 'hidden'} xl:flex xl:min-h-0`}
      style={{ background: themePalette.panel }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-5">
        <div className="rounded-[22px] border border-white/70 bg-white/58 px-4 py-3">
          <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7e7367]">{labels.topic}</div>
          <div className="mt-2 text-[1.05rem] font-semibold text-[#312821]">{selectedNode.label || labels.untitledNode}</div>
          <div className="mt-2 text-[0.78rem] font-medium text-[#7a7065]">{labels.canvasHint}</div>
        </div>

        <InspectorSection
          title={labels.topic}
          isOpen={sectionState.topic}
          onToggle={() => setSectionState((current) => ({ ...current, topic: !current.topic }))}
          labels={labels}
        >
          <div className="space-y-4">
            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.topicTitle}</div>
              <input
                value={selectedNode.label}
                onChange={(event) => applyDocumentChange((current) => renameMindMapNode(current, selectedNode.id, event.target.value || labels.untitledNode))}
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-white/75 px-4 py-3 text-[0.92rem] font-semibold text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.icon}</div>
              <input
                value={selectedNode.icon ?? ''}
                onChange={(event) => updateSelectedNode({ icon: event.target.value || null })}
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
                  updateSelectedNode({
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
                      onClick={() => toggleMarker(marker)}
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
                <ContextMenuButton onClick={() => handleAddChild(selectedNode.id)}>{labels.addChild}</ContextMenuButton>
                <ContextMenuButton onClick={() => handleAddSibling(selectedNode.id)}>{labels.addSibling}</ContextMenuButton>
                <ContextMenuButton onClick={() => handlePromote(selectedNode.id)}>{labels.promote}</ContextMenuButton>
                <ContextMenuButton onClick={() => handleToggleCollapse(selectedNode.id)}>
                  {selectedNode.collapsed ? labels.expand : labels.collapse}
                </ContextMenuButton>
                <ContextMenuButton onClick={() => setFocusNodeId(selectedNode.id === document.rootNodeId ? null : selectedNode.id)}>
                  {focusNodeId === selectedNode.id ? labels.clearFocus : labels.focusSelected}
                </ContextMenuButton>
                <button
                  type="button"
                  className="rounded-full border border-[#e8c2c2] bg-[#fff1f1] px-3 py-1.5 text-[0.72rem] font-semibold text-[#9d5555] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleDelete(selectedNode.id)}
                  disabled={selectedNode.id === document.rootNodeId}
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
          onToggle={() => setSectionState((current) => ({ ...current, style: !current.style }))}
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
                      onClick={() =>
                        applyDocumentChange((current) => ({
                          ...current,
                          theme: { preset },
                        }))
                      }
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
                      onClick={() => updateSelectedNodeStyle({ shape })}
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
                    onClick={() => updateSelectedNodeStyle({ fill })}
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
                    onClick={() => updateSelectedNodeStyle({ branchColor })}
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
                    onClick={() => updateSelectedNodeStyle({ emphasis })}
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
          onToggle={() => setSectionState((current) => ({ ...current, assets: !current.assets }))}
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
                  onChange={(nextValue) => updateSelectedNode({ noteHtml: nextValue })}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8c7f73]">{labels.links}</div>
                <ContextMenuButton
                  onClick={() =>
                    updateSelectedNode({
                      links: [
                        ...selectedNode.links,
                        { id: `link-${crypto.randomUUID()}`, label: '', url: '' },
                      ],
                    })
                  }
                >
                  {labels.addLink}
                </ContextMenuButton>
              </div>

              <div className="mt-3 space-y-3">
                {selectedNode.links.map((link, index) => (
                  <div key={link.id} className="rounded-[18px] border border-[#ddd3c3] bg-white/75 p-3">
                    <div className="grid gap-2">
                      <input
                        value={link.label}
                        placeholder={labels.linkLabel}
                        onChange={(event) =>
                          updateSelectedNode({
                            links: updateLinkAtIndex(selectedNode.links, index, { label: event.target.value }),
                          })
                        }
                        className="w-full rounded-[12px] border border-[#e1d7c8] bg-white/75 px-3 py-2 text-[0.86rem] font-medium text-[#3d342a] outline-none"
                      />
                      <div className="flex gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-[#e1d7c8] bg-white/75 px-3 py-2">
                          <Link2 size={15} className="text-[#8b7d72]" />
                          <input
                            value={link.url}
                            placeholder={labels.linkUrl}
                            onChange={(event) =>
                              updateSelectedNode({
                                links: updateLinkAtIndex(selectedNode.links, index, { url: event.target.value }),
                              })
                            }
                            className="min-w-0 flex-1 border-0 bg-transparent text-[0.82rem] font-medium text-[#3d342a] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/75 text-[#9d8e82]"
                          onClick={() =>
                            updateSelectedNode({
                              links: selectedNode.links.filter((_, linkIndex) => linkIndex !== index),
                            })
                          }
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
                        void handleImageUpload(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {selectedNode.imageUrl ? (
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--secondary"
                      onClick={() => updateSelectedNode({ imageUrl: null })}
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
                    {availableDocuments.map((item: TutorDocument) => (
                      <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#e1d7c8] bg-white/75 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedNode.documentRefs.includes(item.id)}
                          onChange={() =>
                            updateSelectedNode({
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

  return (
    <div className={`mx-auto flex h-full w-full flex-col overflow-hidden ${isFocusMode ? 'max-w-none px-2 py-2 md:px-4' : 'max-w-[1680px] px-4 py-4 md:px-5'}`}>
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
                value={document.title || labels.untitledMap}
                onChange={(event) => applyDocumentChange((current) => renameMindMapNode(current, current.rootNodeId, event.target.value || labels.untitledMap))}
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

            <ContextMenuButton onClick={handleUndo}>{labels.undo}</ContextMenuButton>
            <ContextMenuButton onClick={handleRedo}>{labels.redo}</ContextMenuButton>
            <ContextMenuButton onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}>{labels.zoomOut}</ContextMenuButton>
            <div className="rounded-full border border-[#ddd3c3] bg-white/75 px-3 py-1.5 text-[0.76rem] font-semibold text-[#6d6358]">
              {Math.round(zoom * 100)}%
            </div>
            <ContextMenuButton onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}>{labels.zoomIn}</ContextMenuButton>
            <ContextMenuButton onClick={fitMapToViewport}>{labels.fitMap}</ContextMenuButton>
            <ContextMenuButton onClick={() => centerOnNode(canvasLayout.visualRootId)}>{labels.centerRoot}</ContextMenuButton>
            <ContextMenuButton
              onClick={() =>
                setFocusNodeId((current) =>
                  selectedNode.id === document.rootNodeId
                    ? null
                    : current === selectedNode.id
                      ? null
                      : selectedNode.id,
                )
              }
            >
              {focusNodeId === selectedNode.id ? labels.clearFocus : labels.focusSelected}
            </ContextMenuButton>
            <ContextMenuButton onClick={() => setIsFocusMode((current) => !current)}>
              {isFocusMode ? labels.exitFocusMode : labels.focusMode}
            </ContextMenuButton>
            <ContextMenuButton onClick={() => setShowShortcuts(true)}>{labels.shortcuts}</ContextMenuButton>
            <ContextMenuButton onClick={() => setInspectorOpen((current) => !current)}>
              {inspectorOpen ? labels.hideInspector : labels.showInspector}
            </ContextMenuButton>
          </div>
        </div>
      </div>

      <div className={`mt-4 min-h-0 flex-1 gap-4 ${inspectorOpen ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid grid-cols-[minmax(0,1fr)]'}`}>
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
            onKeyDown={handleCanvasKeyDown}
            onWheel={(event) => {
              if (!(event.metaKey || event.ctrlKey)) {
                return;
              }
              event.preventDefault();
              setZoom((current) => clampZoom(current + (event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
            }}
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
                      if (box.nodeId === document.rootNodeId || box.nodeId === draggingNodeId) {
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
                            onDragOver={handleDragOverTarget(box.nodeId, 'before')}
                            onDrop={handleDropTarget(box.nodeId, 'before')}
                          />
                          <div
                            className={`absolute rounded-full border border-dashed transition ${dropTarget?.nodeId === box.nodeId && dropTarget.position === 'after' ? 'border-[#7a9e7e] bg-[#eef6ed]' : 'border-transparent bg-transparent'}`}
                            style={{
                              left: box.x - 10,
                              top: box.y + box.height + 6,
                              width: box.width + 20,
                              height: 8,
                            }}
                            onDragOver={handleDragOverTarget(box.nodeId, 'after')}
                            onDrop={handleDropTarget(box.nodeId, 'after')}
                          />
                        </div>
                      );
                    })
                  : null}

                {selectedBox ? (
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
                      <ContextMenuButton onClick={() => handleAddChild(selectedNode.id)}>{labels.addChild}</ContextMenuButton>
                      <ContextMenuButton onClick={() => handleAddSibling(selectedNode.id)}>{labels.addSibling}</ContextMenuButton>
                      <ContextMenuButton onClick={() => handleToggleCollapse(selectedNode.id)}>
                        {selectedNode.collapsed ? labels.expand : labels.collapse}
                      </ContextMenuButton>
                      <ContextMenuButton onClick={() => setOpenMenuNodeId((current) => (current === selectedNode.id ? null : selectedNode.id))}>
                        {labels.more}
                      </ContextMenuButton>

                      {openMenuNodeId === selectedNode.id ? (
                        <div className="absolute right-0 top-[calc(100%+10px)] w-44 rounded-[18px] border border-[#ddd3c3] bg-white p-2 shadow-[0_18px_48px_rgba(44,34,24,0.12)]">
                          <button
                            type="button"
                            className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#53483d] hover:bg-[#f5efe6]"
                            onClick={() => {
                              handlePromote(selectedNode.id);
                              setOpenMenuNodeId(null);
                            }}
                          >
                            {labels.promote}
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#53483d] hover:bg-[#f5efe6]"
                            onClick={() => {
                              setFocusNodeId(selectedNode.id === document.rootNodeId ? null : selectedNode.id);
                              setOpenMenuNodeId(null);
                            }}
                          >
                            {focusNodeId === selectedNode.id ? labels.clearFocus : labels.focusSelected}
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-[12px] px-3 py-2 text-left text-[0.8rem] font-medium text-[#9d5555] hover:bg-[#fff3f3]"
                            disabled={selectedNode.id === document.rootNodeId}
                            onClick={() => {
                              handleDelete(selectedNode.id);
                              setOpenMenuNodeId(null);
                            }}
                          >
                            {labels.deleteNode}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {Object.values(canvasLayout.nodeBoxes).map((box) => {
                  const node = document.nodes[box.nodeId];
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
                      onSelect={() => selectNode(box.nodeId)}
                      onBeginEdit={() => {
                        selectNode(box.nodeId);
                        setEditingNodeId(box.nodeId);
                        setEditingLabel(node.label);
                      }}
                      onEditingLabelChange={setEditingLabel}
                      onCommitEditing={handleCommitEditing}
                      onCancelEditing={() => {
                        setEditingNodeId(null);
                        setEditingLabel(node.label);
                      }}
                      onDragStart={handleNodeDragStart(box.nodeId)}
                      onDragEnd={handleNodeDragEnd}
                      onDragOverInside={handleDragOverTarget(box.nodeId, 'inside')}
                      onDropInside={handleDropTarget(box.nodeId, 'inside')}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {inspectorPanel}
      </div>

      {showShortcuts ? (
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
                onClick={() => setShowShortcuts(false)}
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
      ) : null}
    </div>
  );
}
