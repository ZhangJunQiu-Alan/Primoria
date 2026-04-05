import { cn } from '@/shared/utils/cn';

export function PageContainer({
  title,
  subtitle,
  actions,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6', className)}>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1
            className="viewer-botanical-heading text-[2.55rem] leading-none md:text-[3rem]"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-3xl text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
