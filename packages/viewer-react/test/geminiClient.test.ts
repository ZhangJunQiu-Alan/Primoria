vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'demo-access-token' } },
        error: null,
      })),
    },
  },
}));

describe('geminiClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    window.localStorage.clear();
    document.documentElement.lang = '';
  });

  it('calls the edge function when fixture mode is explicitly disabled in tests', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');
    window.localStorage.setItem(
      'primoria.viewer.preferences',
      JSON.stringify({ language: 'zh-CN', aiTutorPersona: 'socratic' }),
    );

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reply: 'Edge reply' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { generateTutorReply } = await import('@/shared/api/geminiClient');
    const reply = await generateTutorReply([{ role: 'user', text: 'Hello' }]);

    expect(reply).toBe('Edge reply');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://demo-project.functions.supabase.co/viewer-ai-tutor',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'demo-anon-key',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      persona: 'socratic',
    });
  });

  it('surfaces API error payloads from the edge function', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Tutor quota exceeded.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { generateTutorReply } = await import('@/shared/api/geminiClient');

    await expect(generateTutorReply([{ role: 'user', text: 'Hello' }])).rejects.toThrow('Tutor quota exceeded.');
  });

  it('parses tutor edge responses wrapped in prose and fenced JSON', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Here is the JSON you asked for:\n```json\n{"reply":"Edge reply"}\n```\n', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { generateTutorReply } = await import('@/shared/api/geminiClient');
    const reply = await generateTutorReply([{ role: 'user', text: 'Hello' }]);

    expect(reply).toBe('Edge reply');
  });

  it('retries the edge function once after a transient service unavailable response', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Temporary outage.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reply: 'Recovered edge reply' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { generateTutorReply } = await import('@/shared/api/geminiClient');
    const reply = await generateTutorReply([{ role: 'user', text: 'Hello' }]);

    expect(reply).toBe('Recovered edge reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('streams tutor replies from the agent service', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    window.localStorage.setItem(
      'primoria.viewer.preferences',
      JSON.stringify({ language: 'zh-CN', aiTutorPersona: 'coach' }),
    );

    const streamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            [
              'event: run_started\n',
              'data: {"thread_id":"thread-1"}\n\n',
              'event: token\n',
              'data: {"text":"Hello "}\n\n',
              'event: token\n',
              'data: {"text":"world"}\n\n',
              'event: final\n',
              'data: {"thread_id":"thread-1","reply":"Hello world","used_tools":["recall_user_memories"]}\n\n',
            ].join(''),
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(streamBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');
    const seenTokens: string[] = [];
    const result = await generateTutorReplyStream([{ role: 'user', text: 'Hello' }], {
      onToken(token) {
        seenTokens.push(token);
      },
    });

    expect(result.reply).toBe('Hello world');
    expect(result.threadId).toBe('thread-1');
    expect(result.usedTools).toEqual(['recall_user_memories']);
    expect(seenTokens).toEqual(['Hello ', 'world']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/v1/chat/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer demo-access-token',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      context: expect.objectContaining({
        surface: 'ai-tutor',
        locale: 'zh-CN',
        ai_tutor_persona: 'coach',
      }),
    });
  });

  it('falls back from the ai-tutor agent stream to the edge function when the agent is unavailable', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Agent unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reply: 'Edge fallback reply' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');
    const result = await generateTutorReplyStream([{ role: 'user', text: 'Hello' }]);

    expect(result.reply).toBe('Edge fallback reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8787/v1/chat/stream');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://demo-project.functions.supabase.co/viewer-ai-tutor');
  });

  it('falls back from the lesson agent stream to the edge function with strict page context', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');
    document.documentElement.lang = 'en';

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Agent unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reply: 'Grounded edge reply' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');
    const result = await generateTutorReplyStream(
      [{ role: 'user', text: 'Explain this page.' }],
      {},
      {
        model: 'gemini-2.5-flash',
        allowModelFallback: false,
        context: {
          surface: 'lesson-runtime',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          blockId: 'mc-1',
          locale: 'en-US',
          lessonTitle: 'Lesson A',
          pageIndex: 1,
          pageCount: 2,
          pageTitle: 'Page 1',
          pageContent: 'Visible content',
          learnerState: 'Question 1: answered incorrectly',
        },
      },
    );

    expect(result.reply).toBe('Grounded edge reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8787/v1/chat/stream');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      context: {
        surface: 'lesson-runtime',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        block_id: 'mc-1',
        locale: 'en-US',
        lesson_title: 'Lesson A',
        page_index: 1,
        page_count: 2,
        page_title: 'Page 1',
        page_content: 'Visible content',
        learner_state: 'Question 1: answered incorrectly',
      },
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://demo-project.functions.supabase.co/viewer-ai-tutor');
  });

  it('can force lesson ask-ai requests to bypass the agent and hit Gemini with explicit model context', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reply: 'Grounded answer' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');
    const result = await generateTutorReplyStream(
      [{ role: 'user', text: 'Explain this page.' }],
      {},
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        allowModelFallback: false,
        context: {
          surface: 'lesson-runtime',
          lessonTitle: 'Lesson A',
          pageIndex: 1,
          pageCount: 2,
          pageTitle: 'Page 1',
          pageContent: 'Visible content',
          learnerState: 'Question 1: answered incorrectly',
        },
      },
    );

    expect(result.reply).toBe('Grounded answer');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://demo-project.functions.supabase.co/viewer-ai-tutor',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'demo-anon-key',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      model: 'gemini-2.5-flash',
      allowModelFallback: false,
      context: {
        surface: 'lesson-runtime',
        lessonTitle: 'Lesson A',
        pageIndex: 1,
        pageCount: 2,
        pageTitle: 'Page 1',
        pageContent: 'Visible content',
        learnerState: 'Question 1: answered incorrectly',
      },
    });
  });

  it('normalizes lesson transport failures into a localized unavailable message', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');
    document.documentElement.lang = 'zh-CN';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');

    await expect(
      generateTutorReplyStream(
        [{ role: 'user', text: 'Explain this page.' }],
        {},
        {
          provider: 'gemini',
          context: {
            surface: 'lesson-runtime',
            lessonId: 'lesson-1',
            lessonTitle: 'Lesson A',
            pageIndex: 1,
            pageCount: 1,
          },
        },
      ),
    ).rejects.toThrow('AI 暂时不可用，请稍后再试。');
  });

  it('falls back to the built-in trigonometry visual reply when the visual service is unavailable', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');
    document.documentElement.lang = 'en';

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'name resolution failed' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { generateTutorReplyStream } = await import('@/shared/api/geminiClient');
    const result = await generateTutorReplyStream([
      { role: 'user', text: 'Give me an interactive graph visual explaining cosine and sin value' },
    ]);

    expect(result.reply).toContain('```primoria-interactive-visual');
    expect(result.reply).toContain('Drag the angle slider');
    expect(result.usedTools).toEqual(['interactive_visual_local']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://demo-project.functions.supabase.co/viewer-ai-interactive-visual',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'demo-anon-key',
          Authorization: 'Bearer demo-access-token',
        }),
      }),
    );
  });
});
