import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('SupportInfoPage', () => {
  it('renders support content and lets learners return to settings', async () => {
    const user = userEvent.setup();
    const { locationRef } = renderRoute('/support/help', 'user');

    expect(await screen.findByRole('heading', { name: /帮助中心/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText(/使用说明/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /返回设置/i }));

    expect(await screen.findByRole('heading', { name: /设置中心/i }, { timeout: 10000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(locationRef.pathname).toBe('/settings');
    });
  });
});
