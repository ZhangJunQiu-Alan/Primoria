import { createInteractiveVisual } from '@/shared/api/viewer/interactiveVisualApi';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/shared/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
  viewerSupabaseUrl: 'https://demo-project.supabase.co',
  viewerSupabaseAnonKey: 'demo-anon-key',
}));

vi.mock('@/shared/api/viewer/core', () => ({
  usesViewerFixtures: () => false,
}));

describe('createInteractiveVisual', () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'demo-access-token' } },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    getSessionMock.mockReset();
  });

  it('maps a missing deployed function to a readable authoring error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Requested function was not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      createInteractiveVisual({
        prompt: 'Create an interactive visual for linear functions.',
        allowFallback: false,
      }),
    ).rejects.toThrow('Interactive visual generation function is not deployed.');
  });

  it('asks authors to sign in before calling the generation function', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      createInteractiveVisual({
        prompt: 'Create an interactive visual for linear functions.',
        allowFallback: false,
      }),
    ).rejects.toThrow('Please sign in before generating an interactive visual.');
    const edgeFunctionCalls = fetchMock.mock.calls.filter(([url]) => !String(url).startsWith('/__dev/'));
    expect(edgeFunctionCalls).toHaveLength(0);
  });

  it('stores a complete HTML document returned by the generation function', async () => {
    const generatedHtml = '<!doctype html><html><body><svg xmlns="http://www.w3.org/2000/svg"></svg><script></script></body></html>';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          job: {
            id: '11111111-1111-4111-8111-111111111111',
            status: 'succeeded',
            prompt: 'Create an interactive visual for linear functions.',
            requestPayload: {},
            attemptCount: 1,
            errorHistory: [],
            resultArtifact: {
              version: '1',
              engine: 'gemini-html5',
              template: 'linear-function-graph',
              title: 'Linear Function Visual',
              description: 'Move the sliders.',
              generatedHtml,
              experienceMode: 'graph',
            },
          },
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      createInteractiveVisual({
        prompt: 'Create an interactive visual for linear functions.',
        language: 'en',
        allowFallback: false,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        engine: 'gemini-html5',
        template: 'linear-function-graph',
        generatedHtml,
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      action: 'create',
      prompt: 'Create an interactive visual for linear functions.',
      language: 'en',
    });
  });

  it('surfaces failed async job errors without falling back when disabled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          job: {
            id: '22222222-2222-4222-8222-222222222222',
            status: 'failed',
            prompt: 'Create an interactive visual for linear functions.',
            requestPayload: {},
            attemptCount: 5,
            errorHistory: [{ kind: 'transient', message: 'Gemini returned HTTP 503.' }],
            lastError: 'Gemini returned HTTP 503.',
          },
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      createInteractiveVisual({
        prompt: 'Create an interactive visual for linear functions.',
        allowFallback: false,
      }),
    ).rejects.toThrow('Gemini returned HTTP 503.');
  });
});
