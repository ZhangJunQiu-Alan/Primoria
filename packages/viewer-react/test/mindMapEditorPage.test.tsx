import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MindMapDocument, TutorDocument } from '@/shared/api/viewer/types';
import { renderRoute } from './renderApp';

let mockMindMap: MindMapDocument;
let mockDocuments: TutorDocument[] = [];

const fetchMindMapMock = vi.fn(async () => mockMindMap);
const fetchTutorDocumentsMock = vi.fn(async () => [...mockDocuments]);
const updateMindMapMock = vi.fn(async (_id: string, payload: MindMapDocument) => ({
  ...payload,
  updatedAt: new Date('2026-04-16T08:30:00.000Z').toISOString(),
}));
const uploadMindMapImageMock = vi.fn();

vi.mock('@/shared/api/viewer/tutorDocumentsApi', () => ({
  fetchMindMap: fetchMindMapMock,
  fetchTutorDocuments: fetchTutorDocumentsMock,
  updateMindMap: updateMindMapMock,
  fetchTutorDocumentsForPrompt: vi.fn(),
  createTutorDocument: vi.fn(),
  deleteTutorDocument: vi.fn(),
  listMindMaps: vi.fn(async () => []),
  createMindMapFromDocs: vi.fn(),
  createQuizFromDocs: vi.fn(),
}));

vi.mock('@/features/ai-tutor/uploadMindMapImage', () => ({
  uploadMindMapImage: uploadMindMapImageMock,
}));

function createLegacyMindMapFixture() {
  return {
    id: 'mindmap-1',
    title: 'Physics review',
    sourceDocumentIds: ['doc-1'],
    userPrompt: '',
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        parentId: null,
        childIds: ['branch-1', 'branch-2'],
        label: 'Physics review',
        collapsed: false,
        icon: '🧭',
        tags: ['midterm'],
        noteHtml: '<p>Root note</p>',
        imageUrl: null,
        links: [],
        documentRefs: [],
      },
      'branch-1': {
        id: 'branch-1',
        parentId: 'root',
        childIds: [],
        label: 'Motion',
        collapsed: false,
        icon: null,
        tags: [],
        noteHtml: '<p>Motion note</p>',
        imageUrl: null,
        links: [],
        documentRefs: ['doc-1'],
      },
      'branch-2': {
        id: 'branch-2',
        parentId: 'root',
        childIds: [],
        label: 'Forces',
        collapsed: false,
        icon: null,
        tags: [],
        noteHtml: '<p>Forces note</p>',
        imageUrl: null,
        links: [],
        documentRefs: [],
      },
    },
    createdAt: new Date('2026-04-16T08:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-04-16T08:00:00.000Z').toISOString(),
  } as unknown as MindMapDocument;
}

describe('AiTutorMindMapEditorPage', () => {
  beforeEach(() => {
    mockMindMap = createLegacyMindMapFixture();
    mockDocuments = [
      {
        id: 'doc-1',
        filename: 'week02.pdf',
        display_title: null,
        mime_type: 'application/pdf',
        extracted_chars: 3424,
        created_at: new Date('2026-04-15T08:00:00.000Z').toISOString(),
        updated_at: new Date('2026-04-15T08:00:00.000Z').toISOString(),
      },
    ];
    fetchMindMapMock.mockClear();
    fetchTutorDocumentsMock.mockClear();
    updateMindMapMock.mockClear();
    uploadMindMapImageMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the editor shell and balances legacy root branches across the canvas', async () => {
    renderRoute('/ai-tutor/mindmap/mindmap-1', 'user');

    expect(await screen.findByTestId('mindmap-editor-toolbar', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByTestId('mindmap-editor-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('mindmap-editor-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('mindmap-connection-layer')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Physics review')).toHaveLength(2);

    expect(await screen.findByTestId('mindmap-node-branch-1', {}, { timeout: 15000 })).toHaveAttribute('data-side', 'right');
    expect(screen.getByTestId('mindmap-node-branch-2')).toHaveAttribute('data-side', 'left');
  }, 30000);

  it('supports keyboard creation, undo/redo, and persists theme plus marker metadata', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor/mindmap/mindmap-1', 'user');

    expect(await screen.findByTestId('mindmap-selection-toolbar', {}, { timeout: 15000 })).toBeInTheDocument();
    const viewport = screen.getByTestId('mindmap-canvas-viewport');
    viewport.focus();
    await user.keyboard('{Tab}');

    await waitFor(() => {
      expect(globalThis.document.querySelectorAll('[data-testid^="mindmap-node-"]').length).toBe(4);
    });

    await user.click(screen.getByRole('button', { name: /撤销/i }));
    expect(globalThis.document.querySelectorAll('[data-testid^="mindmap-node-"]').length).toBe(3);

    await user.click(screen.getByRole('button', { name: /重做/i }));
    expect(globalThis.document.querySelectorAll('[data-testid^="mindmap-node-"]').length).toBe(4);

    updateMindMapMock.mockClear();
    await user.click(screen.getByRole('button', { name: /Stone/i }));
    await user.click(screen.getByRole('button', { name: /P1/i }));

    await waitFor(() => {
      expect(updateMindMapMock).toHaveBeenCalled();
    }, { timeout: 4000 });

    const lastCall = updateMindMapMock.mock.calls.at(-1) as [string, MindMapDocument] | undefined;
    expect(lastCall?.[1].theme.preset).toBe('stone');
    expect(lastCall?.[1].nodes.root?.markers).toContain('priority-high');
    expect(lastCall?.[1].nodes.root?.style).toBeDefined();
  }, 30000);
});
