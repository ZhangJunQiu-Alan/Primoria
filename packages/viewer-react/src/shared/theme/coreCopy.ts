import { DEFAULT_VIEWER_LANGUAGE, type ViewerLanguage } from '@/shared/i18n/locale';
import {
  getLocalizedDictionary,
  type DeepWiden,
  type LocalizedDictionary,
  useLocalizedDictionary,
} from '@/shared/i18n/dictionary';

const coreCopyDictionary = {
  'zh-CN': {
    brand: {
      name: 'Primoria',
      tagline: '把学习、陪伴和创作放进同一条路径里。',
    },
    language: {
      label: '产品语言',
      zh: '中文',
      en: 'English',
    },
    common: {
      loading: '加载中…',
      retry: '重试',
      reload: '重新加载',
      save: '保存更改',
      cancel: '取消',
      close: '关闭',
      search: '搜索',
      send: '发送',
      back: '返回',
      statusSoon: '即将上线',
      statusDisabled: '暂时不可用',
      empty: '暂时还没有内容。',
      protectedHint: '请先登录后继续。',
      errorTitle: '需要恢复',
      errorFallback: '请求没有成功完成，请再试一次。',
      fatalTitle: '应用遇到了无法恢复的错误。',
      fatalMessage: '请重新加载应用；如果问题持续，请检查开关配置和错误日志。',
      learnerNavigation: '学习者导航',
    },
    nav: {
      home: '继续学习',
      library: '找课程',
      community: '一起学',
      aiTutor: '学习助手',
      builder: '创作台',
      profile: '我的',
    },
    accountMenu: {
      open: '打开账号菜单',
      settings: '账号设置',
      help: '帮助',
      about: '关于',
      signOut: '退出登录',
    },
    featureGates: {
      community: {
        title: '一起学',
        message: '一起学暂时还没开放，请稍后再来。',
      },
      aiTutor: {
        title: '学习助手',
        message: '学习助手暂时还没开放，请稍后再来。',
      },
    },
    releaseGate: {
      title: '学习端暂时不可用',
      message: '现在暂时进不来，稍后再试一次。',
    },
  },
  en: {
    brand: {
      name: 'Primoria',
      tagline: 'A calmer path for learning, support, and creation.',
    },
    language: {
      label: 'Product language',
      zh: '中文',
      en: 'English',
    },
    common: {
      loading: 'Loading…',
      retry: 'Retry',
      reload: 'Reload',
      save: 'Save changes',
      cancel: 'Cancel',
      close: 'Close',
      search: 'Search',
      send: 'Send',
      back: 'Back',
      statusSoon: 'Coming soon',
      statusDisabled: 'Temporarily disabled',
      empty: 'Nothing to show yet.',
      protectedHint: 'Sign in to continue.',
      errorTitle: 'Recovery needed',
      errorFallback: 'The request could not be completed. Try again.',
      fatalTitle: 'The app hit an unrecoverable error.',
      fatalMessage: 'Reload the app. If the problem persists, inspect the feature flags and error logs.',
      learnerNavigation: 'Learner navigation',
    },
    nav: {
      home: 'Continue',
      library: 'Discover',
      community: 'Together',
      aiTutor: 'Helper',
      builder: 'Studio',
      profile: 'Me',
    },
    accountMenu: {
      open: 'Open account menu',
      settings: 'Account settings',
      help: 'Help',
      about: 'About',
      signOut: 'Sign out',
    },
    featureGates: {
      community: {
        title: 'Study Together',
        message: 'Study Together is not available right now. Check back soon.',
      },
      aiTutor: {
        title: 'Study Helper',
        message: 'Study Helper is not available right now. Check back soon.',
      },
    },
    releaseGate: {
      title: 'Viewer temporarily unavailable',
      message: 'This area is unavailable right now. Try again in a bit.',
    },
  },
} satisfies LocalizedDictionary<{
  brand: {
    name: string;
    tagline: string;
  };
  language: {
    label: string;
    zh: string;
    en: string;
  };
  common: {
    loading: string;
    retry: string;
    reload: string;
    save: string;
    cancel: string;
    close: string;
    search: string;
    send: string;
    back: string;
    statusSoon: string;
    statusDisabled: string;
    empty: string;
    protectedHint: string;
    errorTitle: string;
    errorFallback: string;
    fatalTitle: string;
    fatalMessage: string;
    learnerNavigation: string;
  };
  nav: {
    home: string;
    library: string;
    community: string;
    aiTutor: string;
    builder: string;
    profile: string;
  };
  accountMenu: {
    open: string;
    settings: string;
    help: string;
    about: string;
    signOut: string;
  };
  featureGates: {
    community: {
      title: string;
      message: string;
    };
    aiTutor: {
      title: string;
      message: string;
    };
  };
  releaseGate: {
    title: string;
    message: string;
  };
}>;

export type CoreCopy = DeepWiden<(typeof coreCopyDictionary)['zh-CN']>;

export function getCoreCopy(language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE): CoreCopy {
  return getLocalizedDictionary(coreCopyDictionary, language);
}

export function useCoreCopy() {
  return useLocalizedDictionary(coreCopyDictionary);
}
