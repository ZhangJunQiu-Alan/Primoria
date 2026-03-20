import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setSession, clearSession } from '../src/store/authSlice';
import editorReducer from '../src/store/editorSlice';

// Minimal router guards extracted for unit testing
import type { RootState } from '../src/store';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

function RootEntry() {
  const { user, loading } = useSelector((s: RootState) => s.auth);
  if (loading) return <div>Loading</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <div>Landing Page</div>;
}

function RequireAuth() {
  const { user, loading } = useSelector((s: RootState) => s.auth);
  if (loading) return <div>Loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RedirectIfAuth() {
  const { user, loading } = useSelector((s: RootState) => s.auth);
  if (loading) return <div>Loading</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function makeStore(overrides?: Partial<RootState['auth']>) {
  const store = configureStore({ reducer: { auth: authReducer, editor: editorReducer } });
  if (overrides) {
    if ('user' in overrides && overrides.user) {
      store.dispatch(
        setSession({ user: overrides.user as never, session: null }),
      );
    } else if (overrides.user === null) {
      store.dispatch(clearSession());
    }
  }
  return store;
}

function renderWithRouter(
  store: ReturnType<typeof makeStore>,
  initialPath: string,
  routes: React.ReactElement,
) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>{routes}</MemoryRouter>
    </Provider>,
  );
}

describe('RootEntry guard', () => {
  it('renders landing page for unauthenticated user', () => {
    const store = makeStore({ user: null, loading: false });
    renderWithRouter(
      store,
      '/',
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
    );
    expect(screen.getByText('Landing Page')).toBeTruthy();
  });

  it('redirects authenticated user from / to /dashboard', () => {
    const store = makeStore();
    store.dispatch(setSession({ user: { id: 'u1', email: 'a@b.com' } as never, session: null }));
    renderWithRouter(
      store,
      '/',
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});

describe('RequireAuth guard', () => {
  it('redirects unauthenticated user to /login', () => {
    const store = makeStore({ user: null, loading: false });
    renderWithRouter(
      store,
      '/dashboard',
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
    );
    expect(screen.getByText('Login Page')).toBeTruthy();
  });

  it('renders protected page for authenticated user', () => {
    const store = makeStore();
    store.dispatch(setSession({ user: { id: 'u1', email: 'a@b.com' } as never, session: null }));
    renderWithRouter(
      store,
      '/dashboard',
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });
});

describe('RedirectIfAuth guard', () => {
  it('redirects authenticated user away from /login', () => {
    const store = makeStore();
    store.dispatch(setSession({ user: { id: 'u1', email: 'a@b.com' } as never, session: null }));
    renderWithRouter(
      store,
      '/login',
      <Routes>
        <Route element={<RedirectIfAuth />}>
          <Route path="/login" element={<div>Login Page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
    );
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders login page for unauthenticated user', () => {
    const store = makeStore({ user: null, loading: false });
    renderWithRouter(
      store,
      '/login',
      <Routes>
        <Route element={<RedirectIfAuth />}>
          <Route path="/login" element={<div>Login Page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
    );
    expect(screen.getByText('Login Page')).toBeTruthy();
  });
});
