import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none',
        'ring-ring focus:ring-2 transition-shadow',
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none resize-y',
        'ring-ring focus:ring-2 transition-shadow min-h-[80px]',
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none',
        'ring-ring focus:ring-2 transition-shadow',
        props.className,
      )}
    />
  );
}
