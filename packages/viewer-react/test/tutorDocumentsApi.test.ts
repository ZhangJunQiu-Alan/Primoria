const insertMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();
const fetchMock = vi.fn();
const deleteEqMock = vi.fn();
const deleteEqBuilder = { eq: deleteEqMock };
const deleteMock = vi.fn(() => deleteEqBuilder);
const updateSelectSingleMock = vi.fn();
const updateSelectMock = vi.fn(() => ({ single: updateSelectSingleMock }));
const updateEqMock = vi.fn(() => ({ select: updateSelectMock }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn((table: string) => {
  if (table === 'tutor_documents') {
    return {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-123' } },
        error: null,
      })),
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'session-token-123' } },
        error: null,
      })),
    },
    from: fromMock,
  },
}));

describe('tutorDocumentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);

    orderMock.mockResolvedValue({ data: [], error: null });
    selectMock.mockReturnValue({ order: orderMock });
    insertMock.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: 'doc-1',
            filename: 'notes.docx',
            display_title: null,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extracted_chars: 12,
            created_at: '2026-04-07T00:00:00Z',
            updated_at: '2026-04-07T00:00:00Z',
          },
          error: null,
        }),
      }),
    });
    updateSelectSingleMock.mockResolvedValue({
      data: {
        id: 'doc-1',
        filename: 'notes.docx',
        display_title: 'Week 2 notes',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extracted_chars: 12,
        created_at: '2026-04-07T00:00:00Z',
        updated_at: '2026-04-07T00:00:00Z',
      },
      error: null,
    });
    deleteEqMock.mockResolvedValue({ error: null });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ courseId: 'course-1', courseTitle: 'Quiz' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('inserts tutor documents with the signed-in user id', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    const { createTutorDocument } = await import('@/shared/api/viewer/tutorDocumentsApi');

    const document = await createTutorDocument({
      filename: 'notes.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: 'hello world',
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        filename: 'notes.docx',
        extracted_text: 'hello world',
      }),
    );
    expect(document.id).toBe('doc-1');
  });

  it('falls back to the legacy tutor documents select when display_title is unavailable', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    orderMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '42703',
          message: 'column tutor_documents.display_title does not exist',
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'doc-legacy-1',
            filename: 'legacy-notes.pdf',
            mime_type: 'application/pdf',
            extracted_chars: 18,
            created_at: '2026-04-07T00:00:00Z',
            updated_at: '2026-04-07T00:00:00Z',
          },
        ],
        error: null,
      });

    const { fetchTutorDocuments } = await import('@/shared/api/viewer/tutorDocumentsApi');
    const documents = await fetchTutorDocuments();

    expect(selectMock).toHaveBeenNthCalledWith(
      1,
      'id, filename, display_title, mime_type, extracted_chars, created_at, updated_at',
    );
    expect(selectMock).toHaveBeenNthCalledWith(
      2,
      'id, filename, mime_type, extracted_chars, created_at, updated_at',
    );
    expect(documents).toEqual([
      expect.objectContaining({
        id: 'doc-legacy-1',
        filename: 'legacy-notes.pdf',
        display_title: null,
      }),
    ]);
  });

  it('falls back to the legacy tutor documents select after upload when display_title is unavailable', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    insertMock.mockImplementation(() => ({
      select: (fields: string) => ({
        single: async () =>
          fields.includes('display_title')
            ? {
                data: null,
                error: {
                  code: '42703',
                  message: 'column tutor_documents.display_title does not exist',
                },
              }
            : {
                data: {
                  id: 'doc-legacy-2',
                  filename: 'legacy-upload.docx',
                  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  extracted_chars: 24,
                  created_at: '2026-04-07T00:00:00Z',
                  updated_at: '2026-04-07T00:00:00Z',
                },
                error: null,
              },
      }),
    }));

    const { createTutorDocument } = await import('@/shared/api/viewer/tutorDocumentsApi');
    const document = await createTutorDocument({
      filename: 'legacy-upload.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: 'legacy extracted content',
    });

    expect(document).toMatchObject({
      id: 'doc-legacy-2',
      filename: 'legacy-upload.docx',
      display_title: null,
    });
  });

  it('updates tutor document display titles without changing filenames', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    const { updateTutorDocumentTitle } = await import('@/shared/api/viewer/tutorDocumentsApi');

    const document = await updateTutorDocumentTitle('doc-1', 'Week 2 notes');

    expect(updateMock).toHaveBeenCalledWith({
      display_title: 'Week 2 notes',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'doc-1');
    expect(document).toMatchObject({
      id: 'doc-1',
      filename: 'notes.docx',
      display_title: 'Week 2 notes',
    });
  });

  it('clears tutor document display titles when the input is empty', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    updateSelectSingleMock.mockResolvedValueOnce({
      data: {
        id: 'doc-1',
        filename: 'notes.docx',
        display_title: null,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extracted_chars: 12,
        created_at: '2026-04-07T00:00:00Z',
        updated_at: '2026-04-07T00:00:00Z',
      },
      error: null,
    });

    const { updateTutorDocumentTitle } = await import('@/shared/api/viewer/tutorDocumentsApi');

    const document = await updateTutorDocumentTitle('doc-1', '   ');

    expect(updateMock).toHaveBeenCalledWith({
      display_title: null,
    });
    expect(document.display_title).toBeNull();
    expect(document.filename).toBe('notes.docx');
  });

  it('reports a clear upgrade error when display_title updates are unavailable', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    updateSelectSingleMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: '42703',
        message: 'column tutor_documents.display_title does not exist',
      },
    });

    const { TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE, updateTutorDocumentTitle } = await import(
      '@/shared/api/viewer/tutorDocumentsApi'
    );

    await expect(updateTutorDocumentTitle('doc-1', 'Week 2 notes')).rejects.toMatchObject({
      code: TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE,
    });
  });

  it('maps transport failures to a quiz service unavailable error', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const { createQuizFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createQuizFromDocs({
        documentIds: ['doc-1'],
        questionCount: 10,
        language: 'en',
      }),
    ).rejects.toMatchObject({
      code: 'TUTOR_QUIZ_SERVICE_UNAVAILABLE',
      message: 'Failed to fetch',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/v1/llm/tutor/quiz-from-docs',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('surfaces backend quiz errors from agent responses', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'The selected documents are too long. Remove some and try again.' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { createQuizFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createQuizFromDocs({
        documentIds: ['doc-1'],
        questionCount: 10,
        language: 'en',
      }),
    ).rejects.toThrow('The selected documents are too long. Remove some and try again.');
  });

  it('creates a docs-based mind map and validates the response shape', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        title: 'Physics review',
        mindMapId: 'mindmap-1',
        root: {
          id: 'root-1',
          label: 'Physics review',
          children: [{ id: 'child-1', label: 'Motion' }],
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { createMindMapFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');
    const result = await createMindMapFromDocs({
      documentIds: ['doc-1'],
      prompt: 'Focus on cause and effect.',
    });

    expect(result.title).toBe('Physics review');
    expect(result.mindMapId).toBe('mindmap-1');
    expect(result.root.children?.[0]?.label).toBe('Motion');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/v1/llm/tutor/mindmap-from-docs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          documentIds: ['doc-1'],
          prompt: 'Focus on cause and effect.',
        }),
      }),
    );
  });

  it('maps transport failures to a mind map service unavailable error', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { createMindMapFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createMindMapFromDocs({
        documentIds: ['doc-1'],
      }),
    ).rejects.toMatchObject({
      code: 'TUTOR_MINDMAP_SERVICE_UNAVAILABLE',
      message: 'Failed to fetch',
    });
  });
});
