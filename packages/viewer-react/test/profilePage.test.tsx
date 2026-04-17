import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('ProfilePage', () => {
  it('renders the botanical profile hub and opens the profile menu', async () => {
    const user = userEvent.setup();
    const { locationRef } = renderRoute('/profile', 'user');

    expect(await screen.findByRole('heading', { name: /^Demo Learner$/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /学习热力图/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查看全部/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /打开个人菜单/i }));
    await user.click(screen.getByRole('button', { name: /^设置$/i }));

    expect(locationRef.pathname).toBe('/settings');
    expect(await screen.findByRole('heading', { name: /账号设置/i }, { timeout: 10000 })).toBeInTheDocument();
  });
});
