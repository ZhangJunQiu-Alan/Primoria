import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clearSession, setSession } from '@/features/auth/authSlice';
import { clearAiTutorSessionStorage } from '@/features/ai-tutor/aiTutorUtils';
import { getSettingsCopy, type SettingsSectionId } from '@/features/profile/settingsCopy';
import { getAiTutorPersonaDefinition, getAiTutorPersonaOptions } from '@/shared/ai-tutor/persona';
import { fetchViewerSettings, saveAccountSystemSettings, saveProfileSettings } from '@/shared/api/viewer/settingsApi';
import { supabase } from '@/shared/api/supabase';
import { clearViewerLocalCache, disableViewerPushNotifications, enableViewerPushNotifications } from '@/shared/api/viewer/pushApi';
import type { ViewerLanguage } from '@/shared/i18n/locale';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { patchPreferences, type ViewerPreferencesState } from '@/shared/state/preferencesSlice';
import { useAppDispatch, useAppSelector } from '@/shared/state/store';
import { clearDemoRole } from '@/shared/utils/demoMode';

export type NoticeState = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

export function useSettingsPageModel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);
  const preferences = useAppSelector((state) => state.viewerPreferences);
  const language = preferences.language;
  const copy = getSettingsCopy(language);

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile');
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    cover_image_url: '',
  });
  const [systemDraft, setSystemDraft] = useState<{
    theme_mode: ViewerPreferencesState['themeMode'];
    language: ViewerLanguage;
    notification_daily_reminder: boolean;
    notification_reminder_time: string;
    marketing_emails: boolean;
    accessibility_mode: boolean;
    ai_tutor_persona: ViewerPreferencesState['aiTutorPersona'];
    home_companion_enabled: boolean;
    ai_provider: 'google' | 'openai' | 'anthropic';
    ai_base_url: string;
    ai_api_key: string;
  }>({
    theme_mode: 'system',
    language: 'zh-CN',
    notification_daily_reminder: false,
    notification_reminder_time: '20:00',
    marketing_emails: false,
    accessibility_mode: false,
    ai_tutor_persona: preferences.aiTutorPersona,
    home_companion_enabled: preferences.homeCompanionEnabled,
    ai_provider: 'google',
    ai_base_url: '',
    ai_api_key: '',
  });

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
        aiTutorPersona: payload.userSettings.ai_tutor_persona,
        homeCompanionEnabled: payload.userSettings.home_companion_enabled,
        dailyReminderEnabled: payload.userSettings.notification_daily_reminder,
        dailyReminderTime: payload.userSettings.notification_reminder_time,
        aiProvider: payload.userSettings.ai_provider,
        aiBaseUrl: payload.userSettings.ai_base_url,
        aiApiKey: payload.userSettings.ai_api_key,
      }),
    );
  }, [dispatch, settingsQuery.data]);

  const currentRole = auth.role ?? settingsQuery.data?.profile.role ?? 'user';

  const showNotice = (message: string, tone: NoticeState['tone'] = 'success') => {
    setNotice({ message, tone });
  };

  const patchPreference = (patch: Partial<ViewerPreferencesState>) => {
    dispatch(patchPreferences(patch));
  };

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
      const savedAiTutorSettings = Boolean(
        patch && ('ai_tutor_persona' in patch || 'home_companion_enabled' in patch),
      );
      const savedAppearanceSettings = Boolean(
        patch && ('language' in patch || 'theme_mode' in patch),
      );
      showNotice(
        savedAiTutorSettings
          ? copy.aiTutor.saveSuccess
          : savedAppearanceSettings
            ? copy.appearance.saveSuccess
            : copy.notifications.saveSuccess,
        'success',
      );
    },
    onError: (error) => {
      captureViewerError(error, { area: 'settings_system_save' });
      showNotice(error instanceof Error ? error.message : 'Save failed.', 'error');
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

  const handleSignOut = async () => {
    if (!window.confirm(`${copy.support.signOutConfirmTitle}\n\n${copy.support.signOutConfirmBody}`)) {
      return;
    }
    captureViewerEvent('viewer_sign_out_clicked', { source: 'settings' });
    clearDemoRole();
    clearAiTutorSessionStorage();
    dispatch(clearSession());
    queryClient.clear();
    try {
      await supabase.auth.signOut();
    } catch {
      // Demo and offline flows should still exit cleanly.
    }
    navigate('/', { replace: true });
  };

  const handleClearCache = async () => {
    await clearViewerLocalCache();
    showNotice(copy.privacy.clearCacheDone, 'info');
  };

  const appearanceChoices = useMemo(
    () => [
      { key: 'system' as const, label: copy.appearance.system },
      { key: 'light' as const, label: copy.appearance.light },
      { key: 'dark' as const, label: copy.appearance.dark },
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

  const aiTutorPersonaOptions = useMemo(() => getAiTutorPersonaOptions(language), [language]);

  const displayName =
    profileForm.username.trim()
    || auth.user?.displayName
    || settingsQuery.data?.profile.username
    || 'Learner';
  const activeTutorPersona = getAiTutorPersonaDefinition(systemDraft.ai_tutor_persona, language);

  return {
    activeSection,
    activeTutorPersona,
    aiTutorPersonaOptions,
    appearanceChoices,
    auth,
    copy,
    currentRole,
    displayName,
    handleClearCache,
    handleSignOut,
    language,
    languageChoices,
    notice,
    patchPreference,
    preferences,
    profileForm,
    pushDisableMutation,
    pushEnableMutation,
    saveProfileMutation,
    saveSystemMutation,
    setActiveSection,
    setNotice,
    setProfileForm,
    setSystemDraft,
    settingsQuery,
    systemDraft,
  };
}

export type SettingsPageModel = ReturnType<typeof useSettingsPageModel>;
