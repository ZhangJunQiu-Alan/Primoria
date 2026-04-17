(function () {
  var root = document.documentElement;
  var label = '正在准备学习空间';
  var title = 'Primoria';

  function detectBrowserLanguage() {
    try {
      var candidates = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language];

      for (var index = 0; index < candidates.length; index += 1) {
        var candidate = candidates[index];
        if (typeof candidate === 'string' && candidate.toLowerCase().indexOf('en') === 0) {
          return 'en';
        }
      }
    } catch (_error) {
      // Ignore browser language detection errors and fall back to zh-CN.
    }

    return 'zh-CN';
  }

  function applyLanguage(language) {
    if (language === 'en') {
      root.lang = 'en';
      label = 'Preparing your learning space';
      title = 'Primoria';
      return;
    }

    root.lang = 'zh-CN';
    label = '正在准备学习空间';
    title = 'Primoria';
  }

  try {
    var raw = window.localStorage.getItem('primoria.viewer.preferences');
    if (raw) {
      var parsed = JSON.parse(raw);

      if (parsed && typeof parsed.themeMode === 'string') {
        if (parsed.themeMode === 'light' || parsed.themeMode === 'dark') {
          root.dataset.theme = parsed.themeMode;
        }
      }

      if (parsed && typeof parsed.language === 'string') {
        applyLanguage(parsed.language.toLowerCase().indexOf('en') === 0 ? 'en' : 'zh-CN');
      }
    } else {
      applyLanguage(detectBrowserLanguage());
    }
  } catch (_error) {
    applyLanguage(detectBrowserLanguage());
  }

  window.__viewerBootSplashLabel = label;
  document.title = title;

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
