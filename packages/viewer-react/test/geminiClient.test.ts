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
        ai_tutor_persona: 'coach',
      }),
    });
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
});
