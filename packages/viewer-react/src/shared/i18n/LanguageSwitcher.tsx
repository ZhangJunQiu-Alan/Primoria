import { Globe } from 'lucide-react';
import { patchPreferences } from '@/shared/state/preferencesSlice';
import { useAppDispatch } from '@/shared/state/store';
import { cn } from '@/shared/utils/cn';
import { type ViewerLanguage } from '@/shared/i18n/locale';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useViewerCopy } from '@/shared/theme/copy';

const options: ViewerLanguage[] = ['zh-CN', 'en'];

export function LanguageSwitcher({
  className,
  tone = 'viewer',
  showLabel = false,
}: {
  className?: string;
  tone?: 'viewer' | 'public' | 'dark' | 'home';
  showLabel?: boolean;
}) {
  const dispatch = useAppDispatch();
  const language = useProductLanguage();
  const copy = useViewerCopy();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border p-1',
        tone === 'viewer' && 'border-[var(--viewer-border)] bg-[rgba(255,252,247,0.86)] text-[var(--viewer-text)]',
        tone === 'public' && 'border-[#cfe0f0] bg-white/90 text-[#41516d] shadow-[0_10px_22px_rgba(32,72,126,0.08)]',
        tone === 'dark' && 'border-white/15 bg-white/10 text-white',
        tone === 'home' &&
          'border-[#e5c9a8] bg-[linear-gradient(135deg,rgba(247,233,210,0.94)_0%,rgba(239,216,184,0.9)_100%)] text-[#8d6438] shadow-[0_14px_26px_rgba(196,149,106,0.16)]',
        className,
      )}
      aria-label={copy.language.label}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          tone === 'dark' ? 'text-white/78' : tone === 'home' ? 'text-[#9b754a]' : 'text-current/70',
        )}
        aria-hidden="true"
      >
        <Globe size={15} />
      </span>
      {showLabel ? <span className="pr-1 text-xs font-bold">{copy.language.label}</span> : null}
      {options.map((option) => {
        const active = option === language;
        return (
          <button
            key={option}
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-black transition',
              active && tone === 'viewer' && 'bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white shadow-[0_10px_20px_rgba(122,158,126,0.18)]',
              active && tone === 'public' && 'bg-[linear-gradient(135deg,#157df7,#24d1e7)] text-white shadow-[0_12px_22px_rgba(29,143,244,0.2)]',
              active && tone === 'dark' && 'bg-white text-[#0f1324]',
              active && tone === 'home' && 'bg-white text-[#6f5130] shadow-[0_10px_18px_rgba(120,84,44,0.14)]',
              !active && tone !== 'dark' && 'text-inherit hover:bg-black/5',
              !active && tone === 'dark' && 'text-white/72 hover:bg-white/10',
              !active && tone === 'home' && 'text-[#8d6438] hover:bg-white/35',
            )}
            onClick={() => dispatch(patchPreferences({ language: option }))}
          >
            {option === 'zh-CN' ? copy.language.zh : copy.language.en}
          </button>
        );
      })}
    </div>
  );
}
