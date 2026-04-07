import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VIEWER_FIXTURE_STORAGE_KEY } from '@/shared/api/viewer/fixtureStore';
import { VIEWER_PREFERENCES_STORAGE_KEY } from '@/shared/state/preferencesSlice';
import { DEMO_ROLE_STORAGE_KEY } from '@/shared/utils/demoMode';
import { renderRoute } from './renderApp';

describe('SettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists profile edits, local preferences, and binding code actions for learner mode', async () => {
    const user = userEvent.setup();
    renderRoute('/settings', 'user');

    expect(await screen.findByRole('heading', { name: /设置中心/i }, { timeout: 15000 })).toBeInTheDocument();

    const usernameInput = await screen.findByLabelText(/用户名/i);
    await user.clear(usernameInput);
    await user.type(usernameInput, 'Refactor Learner');
    await user.click(await screen.findByRole('button', { name: /保存资料/i }));

    expect(await screen.findByText(/资料已更新/i)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(VIEWER_FIXTURE_STORAGE_KEY) ?? '{}')).toMatchObject({
      profile: { username: 'Refactor Learner' },
    });

    await user.click(await screen.findByRole('button', { name: /学习偏好/i }));
    const soundToggle = await screen.findByLabelText(/声音反馈/i);
    expect(soundToggle).toBeChecked();
    await user.click(soundToggle);
    expect(soundToggle).not.toBeChecked();
    expect(window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY)).toContain('"soundEnabled":false');

    await user.click(await screen.findByRole('button', { name: /AI 导师/i }));
    await user.click(await screen.findByRole('button', { name: /教练/i }));
    const homeCompanionToggle = await screen.findByLabelText(/首页显示 AI 导师形象/i);
    expect(homeCompanionToggle).toBeChecked();
    await user.click(homeCompanionToggle);
    expect(homeCompanionToggle).not.toBeChecked();

    await waitFor(() => {
      expect(window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY)).toContain('"aiTutorPersona":"coach"');
      expect(window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY)).toContain('"homeCompanionEnabled":false');
      expect(JSON.parse(window.localStorage.getItem(VIEWER_FIXTURE_STORAGE_KEY) ?? '{}')).toMatchObject({
        userSettings: { ai_tutor_persona: 'coach', home_companion_enabled: false },
      });
    });

    await user.click(await screen.findByRole('button', { name: /家长模式/i }));
    await user.click(await screen.findByRole('button', { name: /生成绑定码/i }));
    expect(await screen.findByText(/DEMO-2419/i)).toBeInTheDocument();
  }, 30000);

  it('switches settings language and persists system settings', async () => {
    const user = userEvent.setup();
    renderRoute('/settings', 'user');

    expect(await screen.findByRole('heading', { name: /设置中心/i }, { timeout: 15000 })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /显示与语言/i }));
    await user.click(await screen.findByRole('button', { name: /^深色$/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    const englishButtons = await screen.findAllByRole('button', { name: /^English$/i });
    await user.click(englishButtons.at(-1)!);

    expect(await screen.findByRole('heading', { name: /Settings Center/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY)).toContain('"language":"en"');
    expect(window.localStorage.getItem(VIEWER_PREFERENCES_STORAGE_KEY)).toContain('"themeMode":"dark"');
    expect(JSON.parse(window.localStorage.getItem(VIEWER_FIXTURE_STORAGE_KEY) ?? '{}')).toMatchObject({
      userSettings: { language: 'en', theme_mode: 'dark' },
    });
  }, 30000);

  it('allows parent users to open the settings center and support pages', async () => {
    const user = userEvent.setup();
    const { locationRef } = renderRoute('/settings', 'parent');

    expect(await screen.findByRole('heading', { name: /设置中心/i }, { timeout: 15000 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /支持与关于/i }));
    await user.click(await screen.findByRole('link', { name: /帮助中心/i }));

    expect(await screen.findByRole('heading', { name: /帮助中心/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(locationRef.pathname).toBe('/support/help');
  }, 30000);

  it('signs out cleanly from demo mode', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    const { locationRef } = renderRoute('/settings', 'user');

    expect(await screen.findByRole('heading', { name: /设置中心/i }, { timeout: 15000 })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /支持与关于/i }));
    await user.click(await screen.findByRole('button', { name: /退出当前账号/i }));

    expect(await screen.findByRole('heading', { name: /从创作到学习/i }, { timeout: 15000 })).toBeInTheDocument();
    expect(locationRef.pathname).toBe('/');
    expect(window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY)).toBeNull();
  }, 30000);
});
