import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BookAudio,
  BrushCleaning,
  CircleUserRound,
  ExternalLink,
  Globe,
  GraduationCap,
  Languages,
  LayoutTemplate,
  MoonStar,
  Shield,
  Sparkles,
  SunMedium,
  UserRoundCog,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, setSession } from '@/features/auth/authSlice';
import { getSettingsCopy, settingsSectionOrder, type SettingsSectionId } from '@/features/profile/settingsCopy';
import { generateChildBindingCode } from '@/shared/api/viewer/parentApi';
import { fetchViewerSettings, saveAccountSystemSettings, saveProfileSettings } from '@/shared/api/viewer/settingsApi';
import { supabase } from '@/shared/api/supabase';
import { disableViewerPushNotifications, enableViewerPushNotifications, clearViewerLocalCache } from '@/shared/api/viewer/pushApi';
import { formatViewerDateTime, formatViewerMonthYear } from '@/shared/i18n/format';
import type { ViewerLanguage } from '@/shared/i18n/locale';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { patchPreferences, type ViewerPreferencesState } from '@/shared/state/preferencesSlice';
import { useAppDispatch, useAppSelector } from '@/shared/state/store';
import { clearDemoRole, seedDemoRole } from '@/shared/utils/demoMode';
import { cn } from '@/shared/utils/cn';
import { isParentRole, learnerHomeForRole } from '@/shared/utils/routes';

const VIEWER_VERSION = '0.1.0';

type NoticeState = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

const sectionIcons: Record<SettingsSectionId, ReactNode> = {
  account: <CircleUserRound size={18} />,
  appearance: <LayoutTemplate size={18} />,
  learning: <GraduationCap size={18} />,
  notifications: <Bell size={18} />,
  privacy: <Shield size={18} />,
  parent: <UserRoundCog size={18} />,
  support: <Sparkles size={18} />,
};

function formatJoinedAt(dateString: string, language: ViewerLanguage) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return language === 'zh-CN' ? '2026年2月' : 'Feb 2026';
  }
  return formatViewerMonthYear(date, language);
}

function formatBindingExpiry(dateString: string | null, language: ViewerLanguage) {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatViewerDateTime(date, language);
}

function NoticeBanner({ notice }: { notice: NoticeState }) {
  return (
    <div
      className={cn(
        'viewer-botanical-notice',
        notice.tone === 'success' && 'viewer-botanical-notice--success',
        notice.tone === 'error' && 'viewer-botanical-notice--error',
        notice.tone === 'info' && 'viewer-botanical-notice--info',
      )}
    >
      {notice.message}
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard className="space-y-6 rounded-[28px] p-6 md:p-7">
      <div>
        <div className="viewer-botanical-eyebrow">{eyebrow}</div>
        <h2 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em] text-[var(--viewer-text)]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{title}</h2>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{description}</p>
      </div>
      {children}
    </SurfaceCard>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="viewer-botanical-eyebrow text-[0.68rem]">{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          aria-label={label}
          className="viewer-botanical-input min-h-28"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          className="viewer-botanical-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function ToggleTile({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[22px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] px-4 py-4">
      <div>
        <div className="text-sm font-black text-[var(--viewer-text)]">{label}</div>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--viewer-text-muted)]">{hint}</p>
      </div>
      <input
        aria-label={label}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function ChoicePill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition',
        active
          ? 'border-[#b9d1bc] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white shadow-[0_12px_28px_rgba(122,158,126,0.24)]'
          : 'border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] text-[var(--viewer-text)]',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);
  const preferences = useAppSelector((state) => state.viewerPreferences);
  const language = preferences.language;
  const copy = getSettingsCopy(language);

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('account');
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    cover_image_url: '',
  });
  const [systemDraft, setSystemDraft] = useState({
    theme_mode: 'system' as ViewerPreferencesState['themeMode'],
    language: 'zh-CN' as ViewerLanguage,
    notification_daily_reminder: false,
    notification_reminder_time: '20:00',
    marketing_emails: false,
    accessibility_mode: false,
  });
  const [bindingCode, setBindingCode] = useState<string | null>(null);
  const [bindingCodeExpiresAt, setBindingCodeExpiresAt] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['viewer', 'settings', auth.user?.id],
    queryFn: () => fetchViewerSettings(auth.user?.id ?? ''),
    enabled: Boolean(auth.user?.id),
  });

  useEffect(() => {
    const payload = settingsQuery.data;
    if (!payload) {
      return;
    }

    setProfileForm({
      username: payload.profile.username ?? '',
      bio: payload.profile.bio ?? '',
      avatar_url: payload.profile.avatar_url ?? '',
      cover_image_url: payload.profile.cover_image_url ?? '',
    });
    setSystemDraft(payload.userSettings);
    dispatch(
      patchPreferences({
        themeMode: payload.userSettings.theme_mode,
        language: payload.userSettings.language,
        dailyReminderEnabled: payload.userSettings.notification_daily_reminder,
        dailyReminderTime: payload.userSettings.notification_reminder_time,
      }),
    );
  }, [dispatch, settingsQuery.data]);

  const currentRole = auth.role ?? settingsQuery.data?.profile.role ?? 'user';
  const isParent = isParentRole(currentRole);

  function showNotice(message: string, tone: NoticeState['tone'] = 'success') {
    setNotice({ message, tone });
  }

  function patchPreference(patch: Partial<ViewerPreferencesState>) {
    dispatch(patchPreferences(patch));
  }

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!auth.user?.id) {
        throw new Error(copy.common.sessionExpired);
      }
      return saveProfileSettings(auth.user.id, profileForm);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['viewer', 'settings', auth.user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'profile', auth.user?.id] }),
      ]);
      if (auth.user) {
        dispatch(
          setSession({
            user: {
              ...auth.user,
              displayName: profileForm.username.trim() || auth.user.displayName,
            },
            role: currentRole,
            source: auth.source,
          }),
        );
      }
      captureViewerEvent('viewer_settings_profile_saved', { userId: auth.user?.id ?? 'anonymous' });
      showNotice(copy.account.saveSuccess, 'success');
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_profile_save' });
      showNotice(error instanceof Error ? error.message : copy.account.saveFailed, 'error');
    },
  });

  const saveSystemMutation = useMutation({
    mutationFn: async (patch?: Partial<typeof systemDraft>) => {
      if (!auth.user?.id) {
        throw new Error(copy.common.sessionExpired);
      }
      return saveAccountSystemSettings(auth.user.id, patch ?? systemDraft);
    },
    onSuccess: async (_result, patch) => {
      await queryClient.invalidateQueries({ queryKey: ['viewer', 'settings', auth.user?.id] });
      showNotice(
        patch && ('language' in patch || 'theme_mode' in patch)
          ? copy.appearance.saveSuccess
          : activeSection === 'notifications'
            ? copy.notifications.saveSuccess
            : copy.appearance.saveSuccess,
        'success',
      );
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_system_save' });
      showNotice(error instanceof Error ? error.message : 'Save failed.', 'error');
    },
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (targetRole: 'user' | 'parent') => {
      if (!auth.user?.id) {
        throw new Error(copy.common.sessionExpired);
      }
      await saveProfileSettings(auth.user.id, { role: targetRole });
      return targetRole;
    },
    onSuccess: async (targetRole) => {
      if (auth.source === 'demo') {
        seedDemoRole(targetRole);
      }
      if (auth.user) {
        dispatch(
          setSession({
            user: {
              ...auth.user,
              displayName: profileForm.username.trim() || auth.user.displayName,
            },
            role: targetRole,
            source: auth.source,
          }),
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['viewer', 'settings', auth.user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['viewer', 'profile', auth.user?.id] }),
      ]);
      showNotice(
        targetRole === 'parent' ? copy.parent.switchSuccessParent : copy.parent.switchSuccessLearner,
        'success',
      );
      navigate(learnerHomeForRole(targetRole), { replace: true });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_role_switch' });
      showNotice(error instanceof Error ? error.message : 'Role switch failed.', 'error');
    },
  });

  const bindingCodeMutation = useMutation({
    mutationFn: generateChildBindingCode,
    onSuccess: (payload) => {
      setBindingCode(payload?.code ? String(payload.code) : null);
      setBindingCodeExpiresAt(payload?.expires_at ? String(payload.expires_at) : null);
      captureViewerEvent('viewer_binding_code_generated', { userId: auth.user?.id ?? 'anonymous' });
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_binding_code' });
      showNotice(error instanceof Error ? error.message : 'Binding code generation failed.', 'error');
    },
  });

  const pushEnableMutation = useMutation({
    mutationFn: enableViewerPushNotifications,
    onSuccess: (result) => {
      if (result.active) {
        patchPreference({ notificationsEnabled: true });
        showNotice(copy.notifications.enableSuccess, 'success');
        return;
      }
      patchPreference({ notificationsEnabled: false });
      showNotice(result.message ?? copy.notifications.permissionDenied, result.permission === 'unsupported' ? 'info' : 'error');
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_push_enable' });
      patchPreference({ notificationsEnabled: false });
      showNotice(error instanceof Error ? error.message : copy.notifications.unsupported, 'error');
    },
  });

  const pushDisableMutation = useMutation({
    mutationFn: disableViewerPushNotifications,
    onSuccess: () => {
      patchPreference({ notificationsEnabled: false });
      showNotice(copy.notifications.disableSuccess, 'info');
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_push_disable' });
      showNotice(error instanceof Error ? error.message : copy.notifications.unsupported, 'error');
    },
  });

  async function handleCopyBindingCode() {
    if (!bindingCode) {
      return;
    }
    if (!navigator.clipboard) {
      showNotice(copy.parent.bindingCodeCopied, 'info');
      return;
    }
    await navigator.clipboard.writeText(bindingCode);
    showNotice(copy.parent.bindingCodeCopied, 'success');
  }

  async function handleSignOut() {
    if (!window.confirm(`${copy.support.signOutConfirmTitle}\n\n${copy.support.signOutConfirmBody}`)) {
      return;
    }
    captureViewerEvent('viewer_sign_out_clicked', { source: 'settings' });
    clearDemoRole();
    dispatch(clearSession());
    queryClient.clear();
    try {
      await supabase.auth.signOut();
    } catch {
      // Demo and offline flows should still exit cleanly.
    }
    navigate('/', { replace: true });
  }

  async function handleClearCache() {
    await clearViewerLocalCache();
    showNotice(copy.privacy.clearCacheDone, 'info');
  }

  const appearanceChoices = useMemo(
    () => [
      { key: 'system' as const, label: copy.appearance.system, icon: <LayoutTemplate size={16} /> },
      { key: 'light' as const, label: copy.appearance.light, icon: <SunMedium size={16} /> },
      { key: 'dark' as const, label: copy.appearance.dark, icon: <MoonStar size={16} /> },
    ],
    [copy.appearance.dark, copy.appearance.light, copy.appearance.system],
  );

  const languageChoices = useMemo(
    () => [
      { key: 'zh-CN' as const, label: copy.appearance.chinese },
      { key: 'en' as const, label: copy.appearance.english },
    ],
    [copy.appearance.chinese, copy.appearance.english],
  );

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

  const profile = settingsQuery.data.profile;
  const displayName = profileForm.username.trim() || auth.user?.displayName || profile.username || 'Learner';
  const joinedAt = formatJoinedAt(profile.created_at, language);

  return (
    <PageContainer title={copy.title} subtitle={copy.subtitle} className="max-w-[1280px] pb-10">
      {notice ? <NoticeBanner notice={notice} /> : null}

      <section className="viewer-panel overflow-hidden rounded-[34px]">
        <div className="relative min-h-[230px] overflow-hidden bg-[linear-gradient(135deg,#7f5f49_0%,#c4956a_32%,#e8cfab_62%,#a8c5ac_100%)] px-6 py-6 md:px-8">
          {profileForm.cover_image_url ? (
            <img src={profileForm.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.22),transparent_24%),radial-gradient(circle_at_86%_24%,rgba(255,255,255,0.16),transparent_26%)]" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-[6.8rem] w-[6.8rem] overflow-hidden rounded-[26px] border-4 border-white/80 bg-white shadow-[0_20px_45px_rgba(90,70,50,0.18)]">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[2.7rem] font-black text-[#7a6b5e]">
                      {displayName.slice(0, 1)}
                    </div>
                  )}
              </div>

              <div className="pb-1 text-white">
                <div className="text-[0.72rem] font-black uppercase tracking-[0.22em] text-white/70">{copy.overviewEyebrow}</div>
                <h2 className="mt-2 text-[2.3rem] font-semibold tracking-[-0.04em]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{displayName}</h2>
                <div className="mt-2 text-sm font-semibold text-white/78">{auth.user?.email ?? ''}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/20 bg-[rgba(255,252,247,0.16)] px-4 py-3 text-white backdrop-blur">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/72">{copy.overviewRole}</div>
                <div className="mt-2 text-lg font-black">{isParent ? copy.parent.parent : copy.parent.learner}</div>
              </div>
              <div className="rounded-[22px] border border-white/20 bg-[rgba(255,252,247,0.16)] px-4 py-3 text-white backdrop-blur">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/72">{copy.overviewJoined}</div>
                <div className="mt-2 text-lg font-black">{joinedAt}</div>
              </div>
              <div className="rounded-[22px] border border-white/20 bg-[rgba(255,252,247,0.16)] px-4 py-3 text-white backdrop-blur">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/72">{copy.overviewVersion}</div>
                <div className="mt-2 text-lg font-black">{VIEWER_VERSION}</div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 rounded-[24px] border border-white/18 bg-[rgba(255,252,247,0.16)] px-5 py-4 text-white backdrop-blur">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/72">{copy.overviewActiveSection}</div>
            <div className="mt-2 text-lg font-black">{copy.sections[activeSection].label}</div>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-white/78">{copy.sections[activeSection].description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <SurfaceCard className="rounded-[28px] p-3">
            <div className="flex flex-wrap gap-2 xl:flex-col">
              {settingsSectionOrder.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    'flex items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition xl:w-full',
                    activeSection === section
                      ? 'border-[#b9d1bc] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white shadow-[0_18px_36px_rgba(122,158,126,0.22)]'
                      : 'border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] text-[var(--viewer-text)] hover:bg-[var(--viewer-surface-muted)]',
                  )}
                >
                  <div className={cn('mt-0.5', activeSection === section ? 'text-white' : 'text-[var(--viewer-primary)]')}>
                    {sectionIcons[section]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black">{copy.sections[section].label}</div>
                    <p
                      className={cn(
                        'mt-1 text-xs font-medium leading-5',
                        activeSection === section ? 'text-white/78' : 'text-[var(--viewer-text-muted)]',
                      )}
                    >
                      {copy.sections[section].description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </SurfaceCard>
        </aside>

        <div className="space-y-6">
          {activeSection === 'account' ? (
            <SectionCard eyebrow="Account" title={copy.account.title} description={copy.account.description}>
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <TextField
                    label={copy.account.username}
                    value={profileForm.username}
                    onChange={(value) => setProfileForm((current) => ({ ...current, username: value }))}
                  />
                  <TextField
                    label={copy.account.bio}
                    value={profileForm.bio}
                    multiline
                    onChange={(value) => setProfileForm((current) => ({ ...current, bio: value }))}
                  />
                  <TextField
                    label={copy.account.avatarUrl}
                    value={profileForm.avatar_url}
                    onChange={(value) => setProfileForm((current) => ({ ...current, avatar_url: value }))}
                  />
                  <TextField
                    label={copy.account.coverUrl}
                    value={profileForm.cover_image_url}
                    onChange={(value) => setProfileForm((current) => ({ ...current, cover_image_url: value }))}
                  />
                </div>

                <div className="space-y-5">
                  <div className="rounded-[26px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-4">
                    <FieldLabel>{copy.account.coverPreview}</FieldLabel>
                    <div className="mt-3 h-40 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#c4dafe,#eef4ff)]">
                      {profileForm.cover_image_url ? (
                        <img src={profileForm.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-[26px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-4">
                    <FieldLabel>{copy.account.avatarPreview}</FieldLabel>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-[24px] bg-white shadow-[0_16px_35px_rgba(15,23,42,0.08)]">
                        {profileForm.avatar_url ? (
                          <img src={profileForm.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[2rem] font-black text-[#7a6b5e]">
                            {displayName.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-[var(--viewer-text)]">{displayName}</div>
                        <div className="mt-1 text-sm font-medium text-[var(--viewer-text-muted)]">
                          {copy.account.role}: {isParent ? copy.parent.parent : copy.parent.learner}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--primary"
                  onClick={() => saveProfileMutation.mutate()}
                  disabled={saveProfileMutation.isPending}
                >
                  {saveProfileMutation.isPending ? copy.common.saving : copy.account.save}
                </button>
                <div className="rounded-full border border-[var(--viewer-border)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
                  {'profiles'}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'appearance' ? (
            <SectionCard eyebrow="Appearance" title={copy.appearance.title} description={copy.appearance.description}>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                  <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
                    <SunMedium size={16} />
                    <span>{copy.appearance.theme}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {appearanceChoices.map((option) => (
                      <ChoicePill
                        key={option.key}
                        active={systemDraft.theme_mode === option.key}
                        icon={option.icon}
                        label={option.label}
                        onClick={() => {
                          setSystemDraft((current) => ({ ...current, theme_mode: option.key }));
                          patchPreference({ themeMode: option.key });
                          saveSystemMutation.mutate({ theme_mode: option.key });
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                  <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
                    <Languages size={16} />
                    <span>{copy.appearance.language}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {languageChoices.map((option) => (
                      <ChoicePill
                        key={option.key}
                        active={systemDraft.language === option.key}
                        icon={<Globe size={16} />}
                        label={option.label}
                        onClick={() => {
                          setSystemDraft((current) => ({ ...current, language: option.key }));
                          patchPreference({ language: option.key });
                          saveSystemMutation.mutate({ language: option.key });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-[var(--viewer-border)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
                  {saveSystemMutation.isPending ? copy.common.saving : copy.appearance.saveSuccess}
                </div>
                <div className="rounded-full border border-[var(--viewer-border)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
                  {'user_settings'}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'learning' ? (
            <SectionCard eyebrow="Learning" title={copy.learning.title} description={copy.learning.description}>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToggleTile
                  label={copy.learning.sound.label}
                  hint={copy.learning.sound.hint}
                  checked={preferences.soundEnabled}
                  onChange={(checked) => patchPreference({ soundEnabled: checked })}
                />
                <ToggleTile
                  label={copy.learning.haptics.label}
                  hint={copy.learning.haptics.hint}
                  checked={preferences.hapticsEnabled}
                  onChange={(checked) => patchPreference({ hapticsEnabled: checked })}
                />
                <ToggleTile
                  label={copy.learning.autoplay.label}
                  hint={copy.learning.autoplay.hint}
                  checked={preferences.autoplayAudio}
                  onChange={(checked) => patchPreference({ autoplayAudio: checked })}
                />
                <ToggleTile
                  label={copy.learning.hints.label}
                  hint={copy.learning.hints.hint}
                  checked={preferences.learningHints}
                  onChange={(checked) => patchPreference({ learningHints: checked })}
                />
              </div>

              <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
                  <BookAudio size={16} />
                  <span>{copy.learning.dailyGoal}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--viewer-text-muted)]">{copy.learning.dailyGoalHint}</p>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    aria-label={copy.learning.dailyGoal}
                    type="range"
                    min={10}
                    max={180}
                    step={5}
                    value={preferences.dailyGoalMinutes}
                    onChange={(event) => patchPreference({ dailyGoalMinutes: Number(event.target.value) })}
                    className="w-full"
                  />
                  <div className="min-w-[92px] rounded-full bg-white px-4 py-2 text-center text-sm font-black text-[var(--viewer-text)]">
                    {preferences.dailyGoalMinutes} {copy.learning.minutesPerDay}
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'notifications' ? (
            <SectionCard eyebrow="Notifications" title={copy.notifications.title} description={copy.notifications.description}>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToggleTile
                  label={copy.notifications.master.label}
                  hint={copy.notifications.master.hint}
                  checked={preferences.notificationsEnabled}
                  onChange={(checked) => {
                    if (checked) {
                      pushEnableMutation.mutate();
                      return;
                    }
                    pushDisableMutation.mutate();
                  }}
                />
                <ToggleTile
                  label={copy.notifications.dailyReminder.label}
                  hint={copy.notifications.dailyReminder.hint}
                  checked={systemDraft.notification_daily_reminder}
                  onChange={(checked) => {
                    setSystemDraft((current) => ({ ...current, notification_daily_reminder: checked }));
                    patchPreference({ dailyReminderEnabled: checked });
                  }}
                />
                <ToggleTile
                  label={copy.notifications.streak.label}
                  hint={copy.notifications.streak.hint}
                  checked={preferences.streakReminderEnabled}
                  onChange={(checked) => patchPreference({ streakReminderEnabled: checked })}
                />
                <ToggleTile
                  label={copy.notifications.achievement.label}
                  hint={copy.notifications.achievement.hint}
                  checked={preferences.achievementReminderEnabled}
                  onChange={(checked) => patchPreference({ achievementReminderEnabled: checked })}
                />
              </div>

              <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
                  <Bell size={16} />
                  <span>{copy.notifications.reminderTime}</span>
                </div>
                <div className="mt-4 max-w-[240px]">
                  <input
                    aria-label={copy.notifications.reminderTime}
                    type="time"
                    className="w-full rounded-[18px] border border-[var(--viewer-border)] bg-white px-4 py-3 outline-none"
                    value={systemDraft.notification_reminder_time}
                    onChange={(event) => {
                      setSystemDraft((current) => ({ ...current, notification_reminder_time: event.target.value }));
                      patchPreference({ dailyReminderTime: event.target.value });
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--primary"
                  onClick={() => saveSystemMutation.mutate(undefined)}
                  disabled={saveSystemMutation.isPending}
                >
                  {saveSystemMutation.isPending ? copy.common.saving : copy.notifications.save}
                </button>
                <div className="rounded-full border border-[var(--viewer-border)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
                  {'user_settings + web_push'}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'privacy' ? (
            <SectionCard eyebrow="Privacy" title={copy.privacy.title} description={copy.privacy.description}>
              <div className="grid gap-4 lg:grid-cols-2">
                <ToggleTile
                  label={copy.privacy.privateProfile.label}
                  hint={copy.privacy.privateProfile.hint}
                  checked={preferences.privateProfile}
                  onChange={(checked) => patchPreference({ privateProfile: checked })}
                />
                <ToggleTile
                  label={copy.privacy.shareLearningActivity.label}
                  hint={copy.privacy.shareLearningActivity.hint}
                  checked={preferences.shareLearningActivity}
                  onChange={(checked) => patchPreference({ shareLearningActivity: checked })}
                />
                <ToggleTile
                  label={copy.privacy.allowFollowers.label}
                  hint={copy.privacy.allowFollowers.hint}
                  checked={preferences.allowFollowers}
                  onChange={(checked) => patchPreference({ allowFollowers: checked })}
                />
                <ToggleTile
                  label={copy.privacy.wifiOnlyDownloads.label}
                  hint={copy.privacy.wifiOnlyDownloads.hint}
                  checked={preferences.wifiOnlyDownloads}
                  onChange={(checked) => patchPreference({ wifiOnlyDownloads: checked })}
                />
              </div>

              <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
                  <BrushCleaning size={16} />
                  <span>{copy.privacy.clearCache}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--viewer-text-muted)]">{copy.privacy.clearCacheHint}</p>
                <button
                  type="button"
                  className="viewer-botanical-button viewer-botanical-button--secondary mt-4"
                  onClick={() => void handleClearCache()}
                >
                  {copy.privacy.clearCache}
                </button>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'parent' ? (
            <SectionCard
              eyebrow="Parent Mode"
              title={copy.parent.title}
              description={isParent ? copy.parent.descriptionParent : copy.parent.descriptionLearner}
            >
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[26px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                  <FieldLabel>{copy.parent.currentRole}</FieldLabel>
                  <div className="mt-3 text-2xl font-black text-[var(--viewer-text)]">
                    {isParent ? copy.parent.parent : copy.parent.learner}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <ChoicePill
                      active={!isParent}
                      icon={<GraduationCap size={16} />}
                      label={copy.parent.learner}
                      onClick={() => {
                        if (!isParent) return;
                        switchRoleMutation.mutate('user');
                      }}
                    />
                    <ChoicePill
                      active={isParent}
                      icon={<UserRoundCog size={16} />}
                      label={copy.parent.parent}
                      onClick={() => {
                        if (isParent) return;
                        switchRoleMutation.mutate('parent');
                      }}
                    />
                  </div>
                  <button
                    type="button"
                  className="viewer-botanical-button viewer-botanical-button--primary mt-5"
                    onClick={() => switchRoleMutation.mutate(isParent ? 'user' : 'parent')}
                    disabled={switchRoleMutation.isPending}
                  >
                    {switchRoleMutation.isPending
                      ? copy.parent.switching
                      : isParent
                        ? copy.parent.switchToLearner
                        : copy.parent.switchToParent}
                  </button>
                </div>

                <div className="rounded-[26px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                  {isParent ? (
                    <div>
                      <div className="text-xl font-black text-[var(--viewer-text)]">{copy.parent.openDashboard}</div>
                      <p className="mt-2 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{copy.parent.descriptionParent}</p>
                      <button
                        type="button"
                        className="viewer-botanical-button viewer-botanical-button--primary mt-5"
                        onClick={() => navigate('/parent')}
                      >
                        {copy.parent.openDashboard}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-black text-[var(--viewer-text)]">{copy.parent.bindingCode}</div>
                      {bindingCode ? (
                        <>
                          <div className="mt-4 font-mono text-[2rem] font-black tracking-[0.24em] text-[var(--viewer-primary)]">{bindingCode}</div>
                          {bindingCodeExpiresAt ? (
                            <div className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">
                              {copy.parent.bindingCodeExpires} {formatBindingExpiry(bindingCodeExpiresAt, language)}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-3 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{copy.parent.bindingCodeEmpty}</p>
                      )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="viewer-botanical-button viewer-botanical-button--primary"
                          onClick={() => bindingCodeMutation.mutate()}
                          disabled={bindingCodeMutation.isPending}
                        >
                          {bindingCodeMutation.isPending
                            ? copy.parent.switching
                            : bindingCode
                              ? copy.parent.bindingCodeRefresh
                              : copy.parent.bindingCodeGenerate}
                        </button>
                        {bindingCode ? (
                          <button
                            type="button"
                            className="viewer-botanical-button viewer-botanical-button--secondary"
                            onClick={() => void handleCopyBindingCode()}
                          >
                            {copy.common.copy}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === 'support' ? (
            <SectionCard eyebrow="Support" title={copy.support.title} description={copy.support.description}>
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  { to: '/support/help', label: copy.support.help },
                  { to: '/support/feedback', label: copy.support.feedback },
                  { to: '/support/privacy', label: copy.support.privacy },
                  { to: '/support/terms', label: copy.support.terms },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between rounded-[22px] border border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] px-5 py-4 text-sm font-black text-[var(--viewer-text)]"
                  >
                    <span>{item.label}</span>
                    <ExternalLink size={16} />
                  </Link>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
                  <FieldLabel>{copy.support.versionLabel}</FieldLabel>
                  <div className="mt-3 text-2xl font-black text-[var(--viewer-text)]">{VIEWER_VERSION}</div>
                  <p className="mt-2 text-sm font-medium text-[var(--viewer-text-muted)]">viewer-react</p>
                </div>

                <div className="rounded-[24px] border border-[#e6c8c2] bg-[#fbefed] p-5">
                  <div className="text-lg font-black text-[#9d554d]">{copy.support.signOut}</div>
                  <p className="mt-2 text-sm font-medium leading-7 text-[#9d554d]/80">{copy.support.signOutHint}</p>
                  <button
                    type="button"
                    className="viewer-botanical-button viewer-botanical-button--warm mt-5"
                    onClick={() => void handleSignOut()}
                  >
                    {copy.support.signOut}
                  </button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
