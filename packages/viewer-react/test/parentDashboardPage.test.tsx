import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('ParentDashboardPage', () => {
  it('switches child reports and handles binding actions', async () => {
    const user = userEvent.setup();
    renderRoute('/parent', 'parent');

    expect(await screen.findByText(/parent dashboard/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/bind child with code/i, {}, { timeout: 10000 })).toBeInTheDocument();

    await user.type(await screen.findByPlaceholderText(/bind child with code/i, {}, { timeout: 10000 }), 'DEMO-2419');
    await user.click(await screen.findByRole('button', { name: /bind child with code/i }, { timeout: 10000 }));
    expect(await screen.findByText(/child bound/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /noah/i }, { timeout: 10000 }));
    expect(await screen.findAllByText(/^520$/i)).not.toHaveLength(0);

    await user.click(await screen.findByRole('button', { name: /unbind/i }, { timeout: 10000 }));
    expect(await screen.findByText(/child unbound/i)).toBeInTheDocument();
  });
});
