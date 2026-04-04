describe('geminiClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('calls the edge function when fixture mode is explicitly disabled in tests', async () => {
    vi.stubEnv('VITE_VIEWER_TEST_FIXTURES', '0');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');

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
});
