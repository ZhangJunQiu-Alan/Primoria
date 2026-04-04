import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('CommunityPage', () => {
  it('persists messages and notes through the fixture workspace', async () => {
    const user = userEvent.setup();
    const firstRender = renderRoute('/community', 'user');

    expect(await screen.findByText(/^社区$/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /messages/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /messages/i }, { timeout: 10000 }));
    await user.type(await screen.findByPlaceholderText(/发送一条消息/i), 'Persisted workspace message');
    await user.click(await screen.findByRole('button', { name: /^发送$/i }));

    expect(await screen.findAllByText(/persisted workspace message/i)).toHaveLength(2);

    await user.click(await screen.findByRole('button', { name: /notes/i }));
    await user.click(await screen.findByRole('button', { name: /添加笔记/i }));
    const noteTitles = await screen.findAllByDisplayValue(/未命名笔记/i);
    await user.clear(noteTitles[0]!);
    await user.type(noteTitles[0]!, 'Persisted note');
    await user.click(await screen.findAllByRole('button', { name: /保存笔记/i }).then((buttons) => buttons[0]!));

    firstRender.unmount();
    renderRoute('/community', 'user');
    await user.click(await screen.findByRole('button', { name: /messages/i }, { timeout: 10000 }));
    expect(await screen.findAllByText(/persisted workspace message/i)).toHaveLength(2);
    await user.click(await screen.findByRole('button', { name: /notes/i }, { timeout: 10000 }));
    expect(await screen.findByDisplayValue(/persisted note/i)).toBeInTheDocument();
  });
});
