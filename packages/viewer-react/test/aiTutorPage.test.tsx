import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { renderRoute } from './renderApp';

vi.mock('@/shared/api/geminiClient', () => ({
  bootstrapGeminiKey: vi.fn(async () => 'demo-key'),
  persistGeminiKey: vi.fn(async () => undefined),
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
  generatePresentation: vi.fn(async () => ({
    title: 'Presentation',
    slides: [{ title: 'Slide 1', bullet: 'Overview' }],
  })),
}));

describe('AiTutorPage', () => {
  it('stores runtime API keys and opens generated tools', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    expect(await screen.findByRole('heading', { name: /你好，我们慢慢把这件事理顺/i }, { timeout: 15000 })).toBeInTheDocument();

    await user.type(await screen.findByPlaceholderText(/开始输入/i, {}, { timeout: 15000 }), '/apikey demo-key');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }, { timeout: 15000 }));

    expect(await screen.findByText(/Gemini key 已保存在本地/i, {}, { timeout: 15000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /打开思维导图/i }, { timeout: 15000 }));

    expect(await screen.findByRole('heading', { name: /mind map/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText(/learner shell/i)).toBeInTheDocument();
  }, 30000);

  it('renders streamed tutor text progressively', async () => {
    const user = userEvent.setup();
    renderRoute('/ai-tutor', 'user');

    await user.type(await screen.findByPlaceholderText(/开始输入/i, {}, { timeout: 15000 }), '帮我总结一下');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }, { timeout: 15000 }));

    expect(await screen.findByText(/mock tutor reply/i, {}, { timeout: 15000 })).toBeInTheDocument();
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
    expect(await screen.findByText(/推进模式/i, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /按 20 分钟给我一个可以执行的学习冲刺计划/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);

  it('auto-opens a companion-triggered quiz intent once on arrival', async () => {
    renderRoute(
      '/ai-tutor?source=home-companion&intent=quiz&courseId=course-physics&courseTitle=%E8%BF%90%E5%8A%A8%E4%B8%8E%E5%8A%9B%E5%AD%A6%E8%A7%82%E5%AF%9F',
      'user',
    );

    expect(await screen.findByRole('heading', { name: /quiz/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText(/what powers the viewer/i, {}, { timeout: 15000 })).toBeInTheDocument();
  }, 30000);
});
