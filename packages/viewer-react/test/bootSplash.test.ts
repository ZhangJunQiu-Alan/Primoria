import {
  initializeBootSplash,
  markBootSplashAuthSettled,
  markBootSplashRouteSettled,
  resetBootSplashForTests,
} from '@/shared/boot/bootSplash';

describe('boot splash coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.dataset.theme = '';
    document.documentElement.lang = 'zh-CN';
    document.body.innerHTML = `
      <div id="viewer-boot-splash" data-state="visible">
        <span id="viewer-boot-splash-label">正在准备学习空间</span>
      </div>
    `;
    window.localStorage.setItem(
      'primoria.viewer.preferences',
      JSON.stringify({
        language: 'en',
        themeMode: 'dark',
      }),
    );
    window.history.pushState({}, '', '/home');
    resetBootSplashForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetBootSplashForTests();
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('waits for both auth and route readiness before removing the splash', async () => {
    initializeBootSplash();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.lang).toBe('en');
    expect(document.getElementById('viewer-boot-splash-label')?.textContent).toContain('Preparing');

    markBootSplashAuthSettled();
    expect(document.getElementById('viewer-boot-splash')).not.toBeNull();

    markBootSplashRouteSettled();
    expect(document.getElementById('viewer-boot-splash')?.dataset.state).toBe('exit');

    await vi.advanceTimersByTimeAsync(300);
    expect(document.getElementById('viewer-boot-splash')).toBeNull();
  });
});
