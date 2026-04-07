import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

export function PublicLayout({
  title,
  subtitle,
  children,
  aside,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  const copy = useViewerCopy();

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/50 bg-slate-950/90 p-8 text-white shadow-2xl shadow-slate-900/20">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-black tracking-[0.24em] uppercase text-white">
              {copy.brand.name}
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher tone="dark" />
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                {copy.landing.authPanel.badge}
              </div>
            </div>
          </div>

          <div className="mt-14 max-w-xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              {copy.landing.eyebrow}
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
            <p className="text-base leading-7 text-slate-200">{subtitle}</p>
          </div>

          {aside ? <div className="mt-10">{aside}</div> : null}
        </section>

        <section
          className={cn(
            'viewer-surface flex items-center rounded-[32px] bg-white/95 p-6 backdrop-blur md:p-8',
            className,
          )}
        >
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
}
