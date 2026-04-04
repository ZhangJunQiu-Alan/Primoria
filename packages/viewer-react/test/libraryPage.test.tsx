import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('LibraryPage', () => {
  it('filters courses by subject and search query', async () => {
    const user = userEvent.setup();
    renderRoute('/library', 'user');

    expect(await screen.findByText(/课程库/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /computer science/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /computer science/i }, { timeout: 10000 }));
    expect(await screen.findByText(/没有匹配的课程/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /^全部$/i }, { timeout: 10000 }));
    await user.type(await screen.findByRole('textbox', { name: /search/i }), 'React Viewer');
    expect(await screen.findByText(/react viewer foundations/i)).toBeInTheDocument();
  });
});
