import { Fragment } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Compass,
  Flame,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  WandSparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useViewerCopy } from '@/shared/theme/copy';
import { publicAssetPath } from '@/shared/utils/publicAsset';

function getWorkflowSteps(isChinese: boolean): Array<{
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  borderClass: string;
  iconClass: string;
  numberClass: string;
}> {
  return isChinese
    ? [
        {
          number: '01',
          title: '选择你的路径',
          description: '浏览 200+ 专家打造课程，覆盖物理、数学、计算机等领域。可按主题、难度、时长筛选。',
          icon: Compass,
          borderClass: 'border-[#d8efff]',
          iconClass: 'bg-[#dff2ff] text-[#27a2f4]',
          numberClass: 'text-[#d5efff]',
        },
        {
          number: '02',
          title: '互动式学习',
          description: '每节课都强调动手实践。解题、跑代码、拖动滑杆，不再被动看视频。遇到卡点，AI 导师会立即讲解。',
          icon: WandSparkles,
          borderClass: 'border-[#eadcff]',
          iconClass: 'bg-[#f2eaff] text-[#8b5cf6]',
          numberClass: 'text-[#efe2ff]',
        },
        {
          number: '03',
          title: '追踪进度并升级',
          description: '赚取 XP、保持每日连击、解锁成就并冲击排行榜。看着你的学习热力图一周周点亮。',
          icon: TrendingUp,
          borderClass: 'border-[#dff2ce]',
          iconClass: 'bg-[#ebf9db] text-[#76c539]',
          numberClass: 'text-[#deefcc]',
        },
      ]
    : [
        {
          number: '01',
          title: 'Choose your path',
          description: 'Browse 200+ expert-built courses across physics, math, computer science, and more. Filter by topic, level, and length.',
          icon: Compass,
          borderClass: 'border-[#d8efff]',
          iconClass: 'bg-[#dff2ff] text-[#27a2f4]',
          numberClass: 'text-[#d5efff]',
        },
        {
          number: '02',
          title: 'Learn interactively',
          description: 'Every lesson is hands-on. Solve, code, and drag sliders instead of just watching videos. When you get stuck, the AI tutor steps in instantly.',
          icon: WandSparkles,
          borderClass: 'border-[#eadcff]',
          iconClass: 'bg-[#f2eaff] text-[#8b5cf6]',
          numberClass: 'text-[#efe2ff]',
        },
        {
          number: '03',
          title: 'Track progress and level up',
          description: 'Earn XP, keep your streak alive, unlock achievements, and climb the leaderboard while your heatmap fills in week by week.',
          icon: TrendingUp,
          borderClass: 'border-[#dff2ce]',
          iconClass: 'bg-[#ebf9db] text-[#76c539]',
          numberClass: 'text-[#deefcc]',
        },
      ];
}

function getGrowthFeatures(isChinese: boolean): Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
}> {
  return isChinese
    ? [
        {
          title: '每日连击',
          description: '用连续学习天数建立惯性',
          icon: Flame,
          iconClass: 'bg-[#fff0df] text-[#ff7a00]',
        },
        {
          title: '经验值（XP）',
          description: '课程、测验、活动都能获得 XP',
          icon: Star,
          iconClass: 'bg-[#fff2df] text-[#ffb347]',
        },
        {
          title: '成就徽章',
          description: '达成里程碑可解锁稀有徽章',
          icon: Trophy,
          iconClass: 'bg-[#f3e8ff] text-[#8b5cf6]',
        },
        {
          title: '每日任务',
          description: '每天新任务，保持新鲜感',
          icon: CheckCircle2,
          iconClass: 'bg-[#e6faea] text-[#20c97a]',
        },
      ]
    : [
        {
          title: 'Daily streaks',
          description: 'Build momentum through consistent study days',
          icon: Flame,
          iconClass: 'bg-[#fff0df] text-[#ff7a00]',
        },
        {
          title: 'Experience points',
          description: 'Earn XP from courses, quizzes, and activity',
          icon: Star,
          iconClass: 'bg-[#fff2df] text-[#ffb347]',
        },
        {
          title: 'Achievement badges',
          description: 'Unlock rare badges when you hit milestones',
          icon: Trophy,
          iconClass: 'bg-[#f3e8ff] text-[#8b5cf6]',
        },
        {
          title: 'Daily quests',
          description: 'Fresh tasks every day to keep things moving',
          icon: CheckCircle2,
          iconClass: 'bg-[#e6faea] text-[#20c97a]',
        },
      ];
}

function getCommunityCards(isChinese: boolean): Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> {
  return isChinese
    ? [
        {
          title: '智能匹配',
          description: '按能力水平与主题兴趣匹配',
          icon: Search,
        },
        {
          title: '排行榜',
          description: '每周排名激发良性竞争',
          icon: BarChart3,
        },
        {
          title: '组队挑战',
          description: '和小队一起完成特别任务',
          icon: Users,
        },
      ]
    : [
        {
          title: 'Smart matching',
          description: 'Get paired by level and topic interests',
          icon: Search,
        },
        {
          title: 'Leaderboards',
          description: 'Weekly rankings keep the competition healthy',
          icon: BarChart3,
        },
        {
          title: 'Team challenges',
          description: 'Finish special missions together with your squad',
          icon: Users,
        },
      ];
}

function getTestimonials(isChinese: boolean) {
  return [
    {
      quote: isChinese
        ? '“以前我很怕物理。用了 Primoria 两周后，我竟然开始期待学习。那些交互滑杆会让抽象概念一下子变清楚。”'
        : '“I used to dread physics. After two weeks on Primoria, I actually look forward to it. The interactive sliders make abstract concepts click instantly.”',
      name: 'Aisha K.',
      title: isChinese ? '高中生' : 'High school learner',
      initials: 'AK',
      tone: 'bg-[#efe5ff] text-[#875cf6]',
    },
    {
      quote: isChinese
        ? '“AI 导师真的改变了我的学习方式。我半夜问量子纠缠，它马上给了我一步步讲解，还顺手出了一组小测验。”'
        : '“The AI tutor is a game-changer. I asked about quantum entanglement at midnight and got a step-by-step explanation with a quiz to test my understanding.”',
      name: 'Marcus T.',
      title: isChinese ? '大学二年级' : 'Second-year university student',
      initials: 'MT',
      tone: 'bg-[#daf8ef] text-[#1fc7a1]',
    },
    {
      quote: isChinese
        ? '“我的连击已经来到 47 天！每日任务让我很难停下来。一个月学到的微积分，比过去整个学期还多。”'
        : '“My streak is at 47 days and counting! The daily quests make it hard to stop. I have learned more calculus in a month than I did in a whole semester.”',
      name: 'Lingyun W.',
      title: isChinese ? '自学者' : 'Self-taught learner',
      initials: 'LW',
      tone: 'bg-[#fff0df] text-[#ffa32f]',
    },
  ] as const;
}

function SectionEyebrow({ children, tone = 'text-[#1fa0f4]' }: { children: React.ReactNode; tone?: string }) {
  return <p className={`text-[0.95rem] font-black tracking-[0.04em] ${tone}`}>{children}</p>;
}

export function LandingPage() {
  const language = useProductLanguage();
  const isChinese = language === 'zh-CN';
  const copy = useViewerCopy();
  const workflowSteps = getWorkflowSteps(isChinese);
  const growthFeatures = getGrowthFeatures(isChinese);
  const communityCards = getCommunityCards(isChinese);
  const testimonials = getTestimonials(isChinese);
  const landingText = isChinese
    ? {
        workflowEyebrow: '学习流程',
        workflowTitleTop: '从零到高手',
        workflowTitleBottom: '只需 3 步',
        tutorBadge: '由 Gemini AI 提供支持',
        tutorTitleTop: '你的专属 AI',
        tutorTitleBottom: '导师，始终在线',
        tutorBody: '凌晨两点遇到难点？你的 AI 导师从不下线。随时提问，获得清晰讲解，保持学习势头。',
        tutorName: 'Primoria AI 导师',
        tutorOnline: '始终在线',
        tutorQuestion: '水在结冰时为什么会膨胀？这听起来有点反直觉。',
        tutorAnswer:
          '好问题！水分子在冰中会形成刚性的六边形晶格，这种结构比液态排列占据更大体积，所以结冰后反而会膨胀。这也是冰会浮在水面的原因。',
        tutorFollowUp: '要不要我顺手帮你画一个分子结构示意图，再出 3 道小测验？',
        streakTitle: '47 天连击',
        streakBody: '状态火热！继续保持。',
        streakDays: ['一', '二', '三', '四', '五', '六', '日'],
        xpProgress: 'XP 进度',
        recentAchievements: '最近成就',
        recentAchievementLabels: ['第一节课', '7 天连击', '测验达人', '前 10%'],
        growthEyebrow: '成长体系',
        growthTitleTop: '让每一节课',
        growthTitleBottom: '都有价值',
        growthBody:
          '科学研究表明，奖励机制能让大脑更爱学习。Primoria 基于这一点打造：每节课赚 XP，每天延续连击，每个里程碑解锁新成就。',
        communityEyebrow: '社区',
        communityTitle: '找到你的学习搭子',
        communityBody:
          '一个人学习并不容易。我们的智能匹配算法会把你与同水平、同主题学习者连接起来。互相激励、排行榜竞争、一起达成目标。',
        joinCommunity: '加入社区',
        testimonialEyebrow: '用户评价',
        testimonialTitle: '学习者喜爱 Primoria',
        ctaTitleTop: '准备开启你的',
        ctaTitleBottom: '学习旅程了吗？',
        ctaBody: '加入 10,000+ 位学习者，选择动手学习，而不只是观看。',
        ctaPrimary: '免费创建账号',
        ctaSecondary: '登录',
      }
    : {
        workflowEyebrow: 'Learning flow',
        workflowTitleTop: 'Go from beginner',
        workflowTitleBottom: 'to confident in 3 steps',
        tutorBadge: 'Powered by Gemini AI',
        tutorTitleTop: 'Your personal AI',
        tutorTitleBottom: 'tutor, always on',
        tutorBody: 'Stuck at 2 a.m.? Your AI tutor never goes offline. Ask anytime, get a clear explanation, and keep your momentum going.',
        tutorName: 'Primoria AI Tutor',
        tutorOnline: 'Always online',
        tutorQuestion: 'Why does water expand when it freezes? That feels counterintuitive.',
        tutorAnswer:
          'Great question. In ice, water molecules form a rigid hexagonal lattice that takes up more space than the liquid arrangement, so freezing increases volume. That is also why ice floats.',
        tutorFollowUp: 'Want me to sketch the molecular structure next and generate 3 quick quiz questions for you?',
        streakTitle: '47 day streak',
        streakBody: 'You are on fire. Keep it going.',
        streakDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        xpProgress: 'XP progress',
        recentAchievements: 'Recent achievements',
        recentAchievementLabels: ['First lesson', '7 day streak', 'Quiz ace', 'Top 10%'],
        growthEyebrow: 'Growth system',
        growthTitleTop: 'Make every lesson',
        growthTitleBottom: 'feel rewarding',
        growthBody:
          'Learning science shows that reward loops help the brain stay engaged. Primoria is built around that idea: earn XP from every lesson, extend your streak daily, and unlock new achievements at each milestone.',
        communityEyebrow: 'Community',
        communityTitle: 'Find your study crew',
        communityBody:
          'Learning alone is hard. Our matching system connects you with people at a similar level and on similar topics so you can stay motivated, compete, and hit goals together.',
        joinCommunity: 'Join the community',
        testimonialEyebrow: 'Testimonials',
        testimonialTitle: 'Learners love Primoria',
        ctaTitleTop: 'Ready to start your',
        ctaTitleBottom: 'learning journey?',
        ctaBody: 'Join 10,000+ learners who choose doing over just watching.',
        ctaPrimary: 'Create a free account',
        ctaSecondary: 'Log in',
      };
  const topNavLinks = [
    { id: 'growth', label: copy.landing.topNav[0] },
    { id: 'workflow', label: copy.landing.topNav[1] },
    { id: 'tutor', label: copy.landing.topNav[2] },
    { id: 'community', label: copy.landing.topNav[3] },
  ] as const;

  return (
    <main className="bg-white text-[#0f1324]">
      <header className="relative z-20 border-b border-[#edf2f8] bg-white/96 backdrop-blur">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-14">
          <div className="landing-zoom-80 flex items-center gap-12">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-[#091022] shadow-[0_16px_36px_rgba(6,24,59,0.20)]">
                <img src={publicAssetPath('primoria-logo.png')} alt="Primoria" className="h-full w-full object-cover" />
              </div>
              <span className="text-[1.8rem] font-black uppercase tracking-[0.08em] text-[#28a4f4] md:text-[1.95rem]">
                {copy.brand.name}
              </span>
            </Link>

            <nav className="hidden items-center gap-10 text-[0.98rem] font-bold text-[#44506f] lg:flex">
              {topNavLinks.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="transition hover:text-[#1a9df0]">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher tone="public" />
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-[16px] border-2 border-[#2b86ff] px-5 text-[0.98rem] font-black text-[#1675f0] transition hover:bg-[#eef6ff]"
            >
              {copy.landing.loginCta}
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#1d7df4,#21d2e6)] px-6 text-[0.98rem] font-black text-white shadow-[0_18px_30px_rgba(35,165,243,0.28)] transition hover:translate-y-[-1px]"
            >
              {copy.landing.registerCta}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[-8%] top-[12%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(55,188,255,0.14),rgba(55,188,255,0))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[8%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(120,183,255,0.12),rgba(120,183,255,0))]"
        />

        <div className="landing-zoom-80 mx-auto grid max-w-[1540px] items-center gap-14 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)] lg:px-14 lg:py-20">
          <div className="max-w-[42rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#95d9ff] bg-[#ebf8ff] px-5 py-2.5 text-[1rem] font-black text-[#1694ef] shadow-[0_10px_22px_rgba(32,148,242,0.08)]">
              <WandSparkles size={17} className="shrink-0" />
              <span>{copy.landing.announcement}</span>
            </div>

            <div className="mt-7">
              <h1 className="text-[clamp(3.2rem,4.8vw,4.9rem)] font-black leading-[0.93] tracking-[-0.065em] text-[#0f1324]">
                <span className="block">{copy.landing.title}</span>
                <span className="block bg-[linear-gradient(135deg,#1590f7,#33d4f2)] bg-clip-text text-transparent">
                  {copy.landing.accentTitle}
                </span>
              </h1>
            </div>

            <p className="mt-8 max-w-[38rem] text-[1rem] leading-[1.85] text-[#67738e] md:text-[1.08rem]">
              {copy.landing.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="inline-flex min-w-[14rem] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#157df7,#24d1e7)] px-8 py-3.5 text-[1.2rem] font-black text-white shadow-[0_20px_36px_rgba(29,143,244,0.25)] transition hover:translate-y-[-1px]"
              >
                {copy.landing.primaryCta}
              </Link>
              <a
                href="#workflow"
                className="inline-flex min-w-[8.5rem] items-center justify-center rounded-[18px] border-2 border-[#2587fb] px-8 py-3.5 text-[1.2rem] font-black text-[#1d7cf6] transition hover:bg-[#eef6ff]"
              >
                {copy.landing.secondaryCta}
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[0.95rem] font-bold text-[#7b859d]">
              {copy.landing.trustSignals.map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 size={19} className="text-[#56c516]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[34rem]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_32%,rgba(245,251,255,0.98),rgba(246,250,255,0.82)_36%,rgba(248,251,255,0)_72%)]" />
            <div className="pointer-events-none viewer-float-slow absolute left-[8%] top-[17%] z-10 w-[24rem] max-w-[70%] rounded-[30px] bg-white px-5 py-6 shadow-[0_28px_58px_rgba(33,92,164,0.14)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe4ff] text-[#7b4ce6]">
                  <Sparkles size={22} />
                </div>
                <span className="text-[1.75rem] font-black tracking-[-0.04em] text-[#171a27]">
                  {copy.landing.courseCardTitle}
                </span>
              </div>

              <div className="mt-7 h-3 rounded-full bg-[#d9edf8]">
                <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#1b9ff4,#28b7f2)]" />
              </div>

              <p className="mt-4 text-[1rem] text-[#7b88a3]">
                {copy.landing.courseCardProgress}
                <span className="mx-2">·</span>
                {copy.landing.courseCardMeta}
              </p>
            </div>

            <div className="pointer-events-none viewer-float-fast absolute right-[4%] top-[9%] z-20 flex min-h-[7.6rem] w-[14.5rem] flex-col justify-center rounded-[28px] bg-[#fff1d5] px-6 shadow-[0_24px_55px_rgba(227,182,95,0.18)]">
              <div className="flex items-center gap-4">
                <Flame size={36} className="text-[#ff6a00]" />
                <span className="text-[2.6rem] font-black leading-none text-[#ff7a00]">
                  {copy.landing.streakValue}
                </span>
              </div>
              <p className="mt-2 pl-[3.2rem] text-[1.45rem] font-black text-[#3d4a68]">
                {copy.landing.streakLabel}
              </p>
            </div>

            <div className="pointer-events-none viewer-float-medium absolute left-[28%] top-[67%] z-10 flex flex-col gap-3">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,rgba(24,162,248,0.96),rgba(92,171,243,0.92))] px-6 py-3 text-[1.05rem] font-black text-white shadow-[0_16px_30px_rgba(31,151,245,0.22)]"
                >
                  <Sparkles size={17} className="fill-current" />
                  <span>{copy.landing.xpLabel}</span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none viewer-float-slow absolute bottom-[2%] right-[1%] z-20 w-[20rem] max-w-[85%] rounded-[26px] bg-[#0a1031] px-5 py-5 text-white shadow-[0_28px_58px_rgba(7,17,49,0.26)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7749f8]">
                  <Bot size={21} />
                </div>
                <p className="text-[1.25rem] font-bold tracking-[-0.03em]">{copy.landing.tutorPrompt}</p>
              </div>
            </div>

            <div className="pointer-events-none absolute left-[-3%] top-[11%] h-[13rem] w-[13rem] rounded-full bg-white/8" />
            <div className="pointer-events-none absolute right-[3%] top-[20%] h-[18rem] w-[18rem] rounded-full border border-white/30" />
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white">
        <div className="landing-zoom-80 mx-auto max-w-[1540px] px-5 py-16 md:px-8 lg:px-14 lg:py-20">
          <SectionEyebrow>{landingText.workflowEyebrow}</SectionEyebrow>
          <h2 className="mt-3 max-w-[24rem] text-[clamp(3rem,4vw,4.5rem)] font-black leading-[0.94] tracking-[-0.065em] text-[#111627]">
            {landingText.workflowTitleTop}
            <br />
            {landingText.workflowTitleBottom}
          </h2>

          <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const card = (
                <article
                  key={step.number}
                  className={`relative min-h-[270px] rounded-[34px] border bg-white p-8 shadow-[0_22px_50px_rgba(135,163,213,0.10)] ${step.borderClass}`}
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-[20px] ${step.iconClass}`}>
                    <Icon size={28} />
                  </div>
                  <div className={`absolute right-8 top-8 text-[3rem] font-black tracking-[-0.05em] ${step.numberClass}`}>
                    {step.number}
                  </div>
                  <h3 className="mt-10 text-[1.85rem] font-black tracking-[-0.04em] text-[#141a2b]">{step.title}</h3>
                  <p className="mt-4 max-w-[26rem] text-[1rem] leading-8 text-[#62708d]">{step.description}</p>
                </article>
              );

              if (index === workflowSteps.length - 1) {
                return card;
              }

              return (
                <Fragment key={step.number}>
                  {card}
                  <div
                    className="hidden items-center justify-center text-[#c2cad8] lg:flex"
                    aria-hidden="true"
                  >
                    <ArrowRight size={36} />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <section id="tutor" className="overflow-hidden bg-[#0a1031] text-white">
        <div className="landing-zoom-80 mx-auto grid max-w-[1540px] gap-10 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(560px,1.05fr)] lg:px-14 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#5f4bc4] bg-[#231b56] px-4 py-2 text-[0.95rem] font-black text-[#9b74ff]">
              <Bot size={15} />
              {landingText.tutorBadge}
            </div>
            <h2 className="mt-8 text-[clamp(3rem,4.2vw,4.7rem)] font-black leading-[0.94] tracking-[-0.065em] text-white">
              {landingText.tutorTitleTop}
              <br />
              {landingText.tutorTitleBottom}
            </h2>
            <p className="mt-7 max-w-[40rem] text-[1.05rem] leading-8 text-white/78">
              {landingText.tutorBody}
            </p>
          </div>

          <div className="relative rounded-[36px] border border-white/8 bg-[#141b4b] p-7 shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#6841ff,#9167ff)] text-white">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="text-[1.8rem] font-black">{landingText.tutorName}</h3>
                <p className="mt-1 flex items-center gap-2 text-[0.95rem] font-semibold text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#57d637]" />
                  {landingText.tutorOnline}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="ml-auto max-w-[72%] rounded-[24px] bg-[linear-gradient(135deg,#8c63ff,#7a4ff0)] px-5 py-4 text-[1.02rem] font-medium leading-8 text-white shadow-[0_14px_32px_rgba(123,91,238,0.24)]">
                {landingText.tutorQuestion}
              </div>
              <div className="max-w-[82%] rounded-[24px] bg-white/8 px-5 py-4 text-[1rem] font-medium leading-8 text-white/82 backdrop-blur">
                {landingText.tutorAnswer}
              </div>
              <div className="max-w-[68%] rounded-[24px] border border-white/10 bg-[#1b245b] px-5 py-4 text-[1rem] font-medium leading-8 text-white/82">
                {landingText.tutorFollowUp}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="growth" className="bg-[radial-gradient(circle_at_15%_35%,rgba(255,201,117,0.18),rgba(255,201,117,0)_22%),linear-gradient(180deg,#fffaf4_0%,#fff8ef_100%)]">
        <div className="landing-zoom-80 mx-auto max-w-[1540px] px-5 py-16 md:px-8 lg:px-14 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,0.88fr)] lg:items-center">
            <div className="rounded-[36px] bg-white p-8 shadow-[0_26px_60px_rgba(240,167,62,0.12)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff0df] text-[#ff7a00]">
                  <Flame size={30} />
                </div>
                <div>
                  <div className="text-[2.1rem] font-black tracking-[-0.04em] text-[#ff6b00]">{landingText.streakTitle}</div>
                  <p className="mt-1 text-[1rem] font-medium text-[#7a849c]">{landingText.streakBody}</p>
                </div>
              </div>

              <div className="mt-9 grid grid-cols-7 gap-4">
                {landingText.streakDays.map((day, index) => (
                  <div key={day} className="text-center">
                    <div
                      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white ${
                        index === 6 ? 'bg-[#eaf6ff] text-[#91a2b9]' : index === 5 ? 'bg-[#ff6b00]' : 'bg-[#ffb347]'
                      }`}
                    >
                      {index === 6 ? <span className="text-[1rem] font-black">{day}</span> : <CheckCircle2 size={24} />}
                    </div>
                    <div className="mt-3 text-[0.95rem] font-bold text-[#90a0bb]">{day}</div>
                  </div>
                ))}
              </div>

              <div className="mt-10 border-t border-[#eef3f8] pt-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-[1.45rem] font-black text-[#1a2134]">
                    <Star size={21} className="fill-[#ffb347] text-[#ffb347]" />
                    {landingText.xpProgress}
                  </div>
                  <div className="text-[1.25rem] font-black text-[#91a0bb]">1,240 / 2,000</div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-[#fff2df]">
                  <div className="h-full w-[62%] rounded-full bg-[linear-gradient(90deg,#ffb347,#ff8b1f)]" />
                </div>
              </div>

              <div className="mt-10">
                <div className="text-[1.55rem] font-black text-[#1a2134]">{landingText.recentAchievements}</div>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: '第一节课', icon: Star, tone: 'bg-[#f2eaff] text-[#8b5cf6]' },
                    { label: '7 天连击', icon: Flame, tone: 'bg-[#fff0df] text-[#ff7a00]' },
                    { label: '测验达人', icon: Sparkles, tone: 'bg-[#e7fbf4] text-[#1cc9a2]' },
                    { label: '前 10%', icon: Trophy, tone: 'bg-[#fff5e6] text-[#ffb347]' },
                  ].map((item, index) => (
                    <div key={item.label} className="text-center">
                      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] ${item.tone}`}>
                        <item.icon size={28} />
                      </div>
                      <div className="mt-3 text-[0.95rem] font-bold text-[#64728d]">{landingText.recentAchievementLabels[index]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <SectionEyebrow tone="text-[#ff7a00]">{landingText.growthEyebrow}</SectionEyebrow>
              <h2 className="mt-4 text-[clamp(3rem,4.4vw,4.8rem)] font-black leading-[0.94] tracking-[-0.065em] text-[#101627]">
                {landingText.growthTitleTop}
                <br />
                {landingText.growthTitleBottom}
              </h2>
              <p className="mt-8 max-w-[38rem] text-[1.05rem] leading-9 text-[#67738d]">
                {landingText.growthBody}
              </p>

              <div className="mt-10 space-y-5">
                {growthFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex items-start gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${feature.iconClass}`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <div className="text-[1.8rem] font-black tracking-[-0.04em] text-[#141a2b]">{feature.title}</div>
                        <div className="mt-1 text-[1rem] font-medium text-[#6d7891]">{feature.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="community"
        className="bg-[radial-gradient(circle_at_50%_18%,rgba(79,188,255,0.24),rgba(79,188,255,0)_25%),linear-gradient(180deg,#1e7ced_0%,#1c6bd4_45%,#228ce7_100%)] text-white"
      >
        <div className="landing-zoom-80 mx-auto max-w-[1540px] px-5 py-16 text-center md:px-8 lg:px-14 lg:py-20">
          <SectionEyebrow tone="text-white/80">{landingText.communityEyebrow}</SectionEyebrow>
          <h2 className="mt-4 text-[clamp(3rem,4.4vw,4.9rem)] font-black leading-[0.96] tracking-[-0.065em] text-white">
            {landingText.communityTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-[60rem] text-[1.05rem] leading-9 text-white/84">
            {landingText.communityBody}
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {communityCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-[34px] border border-white/22 bg-white/12 px-8 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/14 text-white">
                    <Icon size={28} />
                  </div>
                  <h3 className="mt-6 text-[2rem] font-black tracking-[-0.04em]">{card.title}</h3>
                  <p className="mt-3 text-[1rem] font-medium text-white/80">{card.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-12">
            <Link
              to="/register"
              className="inline-flex h-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#2994ff,#23d1e5)] px-10 text-[1.15rem] font-black text-white shadow-[0_18px_38px_rgba(26,93,216,0.24)]"
            >
              {landingText.joinCommunity}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#eef3ff]">
        <div className="landing-zoom-80 mx-auto max-w-[1540px] px-5 py-16 md:px-8 lg:px-14 lg:py-20">
          <div className="text-center">
            <SectionEyebrow>{landingText.testimonialEyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-[clamp(3rem,4.4vw,4.9rem)] font-black leading-[0.96] tracking-[-0.065em] text-[#111627]">
              {landingText.testimonialTitle}
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="rounded-[34px] bg-white p-8 shadow-[0_22px_50px_rgba(135,163,213,0.10)]"
              >
                <div className="flex gap-1 text-[#ffaf45]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={18} className="fill-current text-current" />
                  ))}
                </div>
                <p className="mt-8 text-[1rem] leading-9 text-[#5d6882]">{item.quote}</p>
                <div className="mt-10 flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-[1.4rem] font-black ${item.tone}`}>
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-[1.55rem] font-black tracking-[-0.04em] text-[#161c2d]">{item.name}</div>
                    <div className="text-[1rem] font-medium text-[#77829a]">{item.title}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(90deg,#1d77ef,#27d0e7)] text-white">
        <div className="landing-zoom-80 mx-auto max-w-[1540px] px-5 py-16 text-center md:px-8 lg:px-14 lg:py-20">
          <h2 className="text-[clamp(3rem,4.5vw,4.8rem)] font-black leading-[0.96] tracking-[-0.065em]">
            {landingText.ctaTitleTop}
            <br />
            {landingText.ctaTitleBottom}
          </h2>
          <p className="mx-auto mt-6 max-w-[44rem] text-[1.1rem] leading-9 text-white/84">
            {landingText.ctaBody}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex h-14 items-center justify-center rounded-[18px] bg-white px-10 text-[1.15rem] font-black text-[#227ff0]"
            >
              {landingText.ctaPrimary}
            </Link>
            <Link
              to="/login"
              className="inline-flex h-14 items-center justify-center rounded-[18px] border-2 border-white px-10 text-[1.15rem] font-black text-white"
            >
              {landingText.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
