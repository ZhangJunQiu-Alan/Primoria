import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('ParentDashboardPage', () => {
  it('switches child reports and handles binding actions', async () => {
    const user = userEvent.setup();
    renderRoute('/parent', 'parent');

    expect(await screen.findByRole('heading', { name: /家长看板/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/输入孩子绑定码/i, {}, { timeout: 10000 })).toBeInTheDocument();

    await user.type(await screen.findByPlaceholderText(/输入孩子绑定码/i, {}, { timeout: 10000 }), 'DEMO-2419');
    await user.click(await screen.findByRole('button', { name: /使用绑定码关联孩子/i }, { timeout: 10000 }));
    expect(await screen.findByText(/已绑定孩子/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /noah/i }, { timeout: 10000 }));
    expect(await screen.findAllByText(/^520$/i)).not.toHaveLength(0);

    await user.click(await screen.findByRole('button', { name: /解除关联/i }, { timeout: 10000 }));
    expect(await screen.findByText(/已解除孩子绑定/i)).toBeInTheDocument();
  });
});
