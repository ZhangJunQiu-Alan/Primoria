import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import * as Dialog from '@radix-ui/react-dialog';
import type { LucideIcon } from 'lucide-react';
import { Activity, Bell, Download, LayoutGrid, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { saveAccountSystemSettings } from '@/shared/api/viewer/settingsApi';
import { normalizeViewerLanguage, type ViewerLanguage } from '@/shared/i18n/locale';
import { patchPreferences } from '@/shared/state/preferencesSlice';
import { useAppDispatch, useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import {
  StorageService,
  type DashboardDifficultyLevel,
  type DashboardLocalSettings,
  type DashboardPriceTier,
} from '@/services/StorageService';
import './dashboard.css';

type SettingsSection = 'account' | 'workflow' | 'notifications' | 'data';
type NoticeTone = 'success' | 'error' | 'info';

interface NoticeState {
  text: string;
  tone: NoticeTone;
}

interface DashboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileSaved?: (profile: DashboardProfileSummary) => void;
  user: User;
}

export interface DashboardProfileSummary {
  avatarUrl: string | null;
  role: string | null;
  username: string | null;
}

interface BackendSettingsState {
  accessibilityMode: boolean;
  dailyReminder: boolean;
  language: ViewerLanguage;
  marketingEmails: boolean;
  reminderTime: string;
}

interface SectionConfig {
  icon: LucideIcon;
  label: string;
  value: SettingsSection;
}

const defaultBackendSettings: BackendSettingsState = {
  accessibilityMode: false,
  dailyReminder: false,
  language: 'zh-CN',
  marketingEmails: false,
  reminderTime: '09:00',
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Action failed. Please try again.';
}

function getFallbackName(user: User) {
  const metadata = user.user_metadata ?? {};
  const metadataName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : null;

  return metadataName?.trim() || user.email?.split('@')[0] || 'Author';
}

function getInitial(value: string | null | undefined) {
  return (value?.trim()[0] ?? 'A').toUpperCase();
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return defaultBackendSettings.reminderTime;
  return value.slice(0, 5);
}

function normalizeLanguage(value: string | null | undefined) {
  return normalizeViewerLanguage(value);
}

function SettingsCard({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="dashboard-settings__card dashboard-settings__card--compact">
      <div className="dashboard-settings__card-header">
        <h3>{title}</h3>
        {actions ? <div className="dashboard-settings__card-actions">{actions}</div> : null}
      </div>
      {children}
    </article>
  );
}

function ToggleRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="dashboard-settings__toggle-row">
      <strong>{label}</strong>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`dashboard-settings__switch ${checked ? 'is-active' : ''}`}
        onClick={() => onToggle(!checked)}
      >
        <span className="dashboard-settings__switch-thumb" />
      </button>
    </div>
  );
}

function AvatarPreview({
  avatarUrl,
  label,
}: {
  avatarUrl: string;
  label: string;
}) {
  const normalized = avatarUrl.trim();
  const initial = getInitial(label);

  return (
    <span className="dashboard-settings__avatar dashboard-settings__avatar--small">
      {normalized ? (
        <img
          src={normalized}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span>{initial}</span>
    </span>
  );
}

export async function fetchDashboardProfileSummary(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    avatarUrl: data.avatar_url,
    role: data.role,
    username: data.username,
  } satisfies DashboardProfileSummary;
}

export function DashboardSettingsDialog({
  open,
  onOpenChange,
  onProfileSaved,
  user,
}: DashboardSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector((state) => state.viewerPreferences.language);
  const copy = useViewerCopy();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('user');
  const [backendSettings, setBackendSettings] = useState<BackendSettingsState>({
    ...defaultBackendSettings,
    language: currentLanguage,
  });
  const [localSettings, setLocalSettings] = useState<DashboardLocalSettings>(() =>
    StorageService.loadDashboardSettings(),
  );
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingLocalSection, setSavingLocalSection] = useState<SettingsSection | null>(null);
  const sectionList: SectionConfig[] = [
    { value: 'account', label: copy.dashboard.account, icon: Activity },
    { value: 'workflow', label: copy.dashboard.workflow, icon: LayoutGrid },
    { value: 'notifications', label: copy.dashboard.notifications, icon: Bell },
    { value: 'data', label: copy.dashboard.data, icon: Download },
  ];

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadSettings() {
      setLoading(true);
      setNotice(null);
      setLocalSettings(StorageService.loadDashboardSettings());

      try {
        const [profile, settingsResponse] = await Promise.all([
          fetchDashboardProfileSummary(user.id),
          supabase
            .from('user_settings')
            .select(
              'language, notification_daily_reminder, notification_reminder_time, marketing_emails, accessibility_mode',
            )
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (settingsResponse.error) throw settingsResponse.error;
        if (!active) return;

        setRole(profile?.role ?? 'user');
        setDisplayName(profile?.username?.trim() || getFallbackName(user));
        setAvatarUrl(
          (
            profile?.avatarUrl ??
            (typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null) ??
            (typeof user.user_metadata?.picture === 'string' ? user.user_metadata.picture : null) ??
            ''
          ).trim(),
        );
        setBackendSettings({
          accessibilityMode: settingsResponse.data?.accessibility_mode ?? defaultBackendSettings.accessibilityMode,
          dailyReminder:
            settingsResponse.data?.notification_daily_reminder ?? defaultBackendSettings.dailyReminder,
          language: normalizeLanguage(settingsResponse.data?.language ?? currentLanguage),
          marketingEmails: settingsResponse.data?.marketing_emails ?? defaultBackendSettings.marketingEmails,
          reminderTime: normalizeTime(
            settingsResponse.data?.notification_reminder_time ?? defaultBackendSettings.reminderTime,
          ),
        });
      } catch (error) {
        if (!active) return;
        setNotice({ tone: 'error', text: getErrorMessage(error) });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [currentLanguage, open, user]);

  const currentDisplayName = displayName.trim() || getFallbackName(user);
  const roleLabel = role.replaceAll('_', ' ').toUpperCase();

  async function handleLanguageChange(nextLanguage: ViewerLanguage) {
    setBackendSettings((current) => ({ ...current, language: nextLanguage }));
    dispatch(patchPreferences({ language: nextLanguage }));
    setNotice(null);

    try {
      await saveAccountSystemSettings(user.id, { language: nextLanguage });
      setNotice({
        tone: 'success',
        text: nextLanguage === 'zh-CN' ? '产品语言已同步。' : 'Product language synced.',
      });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    }
  }

  async function handleSaveAccount() {
    const trimmedName = displayName.trim();

    if (trimmedName.length < 3 || trimmedName.length > 32) {
      setNotice({ tone: 'error', text: 'Display name must be 3 to 32 characters.' });
      return;
    }

    setSavingAccount(true);
    setNotice(null);

    try {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          avatar_url: avatarUrl.trim() || null,
          username: trimmedName,
        },
        { onConflict: 'id' },
      );
      if (profileError) throw profileError;

      const { error: settingsError } = await supabase.from('user_settings').upsert(
        {
          accessibility_mode: backendSettings.accessibilityMode,
          language: backendSettings.language,
          user_id: user.id,
        },
        { onConflict: 'user_id' },
      );
      if (settingsError) throw settingsError;

      onProfileSaved?.({
        avatarUrl: avatarUrl.trim() || null,
        role,
        username: trimmedName,
      });
      setNotice({ tone: 'success', text: 'Account settings saved.' });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    setNotice(null);

    try {
      const { error } = await supabase.from('user_settings').upsert(
        {
          marketing_emails: backendSettings.marketingEmails,
          notification_daily_reminder: backendSettings.dailyReminder,
          notification_reminder_time: backendSettings.reminderTime,
          user_id: user.id,
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      StorageService.saveDashboardSettings(localSettings);
      setNotice({ tone: 'success', text: 'Notification settings saved.' });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setSavingNotifications(false);
    }
  }

  function handleSaveLocalSettings(section: SettingsSection, text: string) {
    setSavingLocalSection(section);
    setNotice(null);

    try {
      StorageService.saveDashboardSettings(localSettings);
      setNotice({ tone: 'success', text });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error) });
    } finally {
      setSavingLocalSection(null);
    }
  }

  function renderAccountSection() {
    return (
      <SettingsCard
        title="Account"
        actions={
          <button
            type="button"
            className="dashboard-settings__submit"
            onClick={() => void handleSaveAccount()}
            disabled={savingAccount}
          >
            {savingAccount ? <Loader2 className="dashboard-spin" size={16} /> : null}
            <span>Save account</span>
          </button>
        }
      >
        <div className="dashboard-settings__profile-row">
          <AvatarPreview avatarUrl={avatarUrl} label={currentDisplayName} />
          <div className="dashboard-settings__profile-copy">
            <strong>{currentDisplayName}</strong>
            <span>{user.email ?? ''}</span>
          </div>
        </div>

        <div className="dashboard-settings__field-grid">
          <label className="dashboard-field">
            <span>Email</span>
            <input value={user.email ?? ''} readOnly />
          </label>
          <label className="dashboard-field">
            <span>Role</span>
            <input value={roleLabel} readOnly />
          </label>
        </div>

        <div className="dashboard-settings__field-grid">
          <label className="dashboard-field">
            <span>Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={32}
              placeholder="Enter a display name"
            />
          </label>
          <label className="dashboard-field">
            <span>Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="dashboard-settings__field-grid">
          <label className="dashboard-field">
            <span>{copy.language.label}</span>
            <select
              value={backendSettings.language}
              onChange={(event) => {
                void handleLanguageChange(normalizeLanguage(event.target.value));
              }}
            >
              <option value="zh-CN">{copy.language.zh}</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="dashboard-settings__stack">
            <ToggleRow
              checked={backendSettings.accessibilityMode}
              label="Accessibility mode"
              onToggle={(next) =>
                setBackendSettings((current) => ({
                  ...current,
                  accessibilityMode: next,
                }))
              }
            />
          </div>
        </div>
      </SettingsCard>
    );
  }

  function renderWorkflowSection() {
    return (
      <SettingsCard
        title="Workflow"
        actions={
          <button
            type="button"
            className="dashboard-settings__submit"
            onClick={() => handleSaveLocalSettings('workflow', 'Workflow settings saved.')}
            disabled={savingLocalSection === 'workflow'}
          >
            {savingLocalSection === 'workflow' ? <Loader2 className="dashboard-spin" size={16} /> : null}
            <span>Save workflow</span>
          </button>
        }
      >
        <p className="dashboard-settings__hint">
          Autosave is off. Manual save is the only checkpoint.
        </p>

        <div className="dashboard-settings__field-grid">
          <label className="dashboard-field">
            <span>Default difficulty</span>
            <select
              value={localSettings.defaultDifficulty}
              onChange={(event) =>
                setLocalSettings((current) => ({
                  ...current,
                  defaultDifficulty: event.target.value as DashboardDifficultyLevel,
                }))
              }
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <label className="dashboard-field">
            <span>Default price</span>
            <select
              value={localSettings.defaultPriceTier}
              onChange={(event) =>
                setLocalSettings((current) => ({
                  ...current,
                  defaultPriceTier: event.target.value as DashboardPriceTier,
                }))
              }
            >
              <option value="free">Free</option>
              <option value="premium">Paid</option>
            </select>
          </label>
        </div>

        <div className="dashboard-settings__stack">
          <ToggleRow
            checked={localSettings.publishChecklist}
            label="Publish checklist"
            onToggle={(next) =>
              setLocalSettings((current) => ({
                ...current,
                publishChecklist: next,
              }))
            }
          />
          <ToggleRow
            checked={localSettings.publishConfirm}
            label="Publish confirmation"
            onToggle={(next) =>
              setLocalSettings((current) => ({
                ...current,
                publishConfirm: next,
              }))
            }
          />
        </div>
      </SettingsCard>
    );
  }

  function renderNotificationsSection() {
    return (
      <SettingsCard
        title="Notifications"
        actions={
          <button
            type="button"
            className="dashboard-settings__submit"
            onClick={() => void handleSaveNotifications()}
            disabled={savingNotifications}
          >
            {savingNotifications ? <Loader2 className="dashboard-spin" size={16} /> : null}
            <span>Save notifications</span>
          </button>
        }
      >
        <div className="dashboard-settings__stack">
          <ToggleRow
            checked={backendSettings.dailyReminder}
            label="Daily reminder"
            onToggle={(next) =>
              setBackendSettings((current) => ({
                ...current,
                dailyReminder: next,
              }))
            }
          />

          <label className="dashboard-field">
            <span>Reminder time</span>
            <input
              type="time"
              value={backendSettings.reminderTime}
              onChange={(event) =>
                setBackendSettings((current) => ({
                  ...current,
                  reminderTime: event.target.value,
                }))
              }
            />
          </label>

          <ToggleRow
            checked={backendSettings.marketingEmails}
            label="Product emails"
            onToggle={(next) =>
              setBackendSettings((current) => ({
                ...current,
                marketingEmails: next,
              }))
            }
          />

          <ToggleRow
            checked={localSettings.weeklyDigest}
            label="Weekly digest (local)"
            onToggle={(next) =>
              setLocalSettings((current) => ({
                ...current,
                weeklyDigest: next,
              }))
            }
          />
        </div>
      </SettingsCard>
    );
  }

  function renderDataSection() {
    return (
      <SettingsCard
        title="Data"
        actions={
          <button
            type="button"
            className="dashboard-settings__submit"
            onClick={() => handleSaveLocalSettings('data', 'Data settings saved.')}
            disabled={savingLocalSection === 'data'}
          >
            {savingLocalSection === 'data' ? <Loader2 className="dashboard-spin" size={16} /> : null}
            <span>Save data</span>
          </button>
        }
      >
        <div className="dashboard-settings__stack">
          <ToggleRow
            checked={localSettings.usageTelemetry}
            label="Local usage analytics"
            onToggle={(next) =>
              setLocalSettings((current) => ({
                ...current,
                usageTelemetry: next,
              }))
            }
          />
        </div>
      </SettingsCard>
    );
  }

  function renderContent() {
    switch (activeSection) {
      case 'workflow':
        return renderWorkflowSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'data':
        return renderDataSection();
      case 'account':
      default:
        return renderAccountSection();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog__overlay" />
        <Dialog.Content className="dashboard-dialog dashboard-settings">
          <div className="dashboard-settings__header dashboard-settings__header--compact">
            <div className="dashboard-settings__brand dashboard-settings__brand--compact">
              <span className="dashboard-settings__brand-mark">
                <Activity size={20} />
              </span>
              <Dialog.Title className="dashboard-settings__title dashboard-settings__title--compact">
                Settings
              </Dialog.Title>
              <Dialog.Description className="dashboard-settings__sr-only">
                Account, workflow, notification, and data settings.
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="studio-icon-button studio-icon-button--plain"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="dashboard-settings__layout">
            <aside className="dashboard-settings__nav" aria-label="Settings sections">
              {sectionList.map((section) => {
                const Icon = section.icon;
                const isActive = section.value === activeSection;

                return (
                  <button
                    key={section.value}
                    type="button"
                    className={`dashboard-settings__nav-item dashboard-settings__nav-item--compact ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveSection(section.value)}
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{section.label}</strong>
                    </span>
                  </button>
                );
              })}
            </aside>

            <div className="dashboard-settings__panel">
              {notice ? (
                <section className={`studio-inline-notice studio-inline-notice--${notice.tone}`}>
                  <p>{notice.text}</p>
                  <button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)}>
                    <X size={14} />
                  </button>
                </section>
              ) : null}

              {loading ? (
                <div className="dashboard-settings__loading">
                  <Loader2 className="dashboard-spin" size={18} />
                  <span>Loading settings...</span>
                </div>
              ) : (
                <div className="dashboard-settings__content">{renderContent()}</div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
