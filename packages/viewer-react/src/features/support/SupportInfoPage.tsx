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
          className="viewer-botanical-button viewer-botanical-button--secondary"
        >
          <ArrowLeft size={16} />
          <span>{copy.common.backToSettings}</span>
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SurfaceCard className="space-y-4">
          {content.blocks.map((block) => (
            <div key={block.title} className="rounded-[20px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] p-5">
              <h2 className="text-[1.7rem] font-semibold text-[var(--viewer-text)]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{block.title}</h2>
              <p className="mt-2 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{block.body}</p>
            </div>
          ))}
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div className="rounded-[22px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] p-5">
            <div className="viewer-botanical-eyebrow">
              {copy.title}
            </div>
            <div className="mt-3 text-[2rem] font-semibold text-[var(--viewer-text)]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{content.title}</div>
            <p className="mt-2 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{content.subtitle}</p>
          </div>

          <Link
            to="/settings"
            className="flex items-center justify-between rounded-[20px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] px-5 py-4 text-sm font-black text-[var(--viewer-text)]"
          >
            <span>{copy.title}</span>
            <ExternalLink size={16} />
          </Link>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
