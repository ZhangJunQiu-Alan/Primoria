import { screen, within } from '@testing-library/react';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { renderRoute } from './renderApp';

describe('LandingPage', () => {
  it('renders the platform landing sections in zh-CN by default', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /从创作到学习/i })).toBeInTheDocument();

    [
      'landing-section-hero',
      'landing-section-product',
      'landing-section-learner',
      'landing-section-tutor',
      'landing-section-community',
      'landing-section-family',
      'landing-section-builder-dashboard',
      'landing-section-builder-editor',
      'landing-section-feature-atlas',
    ].forEach((testId) => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId('landing-section-builder-dashboard')).getByRole('heading', {
        name: /Builder Dashboard 负责把课程经营面与作者工作流收在一起/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('landing-section-family')).getByRole('heading', {
        name: /家长模式不抢首页主叙事，但必须清楚可见/i,
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

    expect(await screen.findByRole('heading', { name: /From course creation to active learning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Builder Dashboard keeps the operating layer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Parent mode stays secondary in the layout/i })).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: /From course creation to active learning/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Product$/i })).toHaveAttribute('href', '#product');
    expect(screen.getByRole('heading', { name: /Community covers messages, study rooms, trending threads, and notes/i })).toBeInTheDocument();
  });
});
