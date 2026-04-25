import type { MindMapDocument, MindMapNode } from '@/shared/api/viewer/types';

export type MindMapCanvasSide = 'center' | 'left' | 'right';

export type MindMapNodeCanvasBox = {
  nodeId: string;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  side: MindMapCanvasSide;
  depth: number;
};

export type MindMapConnectionPath = {
  fromId: string;
  toId: string;
  d: string;
  side: Exclude<MindMapCanvasSide, 'center'>;
};

type SubtreeMetric = {
  width: number;
  height: number;
};

const BOARD_PADDING = 92;
const ROOT_BRANCH_GAP = 116;
const LEVEL_GAP = 88;
const SIBLING_GAP = 26;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitChildren(node: MindMapNode, isFocusedRoot: boolean) {
  if (node.collapsed || node.childIds.length === 0) {
    return {
      left: [] as string[],
      right: [] as string[],
      ordered: [] as string[],
    };
  }

  if (!isFocusedRoot) {
    return {
      left: [] as string[],
      right: node.childIds,
      ordered: node.childIds,
    };
  }

  const left: string[] = [];
  const right: string[] = [];
  node.childIds.forEach((childId, index) => {
    if (index % 2 === 0) {
      right.push(childId);
    } else {
      left.push(childId);
    }
  });

  return {
    left,
    right,
    ordered: [...left, ...right],
  };
}

function estimateNodeBox(node: MindMapNode, depth: number, isRoot: boolean) {
  const markerRows = node.markers.length ? 1 : 0;
  const labelRows = Math.max(1, Math.ceil((node.label.length || 1) / (isRoot ? 18 : 20)));
  const width = clamp(
    (isRoot ? 210 : 156) +
      Math.min(node.label.length * (isRoot ? 4.4 : 4), 84) +
      (node.imageUrl ? 22 : 0) +
      (node.tags.length ? 14 : 0) +
      (node.markers.length ? 12 : 0),
    isRoot ? 220 : 164,
    isRoot ? 286 : 244,
  );

  const height =
    (isRoot ? 72 : 58) +
    (labelRows - 1) * 18 +
    (node.tags.length ? 24 : 0) +
    markerRows * 20 +
    (node.imageUrl ? 86 : 0) +
    (depth > 1 ? 4 : 0);

  return { width, height };
}

function buildVisibleNodeSet(document: MindMapDocument, rootId: string) {
  const visible = new Set<string>();

  function visit(nodeId: string) {
    const node = document.nodes[nodeId];
    if (!node || visible.has(nodeId)) {
      return;
    }

    visible.add(nodeId);
    if (node.collapsed) {
      return;
    }

    node.childIds.forEach(visit);
  }

  visit(rootId);
  return visible;
}

function sumStackHeight(metrics: SubtreeMetric[]) {
  if (!metrics.length) {
    return 0;
  }
  return metrics.reduce((total, metric) => total + metric.height, 0) + (metrics.length - 1) * SIBLING_GAP;
}

export function buildMindMapCanvasLayout(document: MindMapDocument, focusNodeId?: string | null) {
  const visualRootId = focusNodeId && document.nodes[focusNodeId] ? focusNodeId : document.rootNodeId;
  const visible = buildVisibleNodeSet(document, visualRootId);
  const metrics = new Map<string, SubtreeMetric>();

  function measure(nodeId: string, side: Exclude<MindMapCanvasSide, 'center'>, depth: number, isFocusedRoot = false): SubtreeMetric {
    const cacheKey = `${nodeId}:${side}`;
    const cached = metrics.get(cacheKey);
    if (cached) {
      return cached;
    }

    const node = document.nodes[nodeId];
    if (!node) {
      const fallback = { width: 0, height: 0 };
      metrics.set(cacheKey, fallback);
      return fallback;
    }

    const nodeBox = estimateNodeBox(node, depth, isFocusedRoot);
    const { left, right } = splitChildren(node, isFocusedRoot);
    const childIds = isFocusedRoot ? (side === 'left' ? left : right) : right;
    const childMetrics = childIds
      .filter((childId) => visible.has(childId))
      .map((childId) => measure(childId, side, depth + 1));
    const childHeight = sumStackHeight(childMetrics);
    const childWidth = childMetrics.length ? Math.max(...childMetrics.map((metric) => metric.width)) : 0;

    const result = {
      width: childMetrics.length ? nodeBox.width + LEVEL_GAP + childWidth : nodeBox.width,
      height: Math.max(nodeBox.height, childHeight),
    };

    metrics.set(cacheKey, result);
    return result;
  }

  const rootNode = document.nodes[visualRootId];
  if (!rootNode) {
    return {
      visualRootId: document.rootNodeId,
      width: 0,
      height: 0,
      nodeBoxes: {} as Record<string, MindMapNodeCanvasBox>,
      connections: [] as MindMapConnectionPath[],
    };
  }

  const rootBox = estimateNodeBox(rootNode, 0, true);
  const rootChildren = splitChildren(rootNode, true);
  const leftMetrics = rootChildren.left.filter((childId) => visible.has(childId)).map((childId) => measure(childId, 'left', 1));
  const rightMetrics = rootChildren.right.filter((childId) => visible.has(childId)).map((childId) => measure(childId, 'right', 1));
  const leftWidth = leftMetrics.length ? Math.max(...leftMetrics.map((metric) => metric.width)) : 0;
  const rightWidth = rightMetrics.length ? Math.max(...rightMetrics.map((metric) => metric.width)) : 0;
  const leftHeight = sumStackHeight(leftMetrics);
  const rightHeight = sumStackHeight(rightMetrics);
  const contentHeight = Math.max(rootBox.height, leftHeight, rightHeight);
  const totalWidth = BOARD_PADDING * 2 + leftWidth + rightWidth + rootBox.width + ROOT_BRANCH_GAP * 2;
  const totalHeight = BOARD_PADDING * 2 + contentHeight;

  const nodeBoxes: Record<string, MindMapNodeCanvasBox> = {};

  function positionSubtree(
    nodeId: string,
    side: Exclude<MindMapCanvasSide, 'center'>,
    depth: number,
    xLeft: number,
    yTop: number,
    parentId: string | null,
  ) {
    const node = document.nodes[nodeId];
    if (!node || !visible.has(nodeId)) {
      return;
    }

    const subtree = measure(nodeId, side, depth);
    const box = estimateNodeBox(node, depth, false);
    const nodeX = side === 'right' ? xLeft : xLeft + subtree.width - box.width;
    const nodeY = yTop + subtree.height / 2 - box.height / 2;

    nodeBoxes[nodeId] = {
      nodeId,
      parentId,
      x: nodeX,
      y: nodeY,
      width: box.width,
      height: box.height,
      side,
      depth,
    };

    if (node.collapsed || node.childIds.length === 0) {
      return;
    }

    const childIds = node.childIds.filter((childId) => visible.has(childId));
    if (!childIds.length) {
      return;
    }

    const childMetrics = childIds.map((childId) => measure(childId, side, depth + 1));
    const childrenHeight = sumStackHeight(childMetrics);
    let cursorY = yTop + subtree.height / 2 - childrenHeight / 2;
    const childXLeft = side === 'right' ? nodeX + box.width + LEVEL_GAP : xLeft;

    childIds.forEach((childId, index) => {
      positionSubtree(childId, side, depth + 1, childXLeft, cursorY, nodeId);
      cursorY += childMetrics[index]?.height ?? 0;
      cursorY += SIBLING_GAP;
    });
  }

  const rootX = BOARD_PADDING + leftWidth + ROOT_BRANCH_GAP;
  const rootY = BOARD_PADDING + contentHeight / 2 - rootBox.height / 2;

  nodeBoxes[visualRootId] = {
    nodeId: visualRootId,
    parentId: null,
    x: rootX,
    y: rootY,
    width: rootBox.width,
    height: rootBox.height,
    side: 'center',
    depth: 0,
  };

  let leftCursorY = BOARD_PADDING + contentHeight / 2 - leftHeight / 2;
  rootChildren.left.forEach((childId) => {
    const metric = measure(childId, 'left', 1);
    positionSubtree(childId, 'left', 1, BOARD_PADDING, leftCursorY, visualRootId);
    leftCursorY += metric.height + SIBLING_GAP;
  });

  let rightCursorY = BOARD_PADDING + contentHeight / 2 - rightHeight / 2;
  rootChildren.right.forEach((childId) => {
    const metric = measure(childId, 'right', 1);
    positionSubtree(childId, 'right', 1, rootX + rootBox.width + ROOT_BRANCH_GAP, rightCursorY, visualRootId);
    rightCursorY += metric.height + SIBLING_GAP;
  });

  const connections: MindMapConnectionPath[] = Object.values(nodeBoxes)
    .filter((box) => box.parentId && nodeBoxes[box.parentId])
    .map((box) => {
      const parent = nodeBoxes[box.parentId!];
      const side = box.side === 'center' ? 'right' : box.side;
      const startX = side === 'right' ? parent.x + parent.width : parent.x;
      const endX = side === 'right' ? box.x : box.x + box.width;
      const startY = parent.y + parent.height / 2;
      const endY = box.y + box.height / 2;
      const delta = Math.max(36, Math.abs(endX - startX) * 0.48);
      const controlStartX = side === 'right' ? startX + delta : startX - delta;
      const controlEndX = side === 'right' ? endX - delta : endX + delta;

      return {
        fromId: parent.nodeId,
        toId: box.nodeId,
        side,
        d: `M ${startX} ${startY} C ${controlStartX} ${startY}, ${controlEndX} ${endY}, ${endX} ${endY}`,
      };
    });

  return {
    visualRootId,
    width: totalWidth,
    height: totalHeight,
    nodeBoxes,
    connections,
  };
}
