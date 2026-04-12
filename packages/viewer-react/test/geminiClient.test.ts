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

  it('calls the agent service for non-stream tutor replies', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');
    window.localStorage.setItem(
      'primoria.viewer.preferences',
      JSON.stringify({ language: 'zh-CN', aiTutorPersona: 'socratic' }),
    );

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ thread: { id: 'thread-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ thread_id: 'thread-1', reply: 'Agent reply', used_tools: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { generateTutorReply } = await import('@/shared/api/geminiClient');
    const reply = await generateTutorReply([{ role: 'user', text: 'Hello' }]);

    expect(reply).toBe('Agent reply');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8787/v1/threads',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer demo-access-token',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      context: expect.objectContaining({
        ai_tutor_persona: 'socratic',
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8787/v1/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      thread_id: 'thread-1',
    });
  });

  it('surfaces API error payloads from the agent service', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_AGENT_SERVICE_URL', 'http://localhost:8787');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ thread: { id: 'thread-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Tutor quota exceeded.' }), {
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

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ thread: { id: 'thread-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8787/v1/threads',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8787/v1/chat/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer demo-access-token',
        }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      context: expect.objectContaining({
        ai_tutor_persona: 'coach',
      }),
    });
  });
});
