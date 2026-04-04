import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonRuntimePlayer } from '@/shared/lesson/LessonRuntimePlayer';
import { createDemoLessonRuntime } from '@/shared/data/demoViewerData';

describe('LessonRuntimePlayer', () => {
  it('reveals gated content after a correct check and navigates between pages', async () => {
    const user = userEvent.setup();
    const runtime = createDemoLessonRuntime('lesson-demo-1');
    if (!runtime) {
      throw new Error('Demo lesson missing');
    }

    render(<LessonRuntimePlayer data={runtime} onExit={() => {}} onComplete={() => {}} />);

    expect(screen.queryByText(/the gated block is now visible/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/react \+ typescript \+ vite/i));
    await user.click(screen.getByRole('button', { name: /check/i }));

    expect(await screen.findByText(/the gated block is now visible/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(await screen.findByText(/which features belong to the learner shell/i)).toBeInTheDocument();
  });
});

