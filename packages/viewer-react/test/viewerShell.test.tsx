import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('viewer shell navigation', () => {
  it('switches top-level learner routes with real URLs', async () => {
    const user = userEvent.setup();
    const { renderRoute } = await import('./renderApp');
    const { locationRef } = renderRoute('/home', 'user');

    expect(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /课程库/i }));

    expect(await screen.findByRole('heading', { name: /全部课程/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(locationRef.pathname).toBe('/library');
  }, 30000);

  it('routes into Builder inside the same app', async () => {
    const user = userEvent.setup();
    const { renderRoute } = await import('./renderApp');
    const { locationRef } = renderRoute('/home', 'user');

    await user.click(await screen.findByRole('link', { name: /builder/i }));

    expect(locationRef.pathname).toBe('/builder/dashboard');
  }, 30000);

  it('returns to home from the ai tutor tab', async () => {
    const user = userEvent.setup();
    const { renderRoute } = await import('./renderApp');
    const { locationRef } = renderRoute('/ai-tutor', 'user');

    expect(
      await screen.findByRole('button', { name: /生成思维导图|Generate mind map/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /首页|Home/i }));

    expect(await screen.findByTestId('home-current-course-card', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(locationRef.pathname).toBe('/home');
  }, 30000);

  it('hides the global bottom dock inside lesson routes and shows the lesson action bar instead', async () => {
    const { renderRoute } = await import('./renderApp');
    renderRoute('/lesson/lesson-demo-1', 'user');

    expect(await screen.findByTestId('lesson-action-bar', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByTestId('viewer-bottom-dock')).not.toBeInTheDocument();
  }, 30000);
});
