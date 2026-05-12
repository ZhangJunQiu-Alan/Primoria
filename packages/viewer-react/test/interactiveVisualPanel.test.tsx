import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { InteractiveVisualPanel } from '@/features/editor/properties/panels/InteractiveVisualPanel';
import { createAppStore } from '@/shared/state/store';
import { openDraft } from '@/store/editorSlice';
import { SCHEMA_URL, SCHEMA_VERSION, type Block, type Course } from '@primoria/schema';

const { createInteractiveVisualMock } = vi.hoisted(() => ({
  createInteractiveVisualMock: vi.fn(),
}));

vi.mock('@/shared/api/viewer/interactiveVisualApi', () => ({
  createInteractiveVisual: (...args: unknown[]) => createInteractiveVisualMock(...args),
}));

function buildCourse(block: Block): Course {
  return {
    $schema: SCHEMA_URL,
    schema_version: SCHEMA_VERSION,
    course_id: 'course-visual-panel',
    metadata: { title: 'Visual panel course' },
    lessons: [
      {
        lesson_id: 'lesson-1',
        title: 'Lesson 1',
        pages: [
          {
            page_id: 'page-1',
            order: 0,
            blocks: [block],
          },
        ],
      },
    ],
  };
}

function getStoredBlock(store: ReturnType<typeof createAppStore>) {
  return store.getState().editor.draft?.lessons[0]?.pages[0]?.blocks[0];
}

describe('InteractiveVisualPanel', () => {
  beforeEach(() => {
    createInteractiveVisualMock.mockReset();
  });

  it('generates an HTML iframe visual from the author prompt and stores it on the block', async () => {
    const user = userEvent.setup();
    const block: Block = {
      id: 'visual-1',
      type: 'interactive-visual',
      position: { order: 0 },
      content: {
        engine: 'html-iframe',
        template: 'generic',
        title: '',
        description: '',
        aiPrompt: '',
      },
    };
    const store = createAppStore();
    store.dispatch(openDraft(buildCourse(block)));
    createInteractiveVisualMock.mockResolvedValue({
      version: '1',
      engine: 'gemini-html5',
      template: 'linear-function-graph',
      experienceMode: 'graph',
      title: '一次函数参数交互可视化',
      description: '拖动 a 和 b，观察直线斜率与截距变化。',
      aiPrompt: '生成一个一次函数 y=ax+b 的交互图。',
      generatedHtml: '<!doctype html><html><body><section id="linear-graph"><input type="range" /></section></body></html>',
      themeTone: 'minimal-math',
    });

    render(
      <Provider store={store}>
        <InteractiveVisualPanel block={block} lessonId="lesson-1" pageId="page-1" />
      </Provider>,
    );

    await user.type(
      screen.getByPlaceholderText('Describe what you want the visual to show...'),
      '生成一个一次函数 y=ax+b 的交互图。',
    );
    await user.click(screen.getByRole('button', { name: 'Generate with AI' }));

    await waitFor(() => expect(createInteractiveVisualMock).toHaveBeenCalledTimes(1));
    expect(createInteractiveVisualMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '生成一个一次函数 y=ax+b 的交互图。',
        template: 'generic',
        language: 'zh-CN',
        surface: 'builder',
        allowFallback: false,
      }),
    );

    await waitFor(() =>
      expect(getStoredBlock(store)?.content).toEqual(
        expect.objectContaining({
          engine: 'gemini-html5',
          template: 'linear-function-graph',
          title: '一次函数参数交互可视化',
          description: '拖动 a 和 b，观察直线斜率与截距变化。',
          aiPrompt: '生成一个一次函数 y=ax+b 的交互图。',
          generatedHtml: '<!doctype html><html><body><section id="linear-graph"><input type="range" /></section></body></html>',
          themeTone: 'minimal-math',
          experienceMode: 'graph',
        }),
      ),
    );
  });
});
