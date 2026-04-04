import { cn } from '@/shared/utils/cn';

export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn('viewer-surface p-6', className)}>{children}</section>;
}

