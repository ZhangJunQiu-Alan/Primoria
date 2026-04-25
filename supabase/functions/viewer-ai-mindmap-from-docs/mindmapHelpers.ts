export const MAX_TITLE_LENGTH = 80;
export const MAX_LABEL_LENGTH = 72;
export const MAX_TOTAL_NODES = 40;
export const MAX_CHILDREN_PER_NODE = 6;
export const MAX_DEPTH = 4;

export type TutorDocumentRecord = {
  id: string;
  filename: string;
  display_title?: string | null;
  extracted_text: string;
};

export type RawMindMapNode = {
  label: string;
  children?: RawMindMapNode[];
};

export type LegacyMindMapNode = {
  id: string;
  label: string;
  children?: LegacyMindMapNode[];
};

export type PersistedMindMapNode = {
  id: string;
  parentId: string | null;
  childIds: string[];
  label: string;
  collapsed: boolean;
  icon: string | null;
  tags: string[];
  noteHtml: string;
  imageUrl: string | null;
  links: Array<{ id: string; label: string; url: string }>;
  documentRefs: string[];
};

export function normalizeLabel(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
}

export function normalizeTitle(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
}

export function sanitizeMindMapTree(root: RawMindMapNode): LegacyMindMapNode {
  const state = { count: 0 };

  function visit(node: RawMindMapNode, depth: number): LegacyMindMapNode | null {
    if (state.count >= MAX_TOTAL_NODES) {
      return null;
    }

    const label = normalizeLabel(node.label);
    if (!label) {
      return null;
    }

    state.count += 1;
    const sanitized: LegacyMindMapNode = {
      id: `node-${crypto.randomUUID()}`,
      label,
    };

    if (depth >= MAX_DEPTH) {
      return sanitized;
    }

    const children: LegacyMindMapNode[] = [];
    for (const child of (node.children ?? []).slice(0, MAX_CHILDREN_PER_NODE)) {
      const nextChild = visit(child, depth + 1);
      if (nextChild) {
        children.push(nextChild);
      }
      if (state.count >= MAX_TOTAL_NODES) {
        break;
      }
    }

    if (children.length) {
      sanitized.children = children;
    }

    return sanitized;
  }

  const sanitizedRoot = visit(root, 0);
  if (!sanitizedRoot) {
    throw new Error('Mind map root could not be normalized.');
  }

  return sanitizedRoot;
}

export function toPersistedDocument(root: LegacyMindMapNode) {
  const nodes: Record<string, PersistedMindMapNode> = {};

  function visit(node: LegacyMindMapNode, parentId: string | null) {
    const childIds = (node.children ?? []).map((child) => child.id);
    nodes[node.id] = {
      id: node.id,
      parentId,
      childIds,
      label: node.label,
      collapsed: false,
      icon: null,
      tags: [],
      noteHtml: '',
      imageUrl: null,
      links: [],
      documentRefs: [],
    };

    for (const child of node.children ?? []) {
      visit(child, node.id);
    }
  }

  visit(root, null);

  return { rootNodeId: root.id, nodes };
}

export function buildMindMapPrompt(documents: TutorDocumentRecord[], userPrompt: string) {
  const materials = documents
    .map((document, index) => `[文件${index + 1}: ${document.display_title?.trim() || document.filename}]\n${document.extracted_text}`)
    .join('\n\n');

  const sections = [
    '你是一位学习教练，请根据以下学习资料生成一张适合复习的思维导图。',
    '目标：帮助学习者快速看清知识主干、关键分支和概念之间的连接。',
    '',
    '语言规则：',
    '- 输出语言必须与资料主语言一致',
    '- 不要混用语言',
    '',
    '结构规则：',
    '- 必须输出单根树形结构，不要输出平铺列表',
    '- 根节点概括整份资料主题',
    '- 总层级控制在 2 到 4 层',
    `- 总节点数不要超过 ${MAX_TOTAL_NODES} 个`,
    `- 每个节点最多 ${MAX_CHILDREN_PER_NODE} 个直接子节点`,
    '- 节点标签使用短语，不写完整长句',
    '- 避免"介绍""内容""其他"这类空泛标签',
    '',
    '内容规则：',
    '- 只使用资料中明确出现或可直接归纳出的概念',
    '- 不要补充没有来源的新知识',
    '- 适当体现并列关系、因果关系、组成关系或步骤关系',
    '- 如果资料跨度较大，优先围绕核心考试或复习重点组织结构',
    '',
    '输出格式：',
    '只返回 JSON，从 { 开始，不要 markdown，不要解释文字。',
    '',
    '{',
    '  "title": "简洁准确的导图标题",',
    '  "root": {',
    '    "label": "根节点",',
    '    "children": [',
    '      {',
    '        "label": "一级分支",',
    '        "children": [',
    '          { "label": "二级分支" }',
    '        ]',
    '      }',
    '    ]',
    '  }',
    '}',
    '',
    '## 学习资料',
    materials,
  ];

  if (userPrompt.trim()) {
    sections.push('', '## 用户追加要求', userPrompt.trim(), '', '注意：用户追加要求只能作为补充约束，不能改变 JSON 结构要求。');
  }

  return sections.join('\n');
}
