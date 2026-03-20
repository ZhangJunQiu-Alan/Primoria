import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authFns = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: authFns,
  },
}));

import { LoginPage } from '../src/pages/auth/LoginPage';
import { RegisterPage } from '../src/pages/auth/RegisterPage';

function renderAuthRoutes(initialPath: '/login' | '/register') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Landing route</div>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div>Dashboard route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authFns.signInWithPassword.mockReset();
  authFns.signInWithOAuth.mockReset();
  authFns.resetPasswordForEmail.mockReset();
  authFns.signUp.mockReset();

  authFns.signInWithPassword.mockResolvedValue({ error: null });
  authFns.signInWithOAuth.mockResolvedValue({ error: null });
  authFns.resetPasswordForEmail.mockResolvedValue({ error: null });
  authFns.signUp.mockResolvedValue({ data: { session: null }, error: null });
});

describe('auth pages', () => {
  it('renders the login shell with Flutter-aligned actions', () => {
    renderAuthRoutes('/login');

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with wechat/i })).toBeInTheDocument();
    expect(screen.getByText(/drag-and-drop course editor/i)).toBeInTheDocument();
  });

  it('supports the forgot-password email flow', async () => {
    const user = userEvent.setup();
    renderAuthRoutes('/login');

    await user.click(screen.getByRole('button', { name: /continue with email/i }));
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/email address/i), 'author@primoria.dev');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(authFns.resetPasswordForEmail).toHaveBeenCalledWith('author@primoria.dev');
    expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
  });

  it('signs in with email and routes to dashboard', async () => {
    const user = userEvent.setup();
    renderAuthRoutes('/login');

    await user.click(screen.getByRole('button', { name: /continue with email/i }));
    await user.type(screen.getByLabelText(/email address/i), 'author@primoria.dev');
    await user.type(screen.getByLabelText(/^password$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(authFns.signInWithPassword).toHaveBeenCalledWith({
      email: 'author@primoria.dev',
      password: 'secret123',
    });
    expect(screen.getByText('Dashboard route')).toBeInTheDocument();
  });

  it('creates an account and shows the email verification state', async () => {
    const user = userEvent.setup();
    renderAuthRoutes('/register');

    await user.type(screen.getByLabelText(/^name$/i), 'Primoria Author');
    await user.type(screen.getByLabelText(/email address/i), 'author@primoria.dev');
    await user.type(screen.getAllByLabelText(/^password$/i)[0], 'secret123');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(authFns.signUp).toHaveBeenCalledWith({
      email: 'author@primoria.dev',
      password: 'secret123',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          display_name: 'Primoria Author',
        },
      },
    });
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/author@primoria.dev/i)).toBeInTheDocument();
  });
});
