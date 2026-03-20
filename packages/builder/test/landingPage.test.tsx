import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer, { clearSession } from '../src/store/authSlice';
import editorReducer from '../src/store/editorSlice';
import { LandingPage } from '../src/pages/LandingPage';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      editor: editorReducer,
    },
  });
}

function renderLanding(store = makeStore()) {
  const user = userEvent.setup();

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<div>Login route</div>} />
          <Route path="/register" element={<div>Register route</div>} />
          <Route path="/dashboard" element={<div>Dashboard route</div>} />
          <Route path="/editor" element={<div>Editor route</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

  return { store, user };
}

describe('LandingPage', () => {
  it('renders the botanical builder sections', () => {
    const store = makeStore();
    store.dispatch(clearSession());
    renderLanding(store);

    expect(
      screen.getByRole('heading', {
        name: /if you want to master something, teach it/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/today's teaching sprint/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /a builder that feels crafted, not cobbled together/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /from concept to publishing in one calm flow/i,
      }),
    ).toBeInTheDocument();
  });

  it('routes unauthenticated primary CTA to login', async () => {
    const store = makeStore();
    store.dispatch(clearSession());
    const { user } = renderLanding(store);

    await user.click(screen.getAllByRole('button', { name: /^sign in$/i })[0]);

    expect(screen.getByText('Login route')).toBeInTheDocument();
  });

  it('routes unauthenticated secondary CTA to register', async () => {
    const store = makeStore();
    store.dispatch(clearSession());
    const { user } = renderLanding(store);

    await user.click(screen.getAllByRole('button', { name: /^register$/i })[0]);
    expect(screen.getByText('Register route')).toBeInTheDocument();
  });
});
