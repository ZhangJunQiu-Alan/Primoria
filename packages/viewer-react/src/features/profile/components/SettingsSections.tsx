import { useMemo, type ReactNode } from 'react';
import {
  Bell,
  BookAudio,
  Bot,
  BrushCleaning,
  CircleUserRound,
  ExternalLink,
  Globe,
  GraduationCap,
  Languages,
  LayoutTemplate,
  MoonStar,
  Sparkles,
  SunMedium,
  UserRoundCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSettingsCopy, settingsSectionOrder, type SettingsSectionId } from '@/features/profile/settingsCopy';
import type { NoticeState, SettingsPageModel } from '@/features/profile/hooks/useSettingsPageModel';
import { formatViewerDateTime } from '@/shared/i18n/format';
import type { ViewerLanguage } from '@/shared/i18n/locale';
import { SurfaceCard } from '@/shared/layout/SurfaceCard';
import { cn } from '@/shared/utils/cn';

const sectionIcons: Record<SettingsSectionId, ReactNode> = {
  profile: <CircleUserRound size={18} />,
  study: <GraduationCap size={18} />,
  assistant: <Bot size={18} />,
  family: <UserRoundCog size={18} />,
  support: <Sparkles size={18} />,
};

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

export function NoticeBanner({ notice }: { notice: NoticeState }) {
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

export function SectionCard({
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

export function TextField({
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

export function ToggleTile({
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

export function ChoicePill({
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

export function PersonaChoiceCard({
  active,
  label,
  badge,
  description,
  exampleLabel,
  examplePrompt,
  onClick,
}: {
  active: boolean;
  label: string;
  badge: string;
  description: string;
  exampleLabel: string;
  examplePrompt: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[24px] border p-5 text-left transition',
        active
          ? 'border-[#b9d1bc] bg-[linear-gradient(160deg,rgba(237,245,236,0.98)_0%,rgba(223,240,224,0.9)_100%)] shadow-[0_18px_34px_rgba(122,158,126,0.16)]'
          : 'border-[var(--viewer-border)] bg-[rgba(255,252,247,0.88)] hover:border-[#d1c4b5] hover:bg-[var(--viewer-surface-muted)]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-black text-[var(--viewer-text)]">{label}</div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-[0.72rem] font-black tracking-[0.12em]',
            active
              ? 'border-[#b8d0bb] bg-white/80 text-[#5c7d60]'
              : 'border-[var(--viewer-border)] bg-white/70 text-[var(--viewer-text-muted)]',
          )}
        >
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-7 text-[var(--viewer-text-muted)]">{description}</p>
      <div className="mt-4 rounded-[18px] border border-[var(--viewer-border)] bg-white/65 px-4 py-3">
        <div className="viewer-botanical-eyebrow text-[0.64rem]">{exampleLabel}</div>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--viewer-text)]">{examplePrompt}</p>
      </div>
    </button>
  );
}

type SettingsCopy = ReturnType<typeof getSettingsCopy>;

export function SettingsSectionNav({
  copy,
  activeSection,
  setActiveSection,
}: {
  copy: SettingsCopy;
  activeSection: SettingsSectionId;
  setActiveSection: (section: SettingsSectionId) => void;
}) {
  return (
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
  );
}

export function ProfileSettingsSection({ model }: { model: SettingsPageModel }) {
  const {
    copy,
    displayName,
    isParent,
    currentRole,
    profileForm,
    saveProfileMutation,
    saveSystemMutation,
    setProfileForm,
    setSystemDraft,
    patchPreference,
    systemDraft,
    appearanceChoices,
    languageChoices,
  } = model;

  const appearancePills = useMemo(
    () => [
      { ...appearanceChoices[0], icon: <LayoutTemplate size={16} /> },
      { ...appearanceChoices[1], icon: <SunMedium size={16} /> },
      { ...appearanceChoices[2], icon: <MoonStar size={16} /> },
    ],
    [appearanceChoices],
  );

  return (
    <>
      <SectionCard eyebrow="Profile" title={copy.account.title} description={copy.account.description}>
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
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--viewer-text-muted)]">
                    {currentRole}
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
        </div>
      </SectionCard>

      <SectionCard eyebrow="Display" title={copy.appearance.title} description={copy.appearance.description}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
              <SunMedium size={16} />
              <span>{copy.appearance.theme}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {appearancePills.map((option) => (
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
        </div>
      </SectionCard>
    </>
  );
}

export function StudySettingsSection({ model }: { model: SettingsPageModel }) {
  const { copy, patchPreference, preferences, saveSystemMutation, setSystemDraft, systemDraft, pushEnableMutation, pushDisableMutation } = model;

  return (
    <>
      <SectionCard eyebrow="Study" title={copy.learning.title} description={copy.learning.description}>
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

      <SectionCard eyebrow="Reminders" title={copy.notifications.title} description={copy.notifications.description}>
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
        </div>
      </SectionCard>
    </>
  );
}

export function AssistantSettingsSection({ model }: { model: SettingsPageModel }) {
  const { copy, activeTutorPersona, aiTutorPersonaOptions, patchPreference, preferences, saveSystemMutation, setSystemDraft, systemDraft } = model;

  return (
    <SectionCard eyebrow="Helper" title={copy.aiTutor.title} description={copy.aiTutor.description}>
      <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
              <Bot size={16} />
              <span>{copy.aiTutor.personalityTitle}</span>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--viewer-text-muted)]">
              {copy.aiTutor.personalityHint}
            </p>
          </div>
          <div className="rounded-full border border-[var(--viewer-border)] bg-white/70 px-4 py-2 text-sm font-black text-[var(--viewer-text)]">
            {copy.aiTutor.currentMode}: {activeTutorPersona.label}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {aiTutorPersonaOptions.map((option) => (
            <PersonaChoiceCard
              key={option.key}
              active={systemDraft.ai_tutor_persona === option.key}
              label={option.label}
              badge={option.badge}
              description={option.description}
              exampleLabel={copy.aiTutor.examplePrompt}
              examplePrompt={option.examplePrompt}
              onClick={() => {
                setSystemDraft((current) => ({ ...current, ai_tutor_persona: option.key }));
                patchPreference({ aiTutorPersona: option.key });
                saveSystemMutation.mutate({ ai_tutor_persona: option.key });
              }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
        <div className="flex items-center gap-2 text-sm font-black text-[var(--viewer-text)]">
          <Globe size={16} />
          <span>{copy.aiTutor.provider}</span>
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--viewer-text-muted)]">{copy.aiTutor.providerHint}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {([
            { key: 'google', label: copy.aiTutor.providerGoogle },
            { key: 'openai', label: copy.aiTutor.providerOpenAI },
            { key: 'anthropic', label: copy.aiTutor.providerAnthropic },
          ] as const).map((option) => (
            <ChoicePill
              key={option.key}
              active={systemDraft.ai_provider === option.key}
              label={option.label}
              onClick={() => {
                setSystemDraft((current) => ({ ...current, ai_provider: option.key }));
                saveSystemMutation.mutate({ ai_provider: option.key });
              }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-[24px] border border-[var(--viewer-border)] bg-[var(--viewer-surface-muted)] p-5">
        <TextField
          label={copy.aiTutor.baseUrl}
          value={systemDraft.ai_base_url}
          onChange={(value) => setSystemDraft((current) => ({ ...current, ai_base_url: value }))}
        />
        <TextField
          label={copy.aiTutor.apiKey}
          value={systemDraft.ai_api_key}
          onChange={(value) => setSystemDraft((current) => ({ ...current, ai_api_key: value }))}
        />
        <button
          type="button"
          className="viewer-botanical-button viewer-botanical-button--primary"
          onClick={() => saveSystemMutation.mutate({ ai_provider: systemDraft.ai_provider, ai_base_url: systemDraft.ai_base_url, ai_api_key: systemDraft.ai_api_key })}
          disabled={saveSystemMutation.isPending}
        >
          {copy.common.save}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleTile
          label={copy.aiTutor.homeCompanion.label}
          hint={copy.aiTutor.homeCompanion.hint}
          checked={preferences.homeCompanionEnabled}
          onChange={(checked) => {
            setSystemDraft((current) => ({ ...current, home_companion_enabled: checked }));
            patchPreference({ homeCompanionEnabled: checked });
            saveSystemMutation.mutate({ home_companion_enabled: checked });
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-[var(--viewer-border)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--viewer-text-muted)]">
          {saveSystemMutation.isPending ? copy.common.saving : copy.aiTutor.saveSuccess}
        </div>
      </div>
    </SectionCard>
  );
}

export function FamilySettingsSection({ model }: { model: SettingsPageModel }) {
  const {
    bindingCode,
    bindingCodeExpiresAt,
    bindingCodeMutation,
    copy,
    currentRole,
    handleCopyBindingCode,
    isParent,
    language,
    setActiveSection,
    switchRoleMutation,
  } = model;

  void currentRole;
  void setActiveSection;

  return (
    <SectionCard
      eyebrow="Family"
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
              <Link to="/parent" className="viewer-botanical-button viewer-botanical-button--primary mt-5 inline-flex">
                {copy.parent.openDashboard}
              </Link>
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
  );
}

export function SupportSettingsSection({ model }: { model: SettingsPageModel }) {
  const { copy, handleClearCache, handleSignOut, patchPreference, preferences } = model;

  return (
    <>
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

      <SectionCard eyebrow="Help" title={copy.support.title} description={copy.support.description}>
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

        <div className="rounded-[24px] border border-[#e6c8c2] bg-[#fbefed] p-5">
          <div className="text-lg font-black text-[#9d554d]">{copy.support.signOut}</div>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-[#9d554d]/80">{copy.support.signOutHint}</p>
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--warm mt-5"
            onClick={() => void handleSignOut()}
          >
            {copy.support.signOut}
          </button>
        </div>
      </SectionCard>
    </>
  );
}
