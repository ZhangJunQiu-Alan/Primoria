import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LegacyMindMapNode, MindMapSummary, TutorDocument } from '@/shared/api/viewer/types';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { renderRoute } from './renderApp';

let mockDocuments: TutorDocument[] = [];
let mockMindMaps: MindMapSummary[] = [];

const fixtureMindMapRoot: LegacyMindMapNode = {
  id: 'root-1',
  label: 'Physics review',
  children: [
    {
      id: 'branch-1',
      label: 'Motion',
      children: [
        { id: 'leaf-1', label: 'Velocity' },
        { id: 'leaf-2', label: 'Acceleration' },
      ],
    },
    {
      id: 'branch-2',
      label: 'Forces',
      children: [{ id: 'leaf-3', label: 'Net force' }],
    },
  ],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const fetchTutorDocumentsMock = vi.fn(async () => [...mockDocuments]);
const createTutorDocumentMock = vi.fn(async (payload: { filename: string; mimeType: string; extractedText: string }) => {
  const nextDocument: TutorDocument = {
    id: `doc-${mockDocuments.length + 1}`,
    filename: payload.filename,
    display_title: null,
    mime_type: payload.mimeType,
    extracted_chars: payload.extractedText.length,
    created_at: new Date(2026, 3, mockDocuments.length + 1).toISOString(),
    updated_at: new Date(2026, 3, mockDocuments.length + 1).toISOString(),
  };
  mockDocuments = [nextDocument, ...mockDocuments];
  return nextDocument;
});
const deleteTutorDocumentMock = vi.fn(async (documentId: string) => {
  mockDocuments = mockDocuments.filter((document) => document.id !== documentId);
});
const updateTutorDocumentTitleMock = vi.fn(async (documentId: string, displayTitle: string) => {
  const normalizedTitle = displayTitle.trim() || null;
  mockDocuments = mockDocuments.map((document) =>
    document.id === documentId
      ? {
          ...document,
          display_title: normalizedTitle,
          updated_at: new Date(2026, 3, 28).toISOString(),
        }
      : document,
  );
  return mockDocuments.find((document) => document.id === documentId)!;
});
const createQuizFromDocsMock = vi.fn(async () => ({
  courseId: 'course-quiz-1',
  courseTitle: '文档测验课程',
}));
const listMindMapsMock = vi.fn(async () => [...mockMindMaps]);
const createMindMapFromDocsMock = vi.fn(async () => {
  const nextMindMap: MindMapSummary = {
    id: `mindmap-${mockMindMaps.length + 1}`,
    title: 'Document mind map',
    sourceDocumentIds: ['doc-1'],
    nodeCount: 5,
    createdAt: new Date(2026, 3, mockMindMaps.length + 1).toISOString(),
    updatedAt: new Date(2026, 3, mockMindMaps.length + 1).toISOString(),
  };
  mockMindMaps = [nextMindMap, ...mockMindMaps];

  return {
    title: 'Document mind map',
    mindMapId: nextMindMap.id,
    root: fixtureMindMapRoot,
  };
});
const extractTutorDocumentTextMock = vi.fn(async (file: File) => {
  if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
    throw new Error('PPT/PPTX 暂不支持直接解析，请先导出为 PDF 再上传。');
  }
  if (file.name.endsWith('.doc')) {
    throw new Error('DOC 暂不支持直接解析，请另存为 DOCX 或 PDF 后再上传。');
  }

  return {
    text: `Extracted text from ${file.name}`,
    mimeType:
      file.type ||
      (file.name.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    kind: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
  } as const;
});

vi.mock('@/shared/api/geminiClient', () => ({
  bootstrapGeminiKey: vi.fn(async () => 'demo-key'),
  persistGeminiKey: vi.fn(async () => undefined),
  generateTutorReply: vi.fn(async () => '学习报告第一段。\n\n下一步建议。'),
  generateTutorReplyStream: vi.fn(async (_history, handlers) => {
    handlers?.onToken?.('Mock tutor reply');
    const payload = { threadId: 'thread-1', reply: 'Mock tutor reply', usedTools: [] };
    handlers?.onFinal?.(payload);
    return payload;
  }),
  generateMindMap: vi.fn(async () => ({
    title: 'Mind map',
    nodes: [
      { id: 'node-1', label: 'Learner shell' },
      { id: 'node-2', label: 'Lesson runtime' },
    ],
  })),
  generateQuiz: vi.fn(async () => ({
    title: 'Quiz',
    questions: [
      {
        prompt: 'What powers the viewer?',
        options: ['React', 'Flutter'],
        answerIndex: 0,
      },
    ],
  })),
}));

vi.mock('@/shared/api/viewer/tutorDocumentsApi', () => ({
  TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE: 'TUTOR_DISPLAY_TITLE_UNAVAILABLE',
  fetchTutorDocuments: fetchTutorDocumentsMock,
  createTutorDocument: createTutorDocumentMock,
  deleteTutorDocument: deleteTutorDocumentMock,
  updateTutorDocumentTitle: updateTutorDocumentTitleMock,
  listMindMaps: listMindMapsMock,
  createMindMapFromDocs: createMindMapFromDocsMock,
  createQuizFromDocs: createQuizFromDocsMock,
}));

vi.mock('@/features/ai-tutor/documentExtraction', () => ({
  extractTutorDocumentText: extractTutorDocumentTextMock,
}));

describe('AiTutorPage', () => {
  beforeEach(() => {
    mockDocuments = [];
    mockMindMaps = [];
    fetchTutorDocumentsMock.mockClear();
    createTutorDocumentMock.mockClear();
    deleteTutorDocumentMock.mockClear();
    updateTutorDocumentTitleMock.mockClear();
    listMindMapsMock.mockClear();
    createQuizFromDocsMock.mockClear();
    createMindMapFromDocsMock.mockClear();
    extractTutorDocumentTextMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the simplified welcome state visible before the first message', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByRole('heading', { name: /你好，我们慢慢把这件事理顺/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.queryByText(/温柔引导/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/我会先帮你把目标收小、把压力降下来/i)).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /我现在有点不知道从哪开始，可以先带我起步吗/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /折叠工作台/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /生成报告/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /生成演示/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /展开资料/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /展开笔记本/i })).toBeInTheDocument();
    expect(screen.queryByText(/还没有上传资料/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/还没有生成内容/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开资料/i }));
    expect(await screen.findByText(/还没有上传资料/i, {}, { timeout: 15000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开笔记本/i }));
    expect(await screen.findByText(/还没有生成内容/i, {}, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);

  it('uploads pdf and docx materials, then keeps them selected by default', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, [
      new File(['physics'], 'motion.pdf', { type: 'application/pdf' }),
      new File(['notes'], 'chapter.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ]);

    await user.click(screen.getByRole('button', { name: /展开资料/i }));

    expect(await screen.findByText('motion.pdf', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText('chapter.docx')).toBeInTheDocument();
    expect(createTutorDocumentMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox').every((input) => (input as HTMLInputElement).checked)).toBe(true);
  }, 30000);

  it('lets learners edit the display title of a material without renaming the file', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, new File(['physics'], 'motion.pdf', { type: 'application/pdf' }));

    await user.click(screen.getByRole('button', { name: /展开资料/i }));
    expect(await screen.findByText('motion.pdf', {}, { timeout: 15000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /编辑资料标题 motion\.pdf/i }));
    const titleInput = screen.getByRole('textbox', { name: /编辑资料标题 motion\.pdf/i });
    await user.type(titleInput, 'Week 2 summary');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(updateTutorDocumentTitleMock).toHaveBeenCalledWith('doc-1', 'Week 2 summary');
    });
    expect(await screen.findByText('Week 2 summary', {}, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);

  it('shows a clear error for ppt uploads without creating a material record', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, new File(['slides'], 'deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }));

    expect(await screen.findByText(/PPT\/PPTX 暂不支持直接解析/i, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(createTutorDocumentMock).not.toHaveBeenCalled();
  }, 30000);

  it('shows a deployment hint when the tutor documents backend is unavailable and still allows navigation away', async () => {
    const user = userEvent.setup();
    fetchTutorDocumentsMock.mockRejectedValueOnce({
      code: 'PGRST205',
      status: 404,
      message: "Could not find the table 'public.tutor_documents' in the schema cache",
    });

    const view = renderRoute('/ai-tutor', 'user');

    expect(
      await screen.findByText(/资料功能后端尚未部署到当前项目/i, {}, { timeout: 15000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /上传资料/i })).toBeDisabled();

    await user.click(screen.getByRole('link', { name: /首页/i }));

    expect(await screen.findByTestId('home-current-course-card', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(view.locationRef.pathname).toBe('/home');
  }, 30000);

  it('closes the config dialog, expands the notebook, and keeps quiz progress visible until the course is ready', async () => {
    const user = userEvent.setup();
    const view = renderRoute('/ai-tutor', 'user');
    const deferredQuiz = createDeferred<{ courseId: string; courseTitle: string }>();
    createQuizFromDocsMock.mockImplementationOnce(() => deferredQuiz.promise);

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, [
      new File(['chapter 1'], 'chapter-1.pdf', { type: 'application/pdf' }),
      new File(['chapter 2'], 'chapter-2.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ]);

    await user.click(screen.getByRole('button', { name: /展开资料/i }));

    expect(await screen.findByText('chapter-1.pdf', {}, { timeout: 15000 })).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);

    await user.click(await screen.findByRole('button', { name: /配置并创建测验课程/i }, { timeout: 15000 }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect(within(dialog).getByRole('heading', { name: /生成测验课程/i })).toBeInTheDocument();

    const questionInput = within(dialog).getByLabelText(/题目数量/i);
    await user.clear(questionInput);
    await user.type(questionInput, '12');
    await user.click(within(dialog).getByRole('button', { name: /创建测验课程/i }));

    await waitFor(() => {
      const firstCall = createQuizFromDocsMock.mock.calls[0] as unknown as
        | [{ documentIds: string[]; questionCount: number }, ...unknown[]]
        | undefined;
      expect(firstCall?.[0]).toEqual({
        documentIds: ['doc-1'],
        questionCount: 12,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /折叠笔记本/i })).toBeInTheDocument();
    expect(screen.getByText(/正在生成测验课程/i)).toBeInTheDocument();
    expect(screen.getByText(/这可能需要一点时间/i)).toBeInTheDocument();
    expect(view.locationRef.pathname).toBe('/ai-tutor');

    deferredQuiz.resolve({
      courseId: 'course-quiz-1',
      courseTitle: '文档测验课程',
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /文档测验课程/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/文档测验课程/i)).toBeInTheDocument();
    expect(view.locationRef.pathname).toBe('/ai-tutor');

    await user.click(screen.getByRole('button', { name: /文档测验课程/i }));
    await waitFor(() => {
      expect(view.locationRef.pathname).toBe('/course/course-quiz-1');
    });
  }, 30000);

  it('shows a deployment hint when quiz generation cannot reach the edge function', async () => {
    const user = userEvent.setup();
    createQuizFromDocsMock.mockRejectedValueOnce(
      Object.assign(new Error('Failed to send a request to the Edge Function'), {
        code: 'TUTOR_QUIZ_SERVICE_UNAVAILABLE',
      }),
    );

    renderRoute('/ai-tutor', 'user');

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, new File(['chapter 1'], 'chapter-1.pdf', { type: 'application/pdf' }));

    await user.click(await screen.findByRole('button', { name: /配置并创建测验课程/i }, { timeout: 15000 }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    await user.click(within(dialog).getByRole('button', { name: /创建测验课程/i }));

    const errorCopies = await screen.findAllByText(/测验生成服务尚未部署到当前项目/i, {}, { timeout: 15000 });
    expect(errorCopies.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /折叠笔记本/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /重试生成/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);

  it('preserves backend quiz errors when the edge function returns a specific failure', async () => {
    const user = userEvent.setup();
    createQuizFromDocsMock.mockRejectedValueOnce(
      new Error('The selected documents are too long. Remove some and try again.'),
    );

    renderRoute('/ai-tutor', 'user');

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, new File(['chapter 1'], 'chapter-1.pdf', { type: 'application/pdf' }));

    await user.click(await screen.findByRole('button', { name: /配置并创建测验课程/i }, { timeout: 15000 }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    await user.click(within(dialog).getByRole('button', { name: /创建测验课程/i }));

    const errorCopies = await screen.findAllByText(
      /The selected documents are too long\. Remove some and try again\./i,
      {},
      { timeout: 15000 },
    );
    expect(errorCopies.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/测验生成服务尚未部署到当前项目/i)).not.toBeInTheDocument();
  }, 30000);

  it('opens a saved quiz artifact from the notebook as a course route', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'viewer:ai-tutor-session:v2',
      JSON.stringify({
        version: 2,
        messages: [{ role: 'model', text: '你好，我们慢慢把这件事理顺。' }],
        artifacts: [
          {
            updatedAt: 1,
            modal: {
              kind: 'quiz',
              payload: {
                courseId: 'course-quiz-1',
                courseTitle: '文档测验课程',
                questionCount: 12,
                sourceDocumentIds: ['doc-1'],
              },
            },
          },
        ],
        context: null,
      }),
    );

    const view = renderRoute('/ai-tutor', 'user');
    await user.click(await screen.findByRole('button', { name: /展开笔记本/i }, { timeout: 15000 }));
    const openCourseCard = await screen.findByRole('button', { name: /文档测验课程/i }, { timeout: 15000 });
    expect(screen.getByText(/文档测验课程/i)).toBeInTheDocument();

    await user.click(openCourseCard);
    await waitFor(() => {
      expect(view.locationRef.pathname).toBe('/course/course-quiz-1');
    });
  }, 30000);

  it('stores runtime API keys, keeps mind maps in the notebook, and opens them in a new tab', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByRole('heading', { name: /你好，我们慢慢把这件事理顺/i }, { timeout: 15000 })).toBeInTheDocument();

    await user.type(await screen.findByPlaceholderText(/开始输入/i, {}, { timeout: 15000 }), '/apikey demo-key');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }, { timeout: 15000 }));

    expect(await screen.findByText(/Gemini key 已保存在本地/i, {}, { timeout: 15000 })).toBeInTheDocument();

    const uploadInput = await screen.findByLabelText(/上传资料/i, {}, { timeout: 15000 });
    await user.upload(uploadInput, new File(['chapter 1'], 'chapter-1.pdf', { type: 'application/pdf' }));

    await user.click(await screen.findByRole('button', { name: /配置并生成思维导图/i }, { timeout: 15000 }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    const promptInput = within(dialog).getByLabelText(/附加 Prompt/i);
    await user.type(promptInput, '突出力与运动的因果关系');
    await user.click(within(dialog).getByRole('button', { name: /生成思维导图/i }));

    await waitFor(() => {
      expect(createMindMapFromDocsMock).toHaveBeenCalledWith(
        {
          documentIds: ['doc-1'],
          prompt: '突出力与运动的因果关系',
        },
        expect.anything(),
      );
    });

    expect(await screen.findByText(/思维导图已生成，点击笔记本卡片即可在新标签页打开/i, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /document mind map/i })).not.toBeInTheDocument();

    const expandNotebookButton = screen.queryByRole('button', { name: /展开笔记本/i });
    if (expandNotebookButton) {
      await user.click(expandNotebookButton);
    }
    await user.click(await screen.findByRole('button', { name: /document mind map/i }, { timeout: 15000 }));

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/ai-tutor/mindmap'),
      '_blank',
      'noopener,noreferrer',
    );
  }, 30000);

  it('renders the saved mind map on the standalone route', async () => {
    window.localStorage.setItem(
      'viewer:ai-tutor-session:v3',
      JSON.stringify({
        version: 3,
        messages: [{ role: 'model', text: '你好，我们慢慢把这件事理顺。' }],
        artifacts: [
          {
            updatedAt: 1,
            modal: {
              kind: 'mindmap',
              payload: {
                title: 'Document mind map',
                root: fixtureMindMapRoot,
                sourceDocumentIds: ['doc-1'],
                userPrompt: '突出力与运动的因果关系',
              },
            },
          },
        ],
        context: null,
      }),
    );

    renderRoute('/ai-tutor/mindmap', 'user');

    expect(await screen.findByRole('link', { name: /返回 AI 导师/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText(/physics review/i)).toBeInTheDocument();
    expect(screen.getByText(/motion/i)).toBeInTheDocument();
  }, 30000);

  it('renders streamed tutor text progressively', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    await user.type(await screen.findByPlaceholderText(/开始输入/i, {}, { timeout: 15000 }), '帮我总结一下');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }, { timeout: 15000 }));

    expect(await screen.findByText(/mock tutor reply/i, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /你好，我们慢慢把这件事理顺/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /我现在有点不知道从哪开始，可以先带我起步吗/i })).not.toBeInTheDocument();
  }, 30000);

  it('switches visible tutor persona copy from preferences', async () => {
    window.localStorage.setItem(
      VIEWER_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'zh-CN',
        aiTutorPersona: 'coach',
      }),
    );

    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByRole('heading', { name: /你好，今天我们直接推进主线/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /按 20 分钟给我一个可以执行的学习冲刺计划/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.queryByText(/我会直接帮你压缩目标、明确下一步、卡住节奏/i)).not.toBeInTheDocument();
  }, 30000);

  it('auto-opens a companion-triggered mind map intent once on arrival', async () => {
    renderRoute(
      '/ai-tutor?source=home-companion&intent=mindmap&courseId=course-physics&courseTitle=%E8%BF%90%E5%8A%A8%E4%B8%8E%E5%8A%9B%E5%AD%A6%E8%A7%82%E5%AF%9F',
      'user',
    );

    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect(within(dialog).getByRole('heading', { name: /生成思维导图/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /生成思维导图/i })).toBeDisabled();
    expect(within(dialog).getByText(/先上传并勾选资料后再生成思维导图/i)).toBeInTheDocument();
  }, 30000);

  it('does not hide the welcome state when the composer is only focused', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    const input = await screen.findByPlaceholderText(/开始输入/i, {}, { timeout: 15000 });
    await user.click(input);

    expect(screen.getByRole('heading', { name: /你好，我们慢慢把这件事理顺/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /我现在有点不知道从哪开始，可以先带我起步吗/i })).toBeInTheDocument();
  }, 30000);

  it('restores the recent conversation and saved artifacts after remount', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'viewer:ai-tutor-session:v2',
      JSON.stringify({
        version: 2,
        messages: [
          { role: 'model', text: '你好，我们慢慢把这件事理顺。' },
          { role: 'user', text: '帮我总结一下' },
          { role: 'model', text: 'Mock tutor reply' },
        ],
        artifacts: [
          {
            updatedAt: 1,
            modal: {
              kind: 'quiz',
              payload: {
                courseId: 'course-quiz-1',
                courseTitle: '文档测验课程',
                questionCount: 12,
                sourceDocumentIds: ['doc-1'],
              },
            },
          },
        ],
        context: null,
      }),
    );

    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByText(/mock tutor reply/i, {}, { timeout: 15000 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /展开笔记本/i }));
    expect(await screen.findByRole('button', { name: /文档测验课程/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);

  it('keeps workspace open by default and lets sidebar sections collapse independently', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByRole('button', { name: /折叠工作台/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /展开资料/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /展开笔记本/i })).toBeInTheDocument();
    expect(screen.queryByText(/还没有上传资料/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/还没有生成内容/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开资料/i }));
    expect(await screen.findByText(/还没有上传资料/i, {}, { timeout: 15000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /展开笔记本/i }));
    expect(await screen.findByText(/还没有生成内容/i, {}, { timeout: 15000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /折叠资料/i }));
    await waitFor(() => {
      expect(screen.queryByText(/还没有上传资料/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /折叠笔记本/i })).toBeInTheDocument();
  }, 30000);
});
