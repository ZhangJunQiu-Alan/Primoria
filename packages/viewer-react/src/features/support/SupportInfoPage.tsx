import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { useAppSelector } from '@/shared/state/store';
import { getSettingsCopy, type SupportPageId } from '@/features/profile/settingsCopy';

export function SupportInfoPage({ page }: { page: SupportPageId }) {
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const copy = getSettingsCopy(language);
  const content = copy.supportPages[page];

  return (
    <PageContainer
      title={content.title}
      subtitle={content.subtitle}
      actions={
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--viewer-border)] bg-white/90 px-4 py-2 text-sm font-black text-[var(--viewer-text)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
        >
          <ArrowLeft size={16} />
          <span>{copy.common.backToSettings}</span>
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SurfaceCard className="space-y-4">
          {content.blocks.map((block) => (
            <div key={block.title} className="rounded-[20px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
              <h2 className="text-lg font-black text-[var(--viewer-text)]">{block.title}</h2>
              <p className="mt-2 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{block.body}</p>
            </div>
          ))}
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="rounded-[22px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--viewer-text-muted)]">
              {'Primoria Viewer'}
            </div>
            <div className="mt-3 text-2xl font-black text-[var(--viewer-text)]">{content.title}</div>
            <p className="mt-2 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{content.subtitle}</p>
          </div>

          <Link
            to="/settings"
            className="flex items-center justify-between rounded-[20px] border border-[var(--viewer-border)] px-5 py-4 text-sm font-black text-[var(--viewer-text)]"
          >
            <span>{copy.title}</span>
            <ExternalLink size={16} />
          </Link>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
