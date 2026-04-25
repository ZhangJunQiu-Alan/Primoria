import { PageContainer } from '@/shared/layout/PageContainer';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useSettingsPageModel } from '@/features/profile/hooks/useSettingsPageModel';
import {
  AssistantSettingsSection,
  FamilySettingsSection,
  NoticeBanner,
  ProfileSettingsSection,
  SettingsSectionNav,
  StudySettingsSection,
  SupportSettingsSection,
} from '@/features/profile/components/SettingsSections';

export function SettingsPage() {
  const model = useSettingsPageModel();
  const { copy, notice, activeSection, setActiveSection, settingsQuery } = model;

  if (settingsQuery.isLoading) {
    return (
      <PageContainer title={copy.title} subtitle={copy.subtitle}>
        <LoadingStateCard />
      </PageContainer>
    );
  }

  if (settingsQuery.error || !settingsQuery.data) {
    return (
      <PageContainer title={copy.title} subtitle={copy.subtitle}>
        <ErrorStateCard
          message={settingsQuery.error instanceof Error ? settingsQuery.error.message : undefined}
          onRetry={() => void settingsQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={copy.title} subtitle={copy.subtitle} className="max-w-[1280px] pb-10">
      {notice ? <NoticeBanner notice={notice} /> : null}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <SettingsSectionNav
            copy={copy}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        </aside>

        <div className="space-y-6">
          {activeSection === 'profile' ? <ProfileSettingsSection model={model} /> : null}
          {activeSection === 'study' ? <StudySettingsSection model={model} /> : null}
          {activeSection === 'assistant' ? <AssistantSettingsSection model={model} /> : null}
          {activeSection === 'family' ? <FamilySettingsSection model={model} /> : null}
          {activeSection === 'support' ? <SupportSettingsSection model={model} /> : null}
        </div>
      </div>
    </PageContainer>
  );
}
