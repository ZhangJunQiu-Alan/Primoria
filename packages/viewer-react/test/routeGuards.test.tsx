import { screen } from '@testing-library/react';
import { renderRoute } from './renderApp';

describe('viewer route guards', () => {
  it('redirects unauthenticated users to login', async () => {
    renderRoute('/home');

    expect(await screen.findByRole('heading', { name: /欢迎回来/i }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('redirects parent users away from learner routes', async () => {
    renderRoute('/home', 'parent');

    expect(await screen.findByRole('heading', { name: /家长看板/i }, { timeout: 3000 })).toBeInTheDocument();
  });
});
