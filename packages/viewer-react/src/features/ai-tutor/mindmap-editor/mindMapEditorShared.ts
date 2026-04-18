import {
  MIND_MAP_THEME_PALETTES,
  resolveMindMapThemePalette,
} from '@/features/ai-tutor/mindMapAppearance';
import type { MindMapCanvasSide } from '@/features/ai-tutor/mindMapCanvasLayout';
import type {
  MindMapBranchColor,
  MindMapDocument,
  MindMapLink,
  MindMapMarker,
  MindMapNode,
  MindMapNodeFill,
  MindMapThemePreset,
} from '@/shared/api/viewer/types';
import type { MindMapDropPosition } from '@/features/ai-tutor/mindMapDocument';

export type EditorCopy = ReturnType<typeof editorCopy>;
export type InspectorSectionKey = 'topic' | 'style' | 'assets';
export type SaveStatus = 'dirty' | 'saving' | 'saved' | 'error';
export type HistoryState = {
  past: MindMapDocument[];
  future: MindMapDocument[];
};
export type MindMapDropTarget = {
  nodeId: string;
  position: MindMapDropPosition;
} | null;

export const MAX_HISTORY_ENTRIES = 80;
export const MIN_ZOOM = 0.55;
export const MAX_ZOOM = 1.45;
export const ZOOM_STEP = 0.1;

export function cloneMindMapDocument(document: MindMapDocument) {
  return JSON.parse(JSON.stringify(document)) as MindMapDocument;
}

export const MARKER_META: Record<MindMapMarker, { short: string; tone: 'rose' | 'amber' | 'sage' | 'stone' }> = {
  'priority-high': { short: 'P1', tone: 'rose' },
  'priority-medium': { short: 'P2', tone: 'amber' },
  'status-active': { short: 'ING', tone: 'amber' },
  'status-done': { short: 'OK', tone: 'sage' },
  star: { short: '★', tone: 'stone' },
};

export const FILL_SWATCHES: Record<MindMapNodeFill, { fill: string; border: string; solid: string }> = {
  auto: { fill: '#f8f5ef', border: '#ddd3c3', solid: '#7a9e7e' },
  sage: { fill: '#edf6eb', border: '#bdd4b7', solid: '#6f9875' },
  amber: { fill: '#fff0d8', border: '#efc18f', solid: '#cf8b45' },
  stone: { fill: '#eef2f6', border: '#c7d4df', solid: '#6f7d8d' },
  slate: { fill: '#eef0f5', border: '#c2c9d8', solid: '#5f6d83' },
};

export const BRANCH_SWATCHES: Record<Exclude<MindMapBranchColor, 'auto'>, string> = {
  sage: '#6f9875',
  amber: '#cf8b45',
  stone: '#6f7d8d',
  rose: '#c97878',
  slate: '#64748b',
};

export function editorCopy(language: 'zh-CN' | 'en') {
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
    note: 'Note',
    notePlaceholder: 'Add explanation, examples, or revision notes here…',
    links: 'Links',
    addLink: 'Add link',
    linkLabel: 'Label',
    linkUrl: 'URL',
    image: 'Image',
    uploadImage: 'Upload image',
    removeImage: 'Remove image',
    documents: 'Document refs',
    staleDocuments: 'Stale refs',
    invalidUrl: 'Invalid links are kept locally until you replace them.',
    imageUploading: 'Uploading image…',
    noDocuments: 'No tutor documents are available yet.',
    openSection: 'Expand section',
    closeSection: 'Collapse section',
    canvasHint: 'Click to select, double-click to rename. Enter adds a sibling, Tab adds a child, Shift+Tab promotes.',
    branchLeft: 'Left branch',
    branchRight: 'Right branch',
    mobileInspectorBody: 'On narrow screens, the inspector appears as a bottom drawer.',
    close: 'Close',
    markerPriorityHigh: 'High priority',
    markerPriorityMedium: 'Medium priority',
    markerStatusActive: 'In progress',
    markerStatusDone: 'Done',
    markerStar: 'Key topic',
    themeSage: 'Sage',
    themeAmber: 'Amber',
    themeStone: 'Stone',
    shapeCapsule: 'Capsule',
    shapeRounded: 'Rounded card',
    shapeUnderline: 'Underline',
    fillAuto: 'Theme based',
    fillSage: 'Sage',
    fillAmber: 'Amber',
    fillStone: 'Stone',
    fillSlate: 'Slate',
    branchAuto: 'Auto',
    branchSage: 'Sage',
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

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export function isEditableElement(target: EventTarget | null) {
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

export function saveStatusTone(status: SaveStatus) {
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

export function markerToneStyles(tone: 'rose' | 'amber' | 'sage' | 'stone') {
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

export function markerLabel(marker: MindMapMarker, labels: EditorCopy) {
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

export function themeLabel(preset: MindMapThemePreset, labels: EditorCopy) {
  if (preset === 'amber') {
    return labels.themeAmber;
  }
  if (preset === 'stone') {
    return labels.themeStone;
  }
  return labels.themeSage;
}

export function shapeLabel(shape: MindMapNode['style']['shape'], labels: EditorCopy) {
  if (shape === 'capsule') {
    return labels.shapeCapsule;
  }
  if (shape === 'underline') {
    return labels.shapeUnderline;
  }
  return labels.shapeRounded;
}

export function fillLabel(fill: MindMapNodeFill, labels: EditorCopy) {
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

export function branchLabel(branchColor: MindMapBranchColor, labels: EditorCopy) {
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

export function updateLinkAtIndex(links: MindMapLink[], index: number, patch: Partial<MindMapLink>) {
  return links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link));
}

export function buildCanvasPattern(gridColor: string) {
  return {
    backgroundImage: `radial-gradient(circle at 1px 1px, ${gridColor} 1px, transparent 0)`,
    backgroundSize: '28px 28px',
  };
}

export function resolveNodeAccent(node: MindMapNode, side: MindMapCanvasSide, themePreset: MindMapThemePreset, depth: number) {
  if (node.style.branchColor !== 'auto') {
    return BRANCH_SWATCHES[node.style.branchColor];
  }

  if (side === 'left') {
    return MIND_MAP_THEME_PALETTES[themePreset].branchBorders[Math.min(depth, 2)] ?? MIND_MAP_THEME_PALETTES[themePreset].connection;
  }

  return MIND_MAP_THEME_PALETTES[themePreset].branchBorders[Math.min(depth, 2)] ?? MIND_MAP_THEME_PALETTES[themePreset].connection;
}

export function resolveNodeSurface(params: {
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
