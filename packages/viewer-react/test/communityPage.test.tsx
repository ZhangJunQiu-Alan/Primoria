import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('CommunityPage', () => {
  it('persists messages and notes through the fixture workspace', async () => {
    const user = userEvent.setup();
    const firstRender = renderRoute('/community', 'user');

    expect(await screen.findByText(/^社区$/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /消息|messages/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /消息|messages/i }, { timeout: 10000 }));
    await user.type(await screen.findByPlaceholderText(/发送一条消息/i), 'Persisted workspace message');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }));

    expect(await screen.findAllByText(/persisted workspace message/i)).toHaveLength(2);

    await user.click(await screen.findByRole('button', { name: /笔记|notes/i }));
    await user.click(await screen.findByRole('button', { name: /添加笔记/i }));
    const noteTitles = await screen.findAllByDisplayValue(/未命名笔记/i);
    await user.clear(noteTitles[0]!);
    await user.type(noteTitles[0]!, 'Persisted note');
    await user.keyboard('{Meta>}s{/Meta}');
    await screen.findByDisplayValue(/persisted note/i);

    firstRender.unmount();
    renderRoute('/community', 'user');
    await user.click(await screen.findByRole('button', { name: /消息|messages/i }, { timeout: 10000 }));
    expect(await screen.findAllByText(/persisted workspace message/i)).toHaveLength(2);
    await user.click(await screen.findByRole('button', { name: /笔记|notes/i }, { timeout: 10000 }));
    expect(await screen.findByDisplayValue(/persisted note/i)).toBeInTheDocument();
  }, 30000);

  it('opens note context from the home companion query parameters', async () => {
    const user = userEvent.setup();
    renderRoute('/community?source=home-companion&section=notes&topic=%E8%BF%90%E5%8A%A8%E4%B8%8E%E5%8A%9B%E5%AD%A6%E8%A7%82%E5%AF%9F', 'user');

    expect(await screen.findByTestId('community-companion-context')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /新建《运动与力学观察》笔记/i }));

    expect(await screen.findByDisplayValue(/运动与力学观察 笔记/i)).toBeInTheDocument();
  });

  it('publishes lesson notes to community notes and keeps the lesson link after community edits', async () => {
    const user = userEvent.setup();

    const lessonRender = renderRoute('/lesson/lesson-demo-1', 'user');
    const noteButton = await screen.findByRole('button', { name: /添加笔记|Add note/i }, { timeout: 10000 });
    await waitFor(() => expect(noteButton).toBeEnabled());
    await user.click(noteButton);
    await user.type(await screen.findByTestId('lesson-note-textarea'), 'Lesson note body');
    await user.click(screen.getByTestId('lesson-note-backdrop'));
    lessonRender.unmount();

    const communityRender = renderRoute('/community?section=notes', 'user');
    expect(await screen.findByDisplayValue(/Foundations/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/Lesson note body/i)).toBeInTheDocument();

    const lessonTitleInput = screen.getByDisplayValue(/Foundations/i);
    await user.clear(lessonTitleInput);
    await user.type(lessonTitleInput, 'Renamed note');
    await user.keyboard('{Meta>}s{/Meta}');
    await screen.findByDisplayValue(/Renamed note/i);
    communityRender.unmount();

    const secondLessonRender = renderRoute('/lesson/lesson-demo-1', 'user');
    const reopenedNoteButton = await screen.findByRole('button', { name: /添加笔记|Add note/i }, { timeout: 10000 });
    await waitFor(() => expect(reopenedNoteButton).toBeEnabled());
    await user.click(reopenedNoteButton);
    const reopenedTextarea = await screen.findByDisplayValue('Lesson note body');
    await user.type(reopenedTextarea, ' updated');
    await user.click(screen.getByTestId('lesson-note-backdrop'));
    secondLessonRender.unmount();

    renderRoute('/community?section=notes', 'user');
    expect(await screen.findByDisplayValue('Renamed note')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Lesson note body updated')).toBeInTheDocument();
  }, 30000);
});
