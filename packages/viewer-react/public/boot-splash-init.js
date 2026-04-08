(function () {
  var root = document.documentElement;
  var label = '正在准备学习空间';

  try {
    var raw = window.localStorage.getItem('primoria.viewer.preferences');
    if (raw) {
      var parsed = JSON.parse(raw);

      if (parsed && typeof parsed.themeMode === 'string') {
        if (parsed.themeMode === 'light' || parsed.themeMode === 'dark') {
          root.dataset.theme = parsed.themeMode;
        }
      }

      if (parsed && typeof parsed.language === 'string' && parsed.language.toLowerCase().indexOf('en') === 0) {
        root.lang = 'en';
        label = 'Preparing your learning space';
      }
    }
  } catch (_error) {
    // Ignore malformed local storage and fall back to defaults.
  }

  window.__viewerBootSplashLabel = label;

  function syncLabel() {
    var splashLabel = document.getElementById('viewer-boot-splash-label');
    if (splashLabel && typeof window.__viewerBootSplashLabel === 'string') {
      splashLabel.textContent = window.__viewerBootSplashLabel;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncLabel, { once: true });
  } else {
    syncLabel();
  }
})();
