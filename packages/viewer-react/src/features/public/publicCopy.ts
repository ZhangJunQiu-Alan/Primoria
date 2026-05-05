import { DEFAULT_VIEWER_LANGUAGE, type ViewerLanguage } from '@/shared/i18n/locale';
import { type DeepWiden } from '@/shared/i18n/dictionary';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';

const publicCopyDictionary = {
  'zh-CN': {
    meta: {
      landing: {
        title: 'Primoria | 让学习更容易开始，也更容易继续',
        description: 'Primoria 帮你找课程、边学边问、和同伴一起学，也让家长和创作者各自看见需要的信息。',
      },
      login: {
        title: '登录 | Primoria',
        description: '登录 Primoria，继续找课程、学习和使用学习助手。',
      },
      register: {
        title: '创建账号 | Primoria',
        description: '创建 Primoria 账号，开始找课程、学习和记录你的进度。',
      },
      callback: {
        title: '正在完成登录 | Primoria',
        description: 'Primoria 正在完成安全登录并恢复你的学习会话。',
      },
    },
    layout: {
      badge: '平台入口',
      eyebrow: 'Primoria',
      homeAriaLabel: 'Primoria 首页',
      emailSignInForm: '邮箱登录表单',
      emailRegisterForm: '邮箱注册表单',
    },
    callback: {
      pageLabel: '学习者登录',
      title: '正在完成登录',
      subtitle: '正在完成与你的登录提供方之间的安全会话交接。',
      alternatePrompt: '需要重新开始？',
      alternateLink: '前往登录',
      cardTitle: '马上就好。',
      cardBody: 'Primoria 正在同步你的会话，并会自动把你带回学习流程。',
    },
    auth: {
      loginTitle: '欢迎回来',
      loginSubtitle: '登录后继续你的学习流程。',
      registerTitle: '创建你的学习账号',
      registerSubtitle: '注册后可直接开始找课程、进入课程并继续学习。',
      newHere: '第一次来？',
      createAccount: '创建账号',
      alreadyHaveAccount: '已有账号？',
      signInLink: '去登录',
      emailSectionTitle: '使用邮箱登录',
      registerEmailSectionTitle: '使用邮箱创建账号',
      forgotModeTitle: '重设你的密码',
      toggleForgot: '忘记密码？',
      backToLogin: '返回登录',
      keepExploring: '继续逛逛',
      returnToLanding: '返回首页',
      backToLanding: '回到首页',
      landingLabel: '首页',
      email: '邮箱地址',
      password: '密码',
      confirmPassword: '确认密码',
      displayName: '昵称',
      emailPlaceholder: 'learner@primoria.dev',
      passwordPlaceholder: '输入你的密码',
      createPasswordPlaceholder: '创建密码',
      confirmPasswordPlaceholder: '再次输入密码',
      displayNamePlaceholder: '输入你的显示名称',
      forgotPassword: '忘记密码？',
      sendReset: '发送重置链接',
      signIn: '登录',
      signUp: '创建账号',
      createWithEmail: '使用邮箱创建',
      hideEmailForm: '收起邮箱表单',
      google: '使用 Google 继续',
      apple: '使用 Apple 继续',
      wechat: '使用微信继续',
      soon: '即将上线',
      or: '或',
      wechatSoon: '微信登录还在开发中。',
      verifyTitle: '请检查你的邮箱',
      verifyMessage: '我们已经发出验证邮件，确认邮箱后再回来登录。',
      resetSuccess: '重置链接已发送，请查看邮箱。',
      registerSuccess: '账号已创建，请验证邮箱后继续登录。',
      accountCreated: '账号已创建',
      verifyAndLaunch: '验证后再开始。',
      verifySummaryPrefix: '我们已经向以下邮箱发送了确认链接：',
      verifySummarySuffix: '请先验证账号，再回到登录页继续。',
      registrationSupport: '邮箱注册后可直接开始找课程、进入课时和查看账号设置。',
      hidePassword: '隐藏密码',
      showPassword: '显示密码',
    },
    landing: {
      eyebrow: 'Primoria',
      header: {
        loginCta: '登录',
        registerCta: '创建账号',
      },
      authPanel: {
        badge: '学习入口',
        title: '找一门课程\n开始学习并继续在同一个地方提问',
        features: [
          '从找课程到完成一节课，路径简单清楚',
          '学习助手会继续解释、整理重点并生成练习',
          '家长查看和创作台各自保留需要的信息，不打扰学习主线',
        ],
      },
      nav: {
        start: '怎么开始',
        assistant: '学习助手',
        community: '一起学',
        support: '给家长与创作者',
      },
      hero: {
        announcement: '陪你把学习继续下去',
        title: '让开始学习这件事',
        accentTitle: '简单一点',
        subtitle:
          'Primoria 先帮你找到现在就能开始的课程，再在学习过程中随时提问、整理重点、和同伴一起学，不需要在一堆系统说明里找方向。',
        primaryCta: '创建账号',
        secondaryCta: '登录',
        trustSignals: [
          '先找课程，再进课时，路径一眼看懂',
          '学习助手会接着当前内容继续帮你',
          '支持家长查看与创作台，但不打断学习主线',
        ],
      },
      start: {
        eyebrow: '怎么开始',
        title: '第一次进入，也知道下一步该做什么',
        subtitle:
          '首页只保留学习者真正会用到的主线：找课程、开始一节课、完成后继续往下学。',
        steps: [
          {
            eyebrow: '01',
            title: '找一门现在就能开始的课',
            description: '按主题浏览课程，先判断这门课是不是你现在想学的。',
            route: '/library',
          },
          {
            eyebrow: '02',
            title: '进入课程并开始一节课',
            description: '课程页会告诉你难度、时长和课时安排，知道自己要学什么再开始。',
            route: '/course/:courseId',
          },
          {
            eyebrow: '03',
            title: '学完以后继续往下走',
            description: '完成后会回到结果与进度，不用重新找入口，知道下一步继续什么。',
            route: '/lesson/:lessonId/result',
          },
        ],
        noteTitle: '继续学习的主线',
        noteBody:
          '完成一节课以后，结果页会把进度、正确率和下一步建议收回来，你不用重新到处找入口。',
        noteChips: ['找课程', '进入课时', '完成后继续'],
      },
      assistant: {
        eyebrow: '学习助手',
        title: '问问题、整理重点、生成练习，都不要跳出学习',
        subtitle:
          '学习助手会围绕你正在看的内容继续帮你，不用把问题搬到另一个工具里重新解释一遍。',
        cards: [
          {
            title: '我可以帮你',
            description: '直接提问、追问、换一种说法解释，保持和当前学习内容连在一起。',
          },
          {
            title: '资料',
            description: '把资料放进来后继续提炼重点，减少在不同页面之间来回切换。',
          },
          {
            title: '最近生成',
            description: '导图、提纲、小测验等结果会留在最近生成里，方便继续复习。',
          },
        ],
        samplePrompt: '把这节课先讲短一点，再给我 5 道复习题。',
        sampleReply: '可以。我会先整理重点，再补一组适合马上练习的小题。',
        tools: ['解释一下', '整理重点', '出几道题', '做复习提纲'],
      },
      community: {
        eyebrow: '一起学',
        title: '该讨论的时候讨论，该记笔记的时候记笔记',
        subtitle:
          '社区只保留学习中真正有用的四件事：学习小组、聊天、讨论、我的笔记。',
        cards: [
          {
            title: '学习小组',
            description: '围绕一门课或一个主题快速组成小组，知道现在和谁一起学。',
          },
          {
            title: '聊天',
            description: '需要马上交流时直接说，不必先进入一个信息很多的总览页。',
          },
          {
            title: '讨论',
            description: '把一个问题留下来慢慢聊，适合整理观点、追问和接力回答。',
          },
          {
            title: '我的笔记',
            description: '课程里的想法、助手给的提纲和同伴讨论都能回到自己的笔记里。',
          },
        ],
        noteTitle: '从课程里直接进入',
        noteBody: '你可以从一节课直接进入相关讨论或笔记，不需要先看一个信息过载的总览页。',
      },
      support: {
        eyebrow: '补充说明',
        title: '给家长和创作者各自留入口，但不抢学习者的首页',
        subtitle:
          'Primoria 先服务学习者；家长查看和创作台保留各自职责，需要时再进入。',
        cards: [
          {
            eyebrow: '给家长',
            title: '家长查看',
            description: '查看绑定后的学习进度和最近表现，知道孩子最近学到了哪里。',
            points: ['绑定后查看最新学习情况', '切换不同孩子', '更适合复盘，而不是在学习时打断'],
          },
          {
            eyebrow: '给创作者',
            title: '创作台',
            description: '集中管理课程、编辑内容和查看学习表现，信息只保留对下一步有帮助的部分。',
            points: ['概览只看今天重点', '课程区直接管理课程和课时', '学习表现只看完成趋势、活跃学习者和课程排行'],
          },
        ],
        closingTitle: '先开始学习，其他入口在需要时再用',
        closingBody:
          '如果你是学习者，现在直接进来找课就够了；如果你是家长或创作者，也能在进入后很快找到自己的入口。',
        primaryCta: '创建账号',
        secondaryCta: '登录',
      },
    },
  },
  en: {
    meta: {
      landing: {
        title: 'Primoria | Make learning easier to start and easier to continue',
        description: 'Primoria helps learners find a course, ask for help while studying, and keep learning with others without information overload.',
      },
      login: {
        title: 'Sign in | Primoria',
        description: 'Sign in to Primoria to continue learning, discover courses, and use the study helper.',
      },
      register: {
        title: 'Create account | Primoria',
        description: 'Create a Primoria account to discover courses, start learning, and keep track of progress.',
      },
      callback: {
        title: 'Completing sign in | Primoria',
        description: 'Primoria is completing the secure sign-in hand-off and restoring your learner session.',
      },
    },
    layout: {
      badge: 'Platform entry',
      eyebrow: 'Primoria',
      homeAriaLabel: 'Primoria home',
      emailSignInForm: 'Email sign in form',
      emailRegisterForm: 'Email registration form',
    },
    callback: {
      pageLabel: 'Learner sign in',
      title: 'Completing sign in',
      subtitle: 'Finishing the secure hand-off from your sign-in provider.',
      alternatePrompt: 'Need to restart?',
      alternateLink: 'Go to sign in',
      cardTitle: 'Almost there.',
      cardBody: 'Primoria is syncing your session and will route you into the learner experience automatically.',
    },
    auth: {
      loginTitle: 'Welcome back',
      loginSubtitle: 'Sign in to resume your learner flow.',
      registerTitle: 'Create your learner account',
      registerSubtitle: 'Register once and continue directly into course discovery, courses, and lessons.',
      newHere: 'New here?',
      createAccount: 'Create an account',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign in',
      emailSectionTitle: 'Sign in with email',
      registerEmailSectionTitle: 'Create with email',
      forgotModeTitle: 'Reset your password',
      toggleForgot: 'Forgot password?',
      backToLogin: 'Back to sign in',
      keepExploring: 'Keep exploring',
      returnToLanding: 'Return to landing',
      backToLanding: 'Back to landing',
      landingLabel: 'Landing',
      email: 'Email address',
      password: 'Password',
      confirmPassword: 'Confirm password',
      displayName: 'Display name',
      emailPlaceholder: 'learner@primoria.dev',
      passwordPlaceholder: 'Enter your password',
      createPasswordPlaceholder: 'Create a password',
      confirmPasswordPlaceholder: 'Repeat your password',
      displayNamePlaceholder: 'Your display name',
      forgotPassword: 'Forgot password?',
      sendReset: 'Send reset link',
      signIn: 'Sign in',
      signUp: 'Create account',
      createWithEmail: 'Create with email',
      hideEmailForm: 'Hide email form',
      google: 'Continue with Google',
      apple: 'Continue with Apple',
      wechat: 'Continue with WeChat',
      soon: 'Soon',
      or: 'or',
      wechatSoon: 'WeChat sign-in is still coming soon.',
      verifyTitle: 'Check your email',
      verifyMessage: 'We sent a verification email. Confirm it, then come back to sign in.',
      resetSuccess: 'Reset link sent. Check your inbox.',
      registerSuccess: 'Account created. Verify your email, then sign in to continue.',
      accountCreated: 'Account created',
      verifyAndLaunch: 'Verify and launch.',
      verifySummaryPrefix: 'We sent a confirmation link to',
      verifySummarySuffix: 'Open it, verify the account, and return to sign in.',
      registrationSupport: 'Email registration continues directly into discovery, lessons, and account settings.',
      hidePassword: 'Hide password',
      showPassword: 'Show password',
    },
    landing: {
      eyebrow: 'Primoria',
      header: {
        loginCta: 'Log in',
        registerCta: 'Create account',
      },
      authPanel: {
        badge: 'Learning entry',
        title: 'Discover a course\nStart learning and keep asking\nquestions in one place',
        features: [
          'The path from discovery to finishing a lesson is easy to follow',
          'The study helper can explain, summarize, and generate quick practice',
          'Family view and the creator studio stay available without taking over the learner homepage',
        ],
      },
      nav: {
        start: 'How To Start',
        assistant: 'Study Helper',
        community: 'Study Together',
        support: 'For Families & Creators',
      },
      hero: {
        announcement: 'A calmer way to keep learning',
        title: 'Make it easier',
        accentTitle: 'to start learning',
        subtitle:
          'Primoria helps learners find a course they can begin now, ask questions while they study, and keep moving with support from notes, practice, and peers.',
        primaryCta: 'Create account',
        secondaryCta: 'Log in',
        trustSignals: [
          'The next step is clear from course discovery to lesson finish',
          'The study helper stays connected to what you are learning',
          'Family view and creator tools stay available without interrupting the learner path',
        ],
      },
      start: {
        eyebrow: 'How To Start',
        title: 'A first-time learner should know the next step immediately',
        subtitle:
          'The landing page keeps only the path learners actually use: discover a course, begin a lesson, then continue after finishing.',
        steps: [
          {
            eyebrow: '01',
            title: 'Find a course you can start now',
            description: 'Browse by topic and decide whether this course matches what you want to learn next.',
            route: '/library',
          },
          {
            eyebrow: '02',
            title: 'Enter the course and begin a lesson',
            description: 'See the pace, difficulty, and lesson plan before you start so the path feels clear.',
            route: '/course/:courseId',
          },
          {
            eyebrow: '03',
            title: 'Finish and keep going',
            description: 'Progress, results, and the next step come back together after each lesson instead of sending you hunting for what to do next.',
            route: '/lesson/:lessonId/result',
          },
        ],
        noteTitle: 'The continue-learning path',
        noteBody:
          'After a lesson, Primoria brings back progress, results, and a next-step cue so learners can keep moving without reorienting themselves.',
        noteChips: ['Discover', 'Start lesson', 'Continue'],
      },
      assistant: {
        eyebrow: 'Study Helper',
        title: 'Ask questions, summarize key points, and generate practice without leaving the lesson',
        subtitle:
          'The helper stays grounded in the content you are already studying, so you do not have to restart the context in a separate tool.',
        cards: [
          {
            title: 'What I can help with',
            description: 'Ask, follow up, and request a simpler explanation while staying connected to the current lesson.',
          },
          {
            title: 'Materials',
            description: 'Bring in supporting material and keep working from it without constant switching.',
          },
          {
            title: 'Recent outputs',
            description: 'Mind maps, outlines, and quick practice stay visible so review feels continuous.',
          },
        ],
        samplePrompt: 'Make this lesson shorter first, then give me five review questions.',
        sampleReply: 'Sure. I will summarize the key points first, then add a short practice set you can use right away.',
        tools: ['Explain it', 'Summarize', 'Quiz me', 'Make a review outline'],
      },
      community: {
        eyebrow: 'Study Together',
        title: 'Discuss when you need discussion, keep notes when you need notes',
        subtitle:
          'Community keeps only the four parts learners actually use: study groups, chat, discussion, and my notes.',
        cards: [
          {
            title: 'Study groups',
            description: 'Gather around a shared course or topic and see who is learning with you right now.',
          },
          {
            title: 'Chat',
            description: 'Talk right away when something needs a quick answer instead of entering an overloaded overview first.',
          },
          {
            title: 'Discussion',
            description: 'Leave a question or idea in a thread when it needs more thoughtful replies over time.',
          },
          {
            title: 'My notes',
            description: 'Keep lesson takeaways, helper outputs, and peer discussion inside one personal place.',
          },
        ],
        noteTitle: 'Enter from the lesson',
        noteBody: 'Learners can jump straight from a lesson into the related notes or discussion instead of landing on a crowded overview.',
      },
      support: {
        eyebrow: 'Extra Paths',
        title: 'Keep space for families and creators without letting them take over the learner homepage',
        subtitle:
          'Primoria serves learners first. Family view and the creator studio stay available for the moments when those roles need them.',
        cards: [
          {
            eyebrow: 'For families',
            title: 'Family View',
            description: 'Review linked progress and recent learning activity without interrupting the learner while they study.',
            points: ['Check the latest learning status after linking', 'Switch between children', 'Better for review than live interruption'],
          },
          {
            eyebrow: 'For creators',
            title: 'Studio',
            description: 'Manage courses, edit content, and review learning performance with only the information that helps the next decision.',
            points: ['Overview focuses on today', 'Courses stay centered on course and lesson actions', 'Learning performance keeps only trend, active learners, and ranking'],
          },
        ],
        closingTitle: 'Start learning first and use the other paths when you actually need them',
        closingBody:
          'Learners can come in and discover a course right away. Families and creators can still find their own entry points quickly after signing in.',
        primaryCta: 'Create account',
        secondaryCta: 'Log in',
      },
    },
  },
} as const;

export type PublicCopy = DeepWiden<(typeof publicCopyDictionary)['zh-CN']>;

export function getPublicCopy(language: ViewerLanguage = DEFAULT_VIEWER_LANGUAGE): PublicCopy {
  return publicCopyDictionary[language] as PublicCopy;
}

export function usePublicCopy() {
  return getPublicCopy(useProductLanguage());
}
