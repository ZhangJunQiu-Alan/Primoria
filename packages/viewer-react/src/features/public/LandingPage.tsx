import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  FileText,
  GraduationCap,
  MessageSquare,
  NotebookPen,
  PenTool,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicCopy } from '@/features/public/publicCopy';
import { useDocumentMeta } from '@/shared/i18n/documentMeta';
import { useCoreCopy } from '@/shared/theme/coreCopy';
import { publicAssetPath } from '@/shared/utils/publicAsset';

function SectionEyebrow({
  children,
  tone = 'text-[#8a5a2f]',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <p className={`text-[0.82rem] font-black uppercase tracking-[0.22em] ${tone}`}>{children}</p>;
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
      <h2 className="mt-4 text-[clamp(2.4rem,4vw,4.2rem)] font-black leading-[0.95] tracking-[-0.06em] text-[#152037]">
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
  const coreCopy = useCoreCopy();
  const copy = usePublicCopy();
  const landing = copy.landing;
  useDocumentMeta(copy.meta.landing);

  const navItems = [
    { id: 'start', label: landing.nav.start },
    { id: 'assistant', label: landing.nav.assistant },
    { id: 'community', label: landing.nav.community },
    { id: 'support', label: landing.nav.support },
  ] as const;

  const startIcons = [Compass, BookOpen, GraduationCap] as const;
  const assistantIcons = [MessageSquare, FileText, NotebookPen] as const;
  const communityIcons = [Users, MessageSquare, Sparkles, NotebookPen] as const;
  const supportIcons = [ShieldCheck, PenTool] as const;

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
                {coreCopy.brand.name}
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
        <div className="mx-auto grid max-w-[1540px] items-center gap-14 px-5 py-14 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:px-14 lg:py-20">
          <div className="landing-stage-enter relative z-10 max-w-[43rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cab9a0] bg-[rgba(255,248,238,0.9)] px-4 py-2 text-[0.84rem] font-black uppercase tracking-[0.18em] text-[#8a5a2f] shadow-[0_14px_32px_rgba(107,81,47,0.08)]">
              <Sparkles size={15} />
              <span>{landing.hero.announcement}</span>
            </div>

            <h1 className="mt-7 text-[clamp(3rem,5.8vw,5.6rem)] font-black leading-[0.9] tracking-[-0.075em] text-[#152037]">
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
              <Link
                to="/login"
                data-testid="landing-hero-secondary-cta"
                className="inline-flex min-w-[12rem] items-center justify-center rounded-[18px] border border-[#b8c6d8] bg-white/82 px-7 py-3.5 text-[1rem] font-black text-[#28415c] shadow-[0_12px_28px_rgba(39,61,91,0.08)] transition hover:border-[#8da3bb]"
              >
                {landing.hero.secondaryCta}
              </Link>
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
            <SurfaceCard className="overflow-hidden bg-[linear-gradient(160deg,rgba(14,35,59,0.96),rgba(28,74,114,0.92)_48%,rgba(80,122,108,0.88))] p-0 text-white shadow-[0_36px_90px_rgba(16,37,62,0.24)]">
              <img
                src={publicAssetPath('course-covers/physics-motion-forces-lab.svg')}
                alt="Primoria course cover"
                className="h-64 w-full object-cover"
              />
              <div className="space-y-5 p-6">
                <div>
                  <SectionEyebrow tone="text-[#cfe3ff]">{landing.start.noteTitle}</SectionEyebrow>
                  <h2 className="mt-3 text-[1.8rem] font-black tracking-[-0.05em] text-white">
                    {landing.authPanel.title}
                  </h2>
                  <p className="mt-4 text-[0.98rem] leading-7 text-white/78">{landing.start.noteBody}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {landing.start.noteChips.map((item) => (
                    <div key={item} className="rounded-full bg-white/10 px-4 py-2 text-[0.9rem] font-bold text-white/88">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section
        id="start"
        data-testid="landing-section-start"
        className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(255,250,244,0.82),rgba(248,244,236,0.72))]"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(520px,1.06fr)] lg:px-14 lg:py-20">
          <div>
            <SectionIntro eyebrow={landing.start.eyebrow} title={landing.start.title} subtitle={landing.start.subtitle} />
            <div className="mt-10 space-y-4">
              {landing.start.steps.map((step, index) => {
                const Icon = startIcons[index] ?? Sparkles;

                return (
                  <div key={step.title} className="landing-panel-hover rounded-[28px] border border-[#e4d8c7] bg-white/82 p-5 shadow-[0_20px_50px_rgba(52,64,92,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#edf4ff] text-[#245e99]">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">
                            {step.eyebrow}
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

          <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,244,236,0.92))]">
            <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">
              {landing.start.noteTitle}
            </p>
            <p className="mt-4 text-[1rem] leading-8 text-[#596375]">{landing.start.noteBody}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {landing.start.noteChips.map((item, index) => {
                const Icon = startIcons[index] ?? Sparkles;

                return (
                  <div key={item} className="rounded-[22px] border border-[#e8ddcf] bg-white/78 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f3ede3] text-[#26415e]">
                      <Icon size={18} />
                    </div>
                    <div className="mt-4 text-[1rem] font-black tracking-[-0.04em] text-[#152037]">{item}</div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section
        id="assistant"
        data-testid="landing-section-assistant"
        className="border-b border-black/5 bg-[linear-gradient(180deg,#11253b_0%,#163555_46%,#1d4a63_100%)] text-white"
      >
        <div className="mx-auto grid max-w-[1540px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(540px,1.08fr)] lg:px-14 lg:py-20">
          <div>
            <SectionEyebrow tone="text-[#b9d7ff]">{landing.assistant.eyebrow}</SectionEyebrow>
            <h2 className="mt-4 text-[clamp(2.4rem,4vw,4.2rem)] font-black leading-[0.95] tracking-[-0.06em] text-white">
              {landing.assistant.title}
            </h2>
            <p className="mt-6 max-w-[42rem] text-[1rem] leading-8 text-white/76 md:text-[1.05rem]">
              {landing.assistant.subtitle}
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {landing.assistant.cards.map((item, index) => {
                const Icon = assistantIcons[index] ?? Sparkles;

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
                  <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#b9d7ff]">{landing.assistant.cards[0].title}</p>
                  <div className="mt-1 text-[1.4rem] font-black tracking-[-0.04em] text-white">{landing.assistant.tools.join(' · ')}</div>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <div className="ml-auto max-w-[78%] rounded-[24px] bg-[linear-gradient(135deg,#8f68ff,#6c8fff)] px-5 py-4 text-[0.98rem] font-semibold leading-7 text-white shadow-[0_16px_36px_rgba(110,113,255,0.2)]">
                  {landing.assistant.samplePrompt}
                </div>
                <div className="max-w-[82%] rounded-[24px] bg-white/8 px-5 py-4 text-[0.96rem] leading-7 text-white/78 backdrop-blur">
                  {landing.assistant.sampleReply}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {landing.assistant.tools.map((tool) => (
                  <div key={tool} className="rounded-full bg-white/10 px-4 py-2 text-[0.88rem] font-bold text-white/84">
                    {tool}
                  </div>
                ))}
              </div>
            </div>
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
              {landing.community.cards.map((item, index) => (
                <IconCard
                  key={item.title}
                  icon={communityIcons[index] ?? Sparkles}
                  title={item.title}
                  description={item.description}
                  iconTone={
                    index === 0
                      ? 'bg-[#ddf5ea] text-[#2f7b68]'
                      : index === 1
                        ? 'bg-[#e2ecff] text-[#225a96]'
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
        id="support"
        data-testid="landing-section-support"
        className="bg-[linear-gradient(180deg,rgba(249,244,236,0.9),rgba(246,239,229,0.95))]"
      >
        <div className="mx-auto max-w-[1540px] px-5 py-16 md:px-8 lg:px-14 lg:py-20">
          <SectionIntro eyebrow={landing.support.eyebrow} title={landing.support.title} subtitle={landing.support.subtitle} />

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {landing.support.cards.map((item, index) => {
              const Icon = supportIcons[index] ?? Sparkles;

              return (
                <SurfaceCard key={item.title} className="bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(252,246,237,0.92))]">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${index === 0 ? 'bg-[#ddf5ea] text-[#2f7b68]' : 'bg-[#e2ecff] text-[#225a96]'}`}>
                    <Icon size={22} />
                  </div>
                  <p className="mt-5 text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#8a5a2f]">{item.eyebrow}</p>
                  <h3 className="mt-3 text-[1.35rem] font-black tracking-[-0.04em] text-[#152037]">{item.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-7 text-[#616b7e]">{item.description}</p>
                  <div className="mt-5 space-y-3">
                    {item.points.map((point) => (
                      <div key={point} className="flex items-start gap-3 rounded-[20px] border border-[#e6dccd] bg-white/72 px-4 py-4">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#2f7b68]" />
                        <p className="text-[0.95rem] font-semibold leading-7 text-[#576173]">{point}</p>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>

          <SurfaceCard className="mt-6 bg-[linear-gradient(135deg,#123b61,#245f8f)] text-white shadow-[0_24px_54px_rgba(24,63,107,0.2)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-[42rem]">
                <p className="text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#d4e5ff]">{landing.support.eyebrow}</p>
                <h2 className="mt-3 text-[2rem] font-black tracking-[-0.05em]">{landing.support.closingTitle}</h2>
                <p className="mt-4 text-[1rem] leading-8 text-white/78">{landing.support.closingBody}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex min-w-[12rem] items-center justify-center rounded-[18px] bg-white px-6 py-3 text-[0.96rem] font-black text-[#204a77] shadow-[0_18px_34px_rgba(7,19,35,0.16)]"
                >
                  {landing.support.primaryCta}
                </Link>
                <Link
                  to="/login"
                  className="inline-flex min-w-[10rem] items-center justify-center rounded-[18px] border border-white/20 bg-white/10 px-6 py-3 text-[0.96rem] font-black text-white"
                >
                  {landing.support.secondaryCta}
                </Link>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </main>
  );
}
