import {
  normalizeLabel,
  normalizeTitle,
  sanitizeMindMapTree,
  toPersistedDocument,
  buildMindMapPrompt,
  MAX_LABEL_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_NODES,
  MAX_CHILDREN_PER_NODE,
  MAX_DEPTH,
  type RawMindMapNode,
  type LegacyMindMapNode,
} from './mindmapHelpers.ts';

function assertEquals<T>(actual: T, expected: T, label?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${label ? label + ': ' : ''}expected ${b}, got ${a}`);
  }
}

function assertContains(haystack: string, needle: string, label?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label ? label + ': ' : ''}expected string to contain ${JSON.stringify(needle)}`);
  }
}

function assertThrows(fn: () => unknown, expectedMessage: string) {
  try {
    fn();
    throw new Error(`Expected function to throw with message containing "${expectedMessage}", but it did not throw`);
  } catch (err) {
    if (err instanceof Error && err.message.includes(expectedMessage)) return;
    throw err;
  }
}

function countNodes(node: LegacyMindMapNode): number {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0);
}

// ── normalizeLabel ───────────────────────────────────────────────────────────

Deno.test('normalizeLabel: collapses internal whitespace', () => {
  assertEquals(normalizeLabel('  hello   world  '), 'hello world');
});

Deno.test('normalizeLabel: truncates to MAX_LABEL_LENGTH', () => {
  const long = 'a'.repeat(MAX_LABEL_LENGTH + 10);
  assertEquals(normalizeLabel(long).length, MAX_LABEL_LENGTH);
});

Deno.test('normalizeLabel: empty string stays empty', () => {
  assertEquals(normalizeLabel(''), '');
});

// ── normalizeTitle ───────────────────────────────────────────────────────────

Deno.test('normalizeTitle: truncates to MAX_TITLE_LENGTH', () => {
  const long = 'b'.repeat(MAX_TITLE_LENGTH + 5);
  assertEquals(normalizeTitle(long).length, MAX_TITLE_LENGTH);
});

Deno.test('normalizeTitle: trims leading/trailing whitespace', () => {
  assertEquals(normalizeTitle('  My Title  '), 'My Title');
});

// ── sanitizeMindMapTree ──────────────────────────────────────────────────────

Deno.test('sanitizeMindMapTree: single root node is returned correctly', () => {
  const result = sanitizeMindMapTree({ label: 'Root' });
  assertEquals(result.label, 'Root');
  assertEquals(result.children, undefined);
});

Deno.test('sanitizeMindMapTree: assigns unique ids to each node', () => {
  const result = sanitizeMindMapTree({
    label: 'Root',
    children: [{ label: 'A' }, { label: 'B' }],
  });
  const ids = [result.id, ...(result.children ?? []).map((c) => c.id)];
  const unique = new Set(ids);
  assertEquals(unique.size, ids.length, 'all node ids must be unique');
});

Deno.test('sanitizeMindMapTree: preserves children within limits', () => {
  const result = sanitizeMindMapTree({
    label: 'Root',
    children: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
  });
  assertEquals(result.children?.length, 3);
});

Deno.test('sanitizeMindMapTree: throws for empty root label', () => {
  assertThrows(() => sanitizeMindMapTree({ label: '' }), 'root could not be normalized');
});

Deno.test('sanitizeMindMapTree: throws for whitespace-only root label', () => {
  assertThrows(() => sanitizeMindMapTree({ label: '   ' }), 'root could not be normalized');
});

Deno.test('sanitizeMindMapTree: truncates children beyond MAX_CHILDREN_PER_NODE', () => {
  const children: RawMindMapNode[] = Array.from(
    { length: MAX_CHILDREN_PER_NODE + 3 },
    (_, i) => ({ label: `Child ${i}` }),
  );
  const result = sanitizeMindMapTree({ label: 'Root', children });
  assertEquals(result.children?.length, MAX_CHILDREN_PER_NODE);
});

Deno.test('sanitizeMindMapTree: total nodes never exceed MAX_TOTAL_NODES', () => {
  // Build a tree with way more nodes than the limit
  function makeWide(depth: number): RawMindMapNode {
    if (depth === 0) return { label: `leaf` };
    return {
      label: `node-d${depth}`,
      children: Array.from({ length: MAX_CHILDREN_PER_NODE }, () => makeWide(depth - 1)),
    };
  }
  const bigTree = makeWide(4);
  const result = sanitizeMindMapTree(bigTree);
  const total = countNodes(result);
  if (total > MAX_TOTAL_NODES) {
    throw new Error(`Expected at most ${MAX_TOTAL_NODES} nodes, got ${total}`);
  }
});

Deno.test('sanitizeMindMapTree: children at MAX_DEPTH are dropped (node kept, its children not)', () => {
  // depth: Root(0) > L1(1) > L2(2) > L3(3) > L4(4) — L4 children should be dropped
  const deep: RawMindMapNode = {
    label: 'Root',
    children: [{
      label: 'L1',
      children: [{
        label: 'L2',
        children: [{
          label: 'L3',
          children: [{
            label: 'L4',
            children: [{ label: 'L5-should-be-dropped' }],
          }],
        }],
      }],
    }],
  };
  const result = sanitizeMindMapTree(deep);
  const l4 = result.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
  assertEquals(l4?.label, 'L4', 'L4 node should be present');
  assertEquals(l4?.children, undefined, 'L4 children should be dropped at MAX_DEPTH');
});

Deno.test('sanitizeMindMapTree: labels exceeding MAX_LABEL_LENGTH are truncated', () => {
  const longLabel = 'x'.repeat(MAX_LABEL_LENGTH + 20);
  const result = sanitizeMindMapTree({ label: longLabel });
  if (result.label.length > MAX_LABEL_LENGTH) {
    throw new Error(`Label length ${result.label.length} exceeds MAX_LABEL_LENGTH ${MAX_LABEL_LENGTH}`);
  }
});

// ── toPersistedDocument ──────────────────────────────────────────────────────

Deno.test('toPersistedDocument: root node has null parentId and correct childIds', () => {
  const root: LegacyMindMapNode = { id: 'r1', label: 'Root' };
  const doc = toPersistedDocument(root);
  assertEquals(doc.rootNodeId, 'r1');
  assertEquals(doc.nodes['r1'].parentId, null);
  assertEquals(doc.nodes['r1'].childIds, []);
});

Deno.test('toPersistedDocument: child has correct parentId and root lists it in childIds', () => {
  const root: LegacyMindMapNode = {
    id: 'r1',
    label: 'Root',
    children: [{ id: 'c1', label: 'Child' }],
  };
  const doc = toPersistedDocument(root);
  assertEquals(doc.nodes['c1'].parentId, 'r1');
  assertEquals(doc.nodes['r1'].childIds, ['c1']);
});

Deno.test('toPersistedDocument: all nodes in tree appear in nodes map', () => {
  const root: LegacyMindMapNode = {
    id: 'r1',
    label: 'Root',
    children: [
      { id: 'c1', label: 'Child 1', children: [{ id: 'gc1', label: 'Grandchild' }] },
      { id: 'c2', label: 'Child 2' },
    ],
  };
  const doc = toPersistedDocument(root);
  assertEquals(Object.keys(doc.nodes).sort(), ['c1', 'c2', 'gc1', 'r1']);
  assertEquals(doc.nodes['gc1'].parentId, 'c1');
});

Deno.test('toPersistedDocument: default fields are set correctly', () => {
  const root: LegacyMindMapNode = { id: 'r1', label: 'Root' };
  const doc = toPersistedDocument(root);
  const node = doc.nodes['r1'];
  assertEquals(node.collapsed, false);
  assertEquals(node.icon, null);
  assertEquals(node.tags, []);
  assertEquals(node.noteHtml, '');
  assertEquals(node.imageUrl, null);
  assertEquals(node.links, []);
  assertEquals(node.documentRefs, []);
});

// ── buildMindMapPrompt ───────────────────────────────────────────────────────

Deno.test('buildMindMapPrompt: includes document filename and content', () => {
  const docs = [{ id: '1', filename: 'notes.pdf', extracted_text: 'important content' }];
  const prompt = buildMindMapPrompt(docs, '');
  assertContains(prompt, 'notes.pdf');
  assertContains(prompt, 'important content');
});

Deno.test('buildMindMapPrompt: multiple documents indexed', () => {
  const docs = [
    { id: '1', filename: 'a.pdf', extracted_text: 'content a' },
    { id: '2', filename: 'b.pdf', extracted_text: 'content b' },
  ];
  const prompt = buildMindMapPrompt(docs, '');
  assertContains(prompt, '文件1: a.pdf');
  assertContains(prompt, '文件2: b.pdf');
});

Deno.test('buildMindMapPrompt: prefers display_title over filename when present', () => {
  const docs = [{ id: '1', filename: 'notes.pdf', display_title: 'Week 2 notes', extracted_text: 'important content' }];
  const prompt = buildMindMapPrompt(docs, '');
  assertContains(prompt, 'Week 2 notes');
});

Deno.test('buildMindMapPrompt: user prompt appended when non-empty', () => {
  const docs = [{ id: '1', filename: 'x.pdf', extracted_text: 'text' }];
  const prompt = buildMindMapPrompt(docs, 'focus on chapter 3');
  assertContains(prompt, 'focus on chapter 3');
  assertContains(prompt, '用户追加要求');
});

Deno.test('buildMindMapPrompt: empty user prompt adds no extra section', () => {
  const docs = [{ id: '1', filename: 'x.pdf', extracted_text: 'text' }];
  const prompt = buildMindMapPrompt(docs, '');
  if (prompt.includes('用户追加要求')) {
    throw new Error('Should not include user prompt section when prompt is empty');
  }
});
