import { screen, within } from '@testing-library/react';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { renderRoute } from './renderApp';

describe('LandingPage', () => {
  it('renders the platform landing sections in zh-CN by default', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /让开始学习这件事/i })).toBeInTheDocument();

    [
      'landing-section-hero',
      'landing-section-start',
      'landing-section-assistant',
      'landing-section-community',
      'landing-section-support',
    ].forEach((testId) => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId('landing-section-assistant')).getByRole('heading', {
        name: /问问题、整理重点、生成练习/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('landing-section-support')).getByRole('heading', {
        name: /给创作者留入口/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('landing-hero-primary-cta')).toHaveAttribute('href', '/register');
    expect(screen.getByTestId('landing-hero-secondary-cta')).toHaveAttribute('href', '/login');
    expect(screen.getByTestId('landing-header-login')).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /^中文$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^English$/i })).not.toBeInTheDocument();
  });

  it('renders the same platform structure in English', async () => {
    window.localStorage.setItem(
      VIEWER_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'en',
      }),
    );

    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /Make it easier/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ask questions, summarize key points/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Keep space for creators/i })).toBeInTheDocument();
    expect(screen.getByTestId('landing-hero-primary-cta')).toHaveAttribute('href', '/register');
    expect(screen.getByTestId('landing-hero-secondary-cta')).toHaveAttribute('href', '/login');
  });

  it('renders the English landing navigation when language preference is preset', async () => {
    window.localStorage.setItem(
      VIEWER_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'en',
      }),
    );

    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /Make it easier/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^How To Start$/i })).toHaveAttribute('href', '#start');
    expect(screen.getByRole('heading', { name: /Discuss when you need discussion/i })).toBeInTheDocument();
  });
});
