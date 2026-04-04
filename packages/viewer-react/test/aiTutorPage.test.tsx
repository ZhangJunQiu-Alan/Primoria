import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

vi.mock('@/shared/api/geminiClient', () => ({
  bootstrapGeminiKey: vi.fn(async () => 'demo-key'),
  persistGeminiKey: vi.fn(async () => undefined),
  generateTutorReply: vi.fn(async () => 'Mock tutor reply'),
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

    expect(await screen.findByRole('heading', { name: /你好，欢迎来到你的 AI 导师/i }, { timeout: 3000 })).toBeInTheDocument();

    await user.type(await screen.findByPlaceholderText(/开始输入/i), '/apikey demo-key');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }));

    expect(await screen.findByText(/gemini key stored locally/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /打开思维导图/i }));

    expect(await screen.findByRole('heading', { name: /mind map/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/learner shell/i)).toBeInTheDocument();
  });
});
