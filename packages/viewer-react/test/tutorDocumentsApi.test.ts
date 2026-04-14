const insertMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();
const invokeMock = vi.fn();
const deleteEqMock = vi.fn();
const deleteEqBuilder = { eq: deleteEqMock };
const deleteMock = vi.fn(() => deleteEqBuilder);
const fromMock = vi.fn((table: string) => {
  if (table === 'tutor_documents') {
    return {
      select: selectMock,
      insert: insertMock,
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
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('tutorDocumentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    orderMock.mockResolvedValue({ data: [], error: null });
    selectMock.mockReturnValue({ order: orderMock });
    insertMock.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: 'doc-1',
            filename: 'notes.docx',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extracted_chars: 12,
            created_at: '2026-04-07T00:00:00Z',
            updated_at: '2026-04-07T00:00:00Z',
          },
          error: null,
        }),
      }),
    });
    deleteEqMock.mockResolvedValue({ error: null });
    invokeMock.mockResolvedValue({ data: { courseId: 'course-1', courseTitle: 'Quiz' }, error: null });
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

  it('maps transport failures to a quiz service unavailable error', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    invokeMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Failed to send a request to the Edge Function'), {
        name: 'FunctionsFetchError',
      }),
    });

    const { createQuizFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createQuizFromDocs({
        documentIds: ['doc-1'],
        questionCount: 10,
      }),
    ).rejects.toMatchObject({
      code: 'TUTOR_QUIZ_SERVICE_UNAVAILABLE',
      message: 'Failed to send a request to the Edge Function',
    });
    expect(invokeMock).toHaveBeenCalledWith(
      'viewer-ai-quiz-from-docs',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer session-token-123',
        },
      }),
    );
  });

  it('surfaces backend quiz errors from function responses', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    invokeMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        name: 'FunctionsHttpError',
        context: new Response(JSON.stringify({ error: 'The selected documents are too long. Remove some and try again.' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    });

    const { createQuizFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createQuizFromDocs({
        documentIds: ['doc-1'],
        questionCount: 10,
      }),
    ).rejects.toThrow('The selected documents are too long. Remove some and try again.');
  });

  it('creates a docs-based mind map and validates the response shape', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    invokeMock.mockResolvedValueOnce({
      data: {
        title: 'Physics review',
        root: {
          id: 'root-1',
          label: 'Physics review',
          children: [{ id: 'child-1', label: 'Motion' }],
        },
      },
      error: null,
    });

    const { createMindMapFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');
    const result = await createMindMapFromDocs({
      documentIds: ['doc-1'],
      prompt: 'Focus on cause and effect.',
    });

    expect(result.title).toBe('Physics review');
    expect(result.root.children?.[0]?.label).toBe('Motion');
    expect(invokeMock).toHaveBeenCalledWith(
      'viewer-ai-mindmap-from-docs',
      expect.objectContaining({
        body: {
          documentIds: ['doc-1'],
          prompt: 'Focus on cause and effect.',
        },
      }),
    );
  });

  it('maps transport failures to a mind map service unavailable error', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: Object.assign(new Error('Failed to send a request to the Edge Function'), {
        name: 'FunctionsFetchError',
      }),
    });

    const { createMindMapFromDocs } = await import('@/shared/api/viewer/tutorDocumentsApi');

    await expect(
      createMindMapFromDocs({
        documentIds: ['doc-1'],
      }),
    ).rejects.toMatchObject({
      code: 'TUTOR_MINDMAP_SERVICE_UNAVAILABLE',
      message: 'Failed to send a request to the Edge Function',
    });
  });
});
