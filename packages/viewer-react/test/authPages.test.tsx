import { screen } from '@testing-library/react';
import { renderRoute } from './renderApp';

describe('Public auth pages', () => {
  it('renders the register page with the email form open by default', async () => {
    renderRoute('/register');

    expect(await screen.findByRole('heading', { name: /创建你的学习账号/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /使用邮箱创建账号/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/昵称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱地址/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^密码$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /使用邮箱创建/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /回到首页/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^中文$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^English$/i })).not.toBeInTheDocument();
  });

  it('removes the auth page back-to-home entry and language switcher from login too', async () => {
    renderRoute('/login');

    expect(await screen.findByRole('heading', { name: /欢迎回来/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /回到首页/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^中文$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^English$/i })).not.toBeInTheDocument();
  });
});
