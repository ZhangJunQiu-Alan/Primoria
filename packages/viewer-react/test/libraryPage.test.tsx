import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from './renderApp';

describe('LibraryPage', () => {
  it('filters courses by subject and search query', async () => {
    const user = userEvent.setup();
    renderRoute('/library', 'user');

    expect(await screen.findByText(/课程库/i, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /physics/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /data science & ai/i }, { timeout: 10000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /physics/i }, { timeout: 10000 }));
    expect(await screen.findByText(/运动与力学观察/i)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /^全部$/i }, { timeout: 10000 }));
    const searchBox = await screen.findByRole('textbox', { name: /search/i });

    await user.type(searchBox, '数据与 AI');
    expect(await screen.findByText(/数据与 ai 入门/i)).toBeInTheDocument();

    await user.clear(searchBox);
    await user.type(searchBox, '不存在的测试课');
    expect(await screen.findByText(/没有匹配的课程/i)).toBeInTheDocument();
  });
});
