import { nanoid } from '@/lib/nanoid';
import type { LegacyMindMapNode, MindMapDocument, MindMapLink, MindMapNode } from '@/shared/api/viewer/types';

export type MindMapDropPosition = 'before' | 'after' | 'inside';

function createNodeId() {
  return `mindmap-node-${nanoid(10)}`;
}

function createDefaultNode(id: string, parentId: string | null, label = ''): MindMapNode {
  return {
    id,
    parentId,
    childIds: [],
    label,
    collapsed: false,
    icon: null,
    tags: [],
    noteHtml: '',
    imageUrl: null,
    links: [],
    documentRefs: [],
  };
}

function cloneNodes(nodes: Record<string, MindMapNode>) {
  return Object.fromEntries(
    Object.entries(nodes).map(([nodeId, node]) => [
      nodeId,
      {
        ...node,
        childIds: [...node.childIds],
        tags: [...node.tags],
        links: node.links.map((link) => ({ ...link })),
        documentRefs: [...node.documentRefs],
      },
    ]),
  );
}

function legacyNodeToDocumentNodes(
  node: LegacyMindMapNode,
  parentId: string | null,
  acc: Record<string, MindMapNode>,
) {
  const childIds = (node.children ?? []).map((child) => child.id);
  acc[node.id] = {
    ...createDefaultNode(node.id, parentId, node.label),
    childIds,
  };

  for (const child of node.children ?? []) {
    legacyNodeToDocumentNodes(child, node.id, acc);
  }
}

export function createMindMapDocumentFromLegacy(params: {
  id: string;
  title: string;
  sourceDocumentIds: string[];
  userPrompt: string;
  root: LegacyMindMapNode;
  createdAt: string;
  updatedAt: string;
}): MindMapDocument {
  const nodes: Record<string, MindMapNode> = {};
  legacyNodeToDocumentNodes(params.root, null, nodes);
  return {
    id: params.id,
    title: params.title,
    sourceDocumentIds: [...params.sourceDocumentIds],
    userPrompt: params.userPrompt,
    rootNodeId: params.root.id,
    nodes,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  };
}

export function getMindMapRootNode(document: MindMapDocument) {
  return document.nodes[document.rootNodeId] ?? null;
}

export function updateMindMapNode(
  document: MindMapDocument,
  nodeId: string,
  patch: Partial<MindMapNode>,
) {
  const current = document.nodes[nodeId];
  if (!current) {
    return document;
  }

  return {
    ...document,
    nodes: {
      ...document.nodes,
      [nodeId]: {
        ...current,
        ...patch,
      },
    },
  };
}

export function renameMindMapNode(document: MindMapDocument, nodeId: string, label: string) {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) {
    return document;
  }

  const next = updateMindMapNode(document, nodeId, { label: normalizedLabel });
  if (nodeId !== document.rootNodeId) {
    return next;
  }

  return {
    ...next,
    title: normalizedLabel,
  };
}

export function addChildMindMapNode(document: MindMapDocument, parentId: string) {
  const parent = document.nodes[parentId];
  if (!parent) {
    return { document, nodeId: null as string | null };
  }

  const nodeId = createNodeId();
  const nodes = cloneNodes(document.nodes);
  nodes[parentId] = {
    ...nodes[parentId],
    collapsed: false,
    childIds: [...nodes[parentId].childIds, nodeId],
  };
  nodes[nodeId] = createDefaultNode(nodeId, parentId, '');

  return {
    document: {
      ...document,
      nodes,
    },
    nodeId,
  };
}

export function addSiblingMindMapNode(document: MindMapDocument, nodeId: string) {
  const current = document.nodes[nodeId];
  if (!current?.parentId) {
    return { document, nodeId: null as string | null };
  }

  const parent = document.nodes[current.parentId];
  if (!parent) {
    return { document, nodeId: null as string | null };
  }

  const siblingId = createNodeId();
  const nodes = cloneNodes(document.nodes);
  const insertIndex = nodes[parent.id].childIds.indexOf(nodeId);
  const nextChildIds = [...nodes[parent.id].childIds];
  nextChildIds.splice(insertIndex + 1, 0, siblingId);
  nodes[parent.id] = {
    ...nodes[parent.id],
    childIds: nextChildIds,
  };
  nodes[siblingId] = createDefaultNode(siblingId, parent.id, '');

  return {
    document: {
      ...document,
      nodes,
    },
    nodeId: siblingId,
  };
}

function collectDescendantIds(nodes: Record<string, MindMapNode>, nodeId: string, acc = new Set<string>()) {
  const node = nodes[nodeId];
  if (!node) {
    return acc;
  }

  for (const childId of node.childIds) {
    if (acc.has(childId)) {
      continue;
    }
    acc.add(childId);
    collectDescendantIds(nodes, childId, acc);
  }

  return acc;
}

export function removeMindMapNode(document: MindMapDocument, nodeId: string) {
  if (nodeId === document.rootNodeId) {
    return document;
  }

  const current = document.nodes[nodeId];
  if (!current?.parentId) {
    return document;
  }

  const nodes = cloneNodes(document.nodes);
  const parent = nodes[current.parentId];
  if (!parent) {
    return document;
  }

  nodes[parent.id] = {
    ...parent,
    childIds: parent.childIds.filter((childId) => childId !== nodeId),
  };

  const descendants = collectDescendantIds(nodes, nodeId);
  descendants.add(nodeId);
  for (const descendantId of descendants) {
    delete nodes[descendantId];
  }

  return {
    ...document,
    nodes,
  };
}

export function toggleMindMapNodeCollapsed(document: MindMapDocument, nodeId: string) {
  const node = document.nodes[nodeId];
  if (!node || node.childIds.length === 0) {
    return document;
  }

  return updateMindMapNode(document, nodeId, { collapsed: !node.collapsed });
}

function detachNode(nodes: Record<string, MindMapNode>, nodeId: string) {
  const node = nodes[nodeId];
  if (!node?.parentId) {
    return;
  }

  const parent = nodes[node.parentId];
  if (!parent) {
    return;
  }

  nodes[parent.id] = {
    ...parent,
    childIds: parent.childIds.filter((childId) => childId !== nodeId),
  };
}

function insertChildId(childIds: string[], targetId: string, nodeId: string, position: 'before' | 'after') {
  const index = childIds.indexOf(targetId);
  if (index === -1) {
    return [...childIds, nodeId];
  }

  const next = [...childIds];
  next.splice(position === 'before' ? index : index + 1, 0, nodeId);
  return next;
}

export function isMindMapDescendant(document: MindMapDocument, ancestorId: string, candidateId: string) {
  return collectDescendantIds(document.nodes, ancestorId).has(candidateId);
}

export function moveMindMapNode(
  document: MindMapDocument,
  activeId: string,
  overId: string,
  position: MindMapDropPosition,
) {
  if (
    activeId === overId ||
    activeId === document.rootNodeId ||
    !document.nodes[activeId] ||
    !document.nodes[overId] ||
    isMindMapDescendant(document, activeId, overId)
  ) {
    return document;
  }

  const nodes = cloneNodes(document.nodes);
  const activeNode = nodes[activeId];
  const overNode = nodes[overId];
  detachNode(nodes, activeId);

  if (position === 'inside') {
    nodes[overId] = {
      ...overNode,
      collapsed: false,
      childIds: [...nodes[overId].childIds, activeId],
    };
    nodes[activeId] = {
      ...activeNode,
      parentId: overId,
    };
    return {
      ...document,
      nodes,
    };
  }

  if (!overNode.parentId) {
    return document;
  }

  const targetParent = nodes[overNode.parentId];
  if (!targetParent) {
    return document;
  }

  nodes[targetParent.id] = {
    ...targetParent,
    childIds: insertChildId(targetParent.childIds, overId, activeId, position),
  };
  nodes[activeId] = {
    ...activeNode,
    parentId: targetParent.id,
  };

  return {
    ...document,
    nodes,
  };
}

export function promoteMindMapNode(document: MindMapDocument, nodeId: string) {
  const node = document.nodes[nodeId];
  if (!node?.parentId) {
    return document;
  }

  const parent = document.nodes[node.parentId];
  if (!parent?.parentId) {
    return document;
  }

  return moveMindMapNode(document, nodeId, parent.id, 'after');
}

export function getVisibleMindMapNodeIds(document: MindMapDocument) {
  const result: string[] = [];

  function visit(nodeId: string) {
    const node = document.nodes[nodeId];
    if (!node) {
      return;
    }

    result.push(nodeId);
    if (node.collapsed) {
      return;
    }
    node.childIds.forEach(visit);
  }

  visit(document.rootNodeId);
  return result;
}

function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeLink(link: MindMapLink): MindMapLink | null {
  const label = link.label.trim();
  const url = link.url.trim();
  if (!label || !url || !isValidExternalUrl(url)) {
    return null;
  }

  return {
    id: link.id,
    label,
    url,
  };
}

export function normalizeMindMapDocumentForSave(
  document: MindMapDocument,
  availableDocumentIds?: Set<string>,
): MindMapDocument {
  const nodes = Object.fromEntries(
    Object.entries(document.nodes).map(([nodeId, node]) => [
      nodeId,
      {
        ...node,
        label: node.label.trim() || 'Untitled node',
        icon: node.icon?.trim() || null,
        tags: [...new Set(node.tags.map((tag) => tag.trim()).filter(Boolean))],
        links: node.links
          .map((link) => normalizeLink(link))
          .filter((link): link is MindMapLink => link !== null),
        documentRefs: availableDocumentIds
          ? node.documentRefs.filter((documentId) => availableDocumentIds.has(documentId))
          : [...new Set(node.documentRefs.filter(Boolean))],
      },
    ]),
  );

  const root = nodes[document.rootNodeId];
  return {
    ...document,
    title: root?.label ?? document.title,
    nodes,
  };
}
