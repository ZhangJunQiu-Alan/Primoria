import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('AchievementWallPage', () => {
  it('persists pinned achievements into the profile hub', async () => {
    const user = userEvent.setup();
    const wall = renderRoute('/achievements', 'user');

    expect(await screen.findByRole('button', { name: /管理精选/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /管理精选/i }, { timeout: 10000 }));
    await user.click(await screen.findByRole('button', { name: /第一门课程/i }, { timeout: 10000 }));

    const featuredHeading = screen.getByRole('heading', { name: /精选展位/i });
    const featuredGrid = featuredHeading.parentElement?.parentElement?.nextElementSibling as HTMLElement | null;
    expect(featuredGrid).not.toBeNull();

    const pinnedCard = within(featuredGrid as HTMLElement).getByRole('button', { name: /第一门课程/i });
    expect(within(pinnedCard).getByText(/已精选/i)).toBeInTheDocument();

    wall.unmount();

    renderRoute('/profile', 'user');
    expect(await screen.findByText(/^第一门课程$/i)).toBeInTheDocument();
  });
});
