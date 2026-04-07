import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  FileCheck2,
  Flame,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  NotebookPen,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Upload,
  Users,
  WandSparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { useViewerCopy } from '@/shared/theme/copy';
import { publicAssetPath } from '@/shared/utils/publicAsset';

function SectionEyebrow({
  children,
  tone = 'text-[#8a5a2f]',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <p className={`text-[0.84rem] font-black uppercase tracking-[0.22em] ${tone}`}>{children}</p>;
}

function SectionIntro({
  eyebrow,
  title,
  subtitle,
  tone = 'text-[#5c6578]',
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  tone?: string;
}) {
  return (
    <div className="max-w-[44rem]">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="mt-4 text-[clamp(2.5rem,4vw,4.45rem)] font-black leading-[0.95] tracking-[-0.06em] text-[#152037]">
        {title}
      </h2>
      <p className={`mt-6 text-[1rem] leading-8 md:text-[1.05rem] ${tone}`}>{subtitle}</p>
    </div>
  );
}

function SurfaceCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`landing-panel-hover rounded-[30px] border border-black/5 bg-white/82 p-6 shadow-[0_24px_60px_rgba(52,64,92,0.08)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function IconCard({
  icon: Icon,
  title,
  description,
  eyebrow,
  className = '',
  iconTone = 'bg-[#edf4ff] text-[#2563eb]',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  className?: string;
  iconTone?: string;
}) {
  return (
    <SurfaceCard className={className}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${iconTone}`}>
        <Icon size={22} />
      </div>
      {eyebrow ? <p className="mt-5 text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">{eyebrow}</p> : null}
      <h3 className="mt-3 text-[1.35rem] font-black tracking-[-0.04em] text-[#152037]">{title}</h3>
      <p className="mt-3 text-[0.98rem] leading-7 text-[#616b7e]">{description}</p>
    </SurfaceCard>
  );
}

export function LandingPage() {
  const copy = useViewerCopy();
  const landing = copy.landing;

  const navItems = [
    { id: 'product', label: landing.nav.product },
    { id: 'learner', label: landing.nav.learner },
    { id: 'tutor', label: landing.nav.tutor },
    { id: 'community', label: landing.nav.community },
    { id: 'builder', label: landing.nav.builder },
    { id: 'family', label: landing.nav.family },
  ] as const;

  const heroCardIcons = [LayoutDashboard, GraduationCap, Bot, ShieldCheck] as const;
  const platformIcons = [LayoutDashboard, GraduationCap, ShieldCheck] as const;
  const foundationIcons = [LockKeyhole, Blocks, Languages, Sparkles] as const;
  const learnerStepIcons = [Compass, BookOpen, Blocks, Trophy] as const;
  const tutorIcons = [MessageSquare, LockKeyhole, WandSparkles, Upload] as const;
  const communityIcons = [MessageSquare, Users, BarChart3, NotebookPen] as const;
  const growthIcons = [Star, Flame, Trophy, Settings2] as const;
  const familyIcons = [ShieldCheck, Users, FileCheck2] as const;
  const dashboardIcons = [LayoutDashboard, Compass, BarChart3, Users] as const;
  const atlasIcons = [LockKeyhole, Languages, Settings2, ShieldCheck, Trophy, Blocks, Sparkles, FileCheck2] as const;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f7f1e7_0%,#f3ecdf_22%,#f8f4ee_52%,#efe8dc_100%)] text-[#152037]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[rgba(247,241,231,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-6 px-5 py-4 md:px-8 lg:px-14">
          <div className="flex min-w-0 items-center gap-5">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-[#10253e] shadow-[0_18px_34px_rgba(17,37,62,0.18)]">
                <img src={publicAssetPath('primoria-logo.png')} alt="Primoria" className="h-full w-full object-cover" />
              </span>
              <span className="text-[1.3rem] font-black uppercase tracking-[0.14em] text-[#1e5f9c] md:text-[1.55rem]">
                {copy.brand.name}
              </span>
            </Link>

            <nav className="hidden items-center gap-7 text-[0.94rem] font-bold text-[#495466] xl:flex">
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="transition hover:text-[#173f69]">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher tone="public" />
            <Link
              to="/login"
              data-testid="landing-header-login"
              className="hidden h-11 items-center justify-center rounded-[16px] border border-[#b8c6d8] bg-white/86 px-5 text-[0.94rem] font-black text-[#28415c] shadow-[0_10px_24px_rgba(39,61,91,0.06)] transition hover:border-[#8da3bb] md:inline-flex"
            >
              {landing.header.loginCta}
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#123b61,#2a7fc8)] px-5 text-[0.94rem] font-black text-white shadow-[0_18px_34px_rgba(25,71,117,0.22)] transition hover:translate-y-[-1px]"
            >
              {landing.header.registerCta}
            </Link>
          </div>
        </div>
      </header>

      <section
        data-testid="landing-section-hero"
        className="relative isolate overflow-hidden border-b border-black/5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(33,102,181,0.16),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(180,115,65,0.17),transparent_24%),radial-gradient(circle_at_66%_84%,rgba(82,151,128,0.14),transparent_24%)]" />
        <div className="mx-auto grid max-w-[1540px] items-center gap-14 px-5 py-14 md:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(540px,1.08fr)] lg:px-14 lg:py-20">
          <div className="landing-stage-enter relative z-10 max-w-[44rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cab9a0] bg-[rgba(255,248,238,0.9)] px-4 py-2 text-[0.84rem] font-black uppercase tracking-[0.18em] text-[#8a5a2f] shadow-[0_14px_32px_rgba(107,81,47,0.08)]">
              <WandSparkles size={15} />
              <span>{landing.hero.announcement}</span>
            </div>

            <h1 className="mt-7 text-[clamp(3rem,5.8vw,5.85rem)] font-black leading-[0.9] tracking-[-0.075em] text-[#152037]">
              <span className="block">{landing.hero.title}</span>
              <span className="block bg-[linear-gradient(135deg,#8f5d34,#1b5f98)] bg-clip-text text-transparent">
                {landing.hero.accentTitle}
              </span>
            </h1>

            <p className="mt-8 max-w-[39rem] text-[1rem] leading-8 text-[#556174] md:text-[1.08rem]">
              {landing.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                data-testid="landing-hero-primary-cta"
                className="inline-flex min-w-[13rem] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#123b61,#2a7fc8)] px-7 py-3.5 text-[1rem] font-black text-white shadow-[0_20px_38px_rgba(25,71,117,0.22)] transition hover:translate-y-[-1px]"
              >
                {landing.hero.primaryCta}
              </Link>
              <a
                href="#product"
                className="inline-flex min-w-[12rem] items-center justify-center rounded-[18px] border border-[#b8c6d8] bg-white/82 px-7 py-3.5 text-[1rem] font-black text-[#28415c] shadow-[0_12px_28px_rgba(39,61,91,0.08)] transition hover:border-[#8da3bb]"
              >
                {landing.hero.secondaryCta}
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {landing.hero.trustSignals.map((signal) => (
                <div key={signal} className="flex items-start gap-3 rounded-[20px] border border-[#ddd1bf] bg-white/70 px-4 py-4 text-[0.94rem] font-semibold text-[#4f5b6d] shadow-[0_12px_28px_rgba(43,56,83,0.06)]">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#2f7b68]" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-stage-enter landing-stage-enter-delay-1 relative z-10">
            <div className="relative overflow-hidden rounded-[40px] border border-[rgba(20,32,55,0.08)] bg-[linear-gradient(160deg,rgba(14,35,59,0.96),rgba(28,74,114,0.92)_48%,rgba(80,122,108,0.88))] p-5 shadow-[0_36px_90px_rgba(16,37,62,0.24)] md:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_82%_26%,rgba(246,189,96,0.24),transparent_28%),radial-gradient(circle_at_62%_82%,rgba(113,203,177,0.18),transparent_28%)]" />

              <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#b9d7ff]">{landing.eyebrow}</p>
                      <h2 className="mt-2 text-[1.35rem] font-black tracking-[-0.04em] text-white">{landing.platform.title}</h2>
                    </div>
                    <div className="rounded-full bg-white/12 px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.18em] text-white/78">
                      {landing.hero.cards[0].title}
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/8">
                    <img
                      src={publicAssetPath('course-covers/physics-motion-forces-lab.svg')}
                      alt="Primoria course cover"
                      className="h-48 w-full object-cover"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-white/10 p-4 text-white/88">
                      <div className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#d5e6ff]">
                        {landing.learner.steps[2].route}
                      </div>
                      <div className="mt-2 text-[1.15rem] font-black tracking-[-0.04em]">
                        {landing.learner.steps[2].title}
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/15">
                        <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#f3d29f,#7cd6cf)]" />
                      </div>
                    </div>
                    <div className="rounded-[22px] bg-white/10 p-4 text-white/88">
                      <div className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#d5e6ff]">
                        {landing.learner.steps[3].route}
                      </div>
                      <div className="mt-2 text-[1.15rem] font-black tracking-[-0.04em]">
                        {landing.growth.cards[0].title}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-[0.9rem] font-semibold">
                        <Star size={15} className="text-[#ffd17b]" />
                        <span>XP + Achievement loop</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  {landing.hero.cards.map((card, index) => {
                    const Icon = heroCardIcons[index] ?? Sparkles;
                    const tones = [
                      'bg-[#d8eaff] text-[#205e9c]',
                      'bg-[#fff0d9] text-[#9f5a1c]',
                      'bg-[#efe3ff] text-[#6f45d2]',
                      'bg-[#ddf5ea] text-[#2f7b68]',
                    ] as const;

                    return (
                      <div
                        key={card.title}
                        className={`landing-panel-hover viewer-float-${index % 2 === 0 ? 'slow' : 'medium'} rounded-[26px] border border-white/10 bg-white/10 p-5 text-white shadow-[0_18px_44px_rgba(5,18,34,0.16)] backdrop-blur`}
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${tones[index] ?? tones[0]}`}>
                          <Icon size={20} />
                        </div>
                        <p className="mt-4 text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#d2e4ff]">
                          {card.eyebrow}
                        </p>
                        <div className="mt-2 text-[1.18rem] font-black tracking-[-0.04em] text-white">{card.title}</div>
                        <p className="mt-2 text-[0.92rem] leading-6 text-white/78">{card.meta}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="product"
        data-testid="landing-section-product"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(255,250,244,0.82),rgba(248,244,236,0.72))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(480px,1.04fr)] lg:px-14 lg:py-20">
          <SectionIntro eyebrow={landing.platform.eyebrow} title={landing.platform.title} subtitle={landing.platform.subtitle} />

          <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,244,236,0.92))]">
            <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">
              Shared foundations
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {landing.platform.foundations.map((item, index) => {
                const Icon = foundationIcons[index] ?? Sparkles;
                return (
                  <div key={item} className="flex items-start gap-3 rounded-[20px] border border-[#e6dccd] bg-white/72 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f3ede3] text-[#26415e]">
                      <Icon size={18} />
                    </div>
                    <p className="text-[0.95rem] font-semibold leading-7 text-[#576173]">{item}</p>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>
        </div>

        <div className="mx-auto grid max-w-[1540px] gap-5 px-5 pb-16 md:px-8 lg:grid-cols-3 lg:px-14 lg:pb-20">
          {landing.platform.lanes.map((lane, index) => (
            <IconCard
              key={lane.title}
              icon={platformIcons[index] ?? Sparkles}
              eyebrow={lane.eyebrow}
              title={lane.title}
              description={lane.description}
              iconTone={
                index === 0
                  ? 'bg-[#e2ecff] text-[#225a96]'
                  : index === 1
                    ? 'bg-[#fff1de] text-[#a35e1d]'
                    : 'bg-[#ddf5ea] text-[#2f7b68]'
              }
            />
          ))}
        </div>
      </section>

      <section
        id="learner"
        data-testid="landing-section-learner"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(249,244,236,0.76),rgba(247,240,230,0.96))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(500px,1.1fr)] lg:px-14 lg:py-20">
          <div>
            <SectionIntro eyebrow={landing.learner.eyebrow} title={landing.learner.title} subtitle={landing.learner.subtitle} />
            <div className="mt-10 space-y-4">
              {landing.learner.steps.map((step, index) => {
                const Icon = learnerStepIcons[index] ?? Sparkles;
                return (
                  <div key={step.route} className="landing-panel-hover rounded-[28px] border border-[#e4d8c7] bg-white/82 p-5 shadow-[0_20px_50px_rgba(52,64,92,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#edf4ff] text-[#245e99]">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">
                            {step.step}
                          </div>
                          <h3 className="mt-2 text-[1.3rem] font-black tracking-[-0.04em] text-[#152037]">{step.title}</h3>
                        </div>
                      </div>
                      <div className="rounded-full border border-[#dfd3c1] bg-[#f8f1e6] px-3 py-1 text-[0.78rem] font-black text-[#6a5948]">
                        {step.route}
                      </div>
                    </div>
                    <p className="mt-4 text-[0.98rem] leading-7 text-[#616b7e]">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <SurfaceCard className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(252,246,237,0.92))] p-0">
              <img
                src={publicAssetPath('course-covers/python-debugging-studio.svg')}
                alt="Learner course surface"
                className="h-56 w-full object-cover"
              />
              <div className="p-6">
                <div className="rounded-full border border-[#e1d5c5] bg-[#f7efe2] px-3 py-1 text-[0.75rem] font-black uppercase tracking-[0.18em] text-[#7b5f45]">
                  {landing.learner.sideTitle}
                </div>
                <p className="mt-4 text-[1rem] leading-8 text-[#596375]">{landing.learner.sideBody}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {landing.learner.sideHighlights.map((highlight) => (
                    <div key={highlight} className="rounded-full bg-[#153b61] px-4 py-2 text-[0.9rem] font-bold text-white shadow-[0_12px_26px_rgba(21,59,97,0.14)]">
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-5 md:grid-cols-2">
              <SurfaceCard className="bg-[linear-gradient(180deg,rgba(20,32,55,0.95),rgba(24,55,87,0.92))] text-white">
                <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#cfe3ff]">Lesson Runtime</p>
                <div className="mt-4 text-[1.6rem] font-black tracking-[-0.05em]">Prev · Check · Next</div>
                <p className="mt-3 text-[0.96rem] leading-7 text-white/76">{landing.learner.steps[2].description}</p>
              </SurfaceCard>

              <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,247,232,0.95),rgba(255,240,213,0.92))]">
                <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#9a5f1b]">Result Loop</p>
                <div className="mt-4 text-[1.6rem] font-black tracking-[-0.05em] text-[#6b4315]">XP · Progress · Achievements</div>
                <p className="mt-3 text-[0.96rem] leading-7 text-[#7b5f45]">{landing.learner.steps[3].description}</p>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </section>

      <section
        id="tutor"
        data-testid="landing-section-tutor"
        className="border-b border-black/5 bg-[linear-gradient(180deg,#11253b_0%,#163555_46%,#1d4a63_100%)] text-white"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(540px,1.08fr)] lg:px-14 lg:py-20">
          <div>
            <SectionEyebrow tone="text-[#b9d7ff]">{landing.tutor.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-[clamp(2.5rem,4vw,4.45rem)] font-black leading-[0.95] tracking-[-0.06em] text-white">
              {landing.tutor.title}
            </h2>
            <p className="mt-6 max-w-[42rem] text-[1rem] leading-8 text-white/76 md:text-[1.05rem]">
              {landing.tutor.subtitle}
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {landing.tutor.capabilities.map((item, index) => {
                const Icon = tutorIcons[index] ?? Sparkles;

                return (
                  <div key={item.title} className="landing-panel-hover rounded-[26px] border border-white/10 bg-white/7 p-5 backdrop-blur">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/12 text-white">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-[1.2rem] font-black tracking-[-0.04em] text-white">{item.title}</h3>
                    <p className="mt-3 text-[0.96rem] leading-7 text-white/74">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <div className="landing-stage-enter landing-stage-enter-delay-2 rounded-[34px] border border-white/10 bg-[rgba(8,17,31,0.42)] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.22)] backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#9464ff,#6792ff)] text-white">
                  <Bot size={21} />
                </div>
                <div>
                  <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#b9d7ff]">AI Tutor Desk</p>
                  <div className="mt-1 text-[1.4rem] font-black tracking-[-0.04em] text-white">{landing.tutor.tools.join(' · ')}</div>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <div className="ml-auto max-w-[78%] rounded-[24px] bg-[linear-gradient(135deg,#8f68ff,#6c8fff)] px-5 py-4 text-[0.98rem] font-semibold leading-7 text-white shadow-[0_16px_36px_rgba(110,113,255,0.2)]">
                  {landing.tutor.conversation[0]}
                </div>
                <div className="max-w-[82%] rounded-[24px] bg-white/8 px-5 py-4 text-[0.96rem] leading-7 text-white/78 backdrop-blur">
                  {landing.tutor.conversation[1]}
                </div>
                <div className="max-w-[72%] rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-5 py-4 text-[0.96rem] leading-7 text-white/72">
                  {landing.tutor.conversation[2]}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {landing.tutor.tools.map((tool) => (
                  <div key={tool} className="rounded-full bg-white/10 px-4 py-2 text-[0.88rem] font-bold text-white/84">
                    {tool}
                  </div>
                ))}
              </div>
            </div>

            <SurfaceCard className="bg-white/10 text-white backdrop-blur">
              <p className="text-[0.86rem] font-semibold leading-7 text-white/78">{landing.tutor.footer}</p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section
        id="community"
        data-testid="landing-section-community"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(239,247,243,0.94),rgba(231,241,236,0.92))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)] lg:px-14 lg:py-20">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(120,180,156,0.25),transparent_62%)]" />
            <img
              src={publicAssetPath('Community_plant..png')}
              alt="Community visual"
              className="viewer-float-slow relative z-10 w-full max-w-[30rem] drop-shadow-[0_26px_60px_rgba(75,110,94,0.18)]"
            />
          </div>

          <div>
            <SectionIntro eyebrow={landing.community.eyebrow} title={landing.community.title} subtitle={landing.community.subtitle} />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {landing.community.pillars.map((item, index) => (
                <IconCard
                  key={item.title}
                  icon={communityIcons[index] ?? Sparkles}
                  title={item.title}
                  description={item.description}
                  iconTone={
                    index === 0
                      ? 'bg-[#e2ecff] text-[#225a96]'
                      : index === 1
                        ? 'bg-[#ddf5ea] text-[#2f7b68]'
                        : index === 2
                          ? 'bg-[#fff1de] text-[#a35e1d]'
                          : 'bg-[#f0e5ff] text-[#6f45d2]'
                  }
                />
              ))}
            </div>

            <SurfaceCard className="mt-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,253,250,0.88))]">
              <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#5a7d69]">{landing.community.noteTitle}</p>
              <p className="mt-4 text-[1rem] leading-8 text-[#596375]">{landing.community.noteBody}</p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section
        id="family"
        data-testid="landing-section-family"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(249,244,236,0.9),rgba(246,239,229,0.95))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:px-14 lg:py-20">
          <div>
            <SectionIntro eyebrow={landing.growth.eyebrow} title={landing.growth.title} subtitle={landing.growth.subtitle} />

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {landing.growth.cards.map((item, index) => (
                <IconCard
                  key={item.title}
                  icon={growthIcons[index] ?? Sparkles}
                  title={item.title}
                  description={item.description}
                  iconTone={
                    index === 0
                      ? 'bg-[#fff3d8] text-[#a45c1a]'
                      : index === 1
                        ? 'bg-[#ffe5d3] text-[#d65a16]'
                        : index === 2
                          ? 'bg-[#efe3ff] text-[#6f45d2]'
                          : 'bg-[#e2ecff] text-[#225a96]'
                  }
                />
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,248,237,0.9))]">
                <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">Achievement Wall</p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {landing.growth.achievementLabels.map((label, index) => (
                    <div key={label} className="rounded-[22px] border border-[#e8ddcf] bg-white/78 p-4 text-center">
                      <img
                        src={publicAssetPath(
                          index === 0
                            ? 'achievements/first_lesson.png'
                            : index === 1
                              ? 'achievements/hot_streak.png'
                              : index === 2
                                ? 'achievements/perfect_score.png'
                                : 'achievements/study_buddy.png',
                        )}
                        alt={label}
                        className="mx-auto h-16 w-16 object-contain"
                      />
                      <div className="mt-3 text-[0.84rem] font-bold leading-6 text-[#5a6375]">{label}</div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <div className="space-y-4">
                {landing.growth.accountCards.map((item) => (
                  <SurfaceCard key={item.title}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf4ff] text-[#245e99]">
                      <Settings2 size={20} />
                    </div>
                    <h3 className="mt-4 text-[1.18rem] font-black tracking-[-0.04em] text-[#152037]">{item.title}</h3>
                    <p className="mt-3 text-[0.95rem] leading-7 text-[#616b7e]">{item.description}</p>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <SectionIntro eyebrow={landing.family.eyebrow} title={landing.family.title} subtitle={landing.family.subtitle} />
            {landing.family.cards.map((item, index) => (
              <IconCard
                key={item.title}
                icon={familyIcons[index] ?? ShieldCheck}
                title={item.title}
                description={item.description}
                iconTone={
                  index === 0
                    ? 'bg-[#e2ecff] text-[#225a96]'
                    : index === 1
                      ? 'bg-[#ddf5ea] text-[#2f7b68]'
                      : 'bg-[#fff1de] text-[#a35e1d]'
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="builder"
        data-testid="landing-section-builder-dashboard"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(244,239,232,0.96),rgba(237,230,220,0.96))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(520px,1.06fr)] lg:px-14 lg:py-20">
          <div>
            <SectionIntro eyebrow={landing.builderDashboard.eyebrow} title={landing.builderDashboard.title} subtitle={landing.builderDashboard.subtitle} />

            <div className="mt-8 flex flex-wrap gap-3">
              {landing.builderDashboard.strips.map((strip) => (
                <div key={strip} className="rounded-full border border-[#d7cab6] bg-white/78 px-4 py-2 text-[0.9rem] font-bold text-[#4f5b6d] shadow-[0_10px_20px_rgba(48,58,78,0.06)]">
                  {strip}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {landing.builderDashboard.tabs.map((item, index) => (
              <IconCard
                key={item.title}
                icon={dashboardIcons[index] ?? Sparkles}
                title={item.title}
                description={item.description}
                iconTone={
                  index === 0
                    ? 'bg-[#e2ecff] text-[#225a96]'
                    : index === 1
                      ? 'bg-[#fff1de] text-[#a35e1d]'
                      : index === 2
                        ? 'bg-[#efe3ff] text-[#6f45d2]'
                        : 'bg-[#ddf5ea] text-[#2f7b68]'
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section
        data-testid="landing-section-builder-editor"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(250,246,240,0.92),rgba(245,238,229,0.98))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:px-14 lg:py-20">
          <div>
            <SectionIntro eyebrow={landing.builderEditor.eyebrow} title={landing.builderEditor.title} subtitle={landing.builderEditor.subtitle} />

            <div className="mt-10 overflow-hidden rounded-[34px] border border-[#ddd1bf] bg-[linear-gradient(180deg,#fffdf8,#f8f1e5)] shadow-[0_26px_64px_rgba(52,64,92,0.08)]">
              <div className="flex items-center justify-between border-b border-[#e7dccd] px-5 py-4">
                <div>
                  <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">Editor Surface</p>
                  <div className="mt-1 text-[1.2rem] font-black tracking-[-0.04em] text-[#152037]">Blocks · Preview · Schema</div>
                </div>
                <div className="rounded-full bg-[#153b61] px-3 py-1 text-[0.78rem] font-black text-white">Learner Preview</div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(260px,0.88fr)_minmax(0,1.12fr)]">
                <div className="space-y-3">
                  {landing.builderEditor.capabilities.slice(0, 4).map((item) => (
                    <div key={item} className="rounded-[18px] border border-[#e7dccd] bg-white/82 px-4 py-4 text-[0.94rem] font-semibold text-[#5c6578]">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-[#e7dccd] bg-white/88 p-5">
                  <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">{landing.builderEditor.previewTitle}</p>
                  <p className="mt-4 text-[0.98rem] leading-7 text-[#616b7e]">{landing.builderEditor.previewBody}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {landing.builderEditor.blockTypes.map((type) => (
                      <div key={type} className="rounded-full bg-[#153b61] px-4 py-2 text-[0.86rem] font-bold text-white shadow-[0_12px_24px_rgba(21,59,97,0.14)]">
                        {type}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    {landing.builderEditor.schema.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-[18px] bg-[#f8f1e6] px-4 py-4 text-[0.94rem] leading-7 text-[#5f687a]">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5d7c3] text-[#6c553b]">
                          <CheckCircle2 size={14} />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {landing.builderEditor.capabilities.map((item, index) => (
              <IconCard
                key={item}
                icon={
                  index === 0 ? Blocks
                  : index === 1 ? WandSparkles
                  : index === 2 ? Upload
                  : index === 3 ? Sparkles
                  : index === 4 ? FileCheck2
                  : BookOpen
                }
                title={item}
                description={index < landing.builderEditor.capabilities.length - 1 ? landing.builderEditor.previewBody : landing.builderEditor.subtitle}
                iconTone={
                  index % 3 === 0
                    ? 'bg-[#e2ecff] text-[#225a96]'
                    : index % 3 === 1
                      ? 'bg-[#fff1de] text-[#a35e1d]'
                      : 'bg-[#ddf5ea] text-[#2f7b68]'
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section
        data-testid="landing-section-feature-atlas"
        className="bg-[linear-gradient(180deg,rgba(239,233,223,0.92),rgba(247,241,231,0.98))]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-16 md:px-8 lg:px-14 lg:py-20">
          <SectionIntro eyebrow={landing.featureAtlas.eyebrow} title={landing.featureAtlas.title} subtitle={landing.featureAtlas.subtitle} />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {landing.featureAtlas.items.map((item, index) => {
              const Icon = atlasIcons[index] ?? Sparkles;

              return (
                <SurfaceCard key={item}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf4ff] text-[#245e99]">
                    <Icon size={20} />
                  </div>
                  <div className="mt-4 text-[1rem] font-bold leading-7 text-[#4e5a6d]">{item}</div>
                </SurfaceCard>
              );
            })}
          </div>

          <div
            data-testid="landing-section-final-cta"
            className="mt-10 overflow-hidden rounded-[36px] border border-[#d7cab6] bg-[linear-gradient(135deg,#133b61,#275f8d_42%,#5c8662)] px-6 py-10 text-white shadow-[0_32px_70px_rgba(20,46,75,0.2)] md:px-10"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <SectionEyebrow tone="text-white/72">{landing.eyebrow}</SectionEyebrow>
                <h2 className="mt-4 text-[clamp(2.2rem,4vw,4rem)] font-black leading-[0.95] tracking-[-0.06em] text-white">
                  {landing.finalCta.title}
                </h2>
                <p className="mt-5 max-w-[42rem] text-[1rem] leading-8 text-white/78">
                  {landing.finalCta.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center justify-center rounded-[18px] bg-white px-6 text-[0.98rem] font-black text-[#1b4c77] shadow-[0_16px_30px_rgba(255,255,255,0.16)]"
                >
                  {landing.finalCta.primaryCta}
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center justify-center rounded-[18px] border border-white/28 px-6 text-[0.98rem] font-black text-white"
                >
                  {landing.finalCta.secondaryCta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
