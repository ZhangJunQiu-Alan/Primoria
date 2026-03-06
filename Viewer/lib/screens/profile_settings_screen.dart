import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/user_provider.dart';
import '../services/audio_service.dart';
import '../services/image_picker_service.dart' as image_picker_service;
import '../services/notification_service.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import '../utils/role_routes.dart';

enum _SettingsSection {
  account,
  appearance,
  learning,
  notifications,
  privacy,
  parent,
  support,
}

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  static const int _maxUploadBytes = 5 * 1024 * 1024;
  static const int _maxUploadMb = 5;
  static const String _viewerVersion = '0.1.0';

  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _bioController = TextEditingController();
  final _scrollController = ScrollController();

  late final Map<_SettingsSection, GlobalKey> _sectionKeys = {
    for (final section in _SettingsSection.values) section: GlobalKey(),
  };

  bool _loading = true;
  bool _saving = false;
  bool _uploadingAvatar = false;
  bool _uploadingCover = false;

  String _role = 'user';
  DateTime _joinedAt = DateTime.now();
  String? _avatarUrl;
  String? _coverImageUrl;
  String? _bindingCode;
  DateTime? _bindingCodeExpiresAt;
  bool _generatingBindingCode = false;
  bool _switchingRole = false;

  ThemeMode _themeMode = ThemeMode.system;
  bool _soundEnabled = true;
  bool _hapticsEnabled = true;
  bool _notificationsEnabled = true;
  bool _dailyReminderEnabled = false;
  TimeOfDay _dailyReminderTime = const TimeOfDay(hour: 20, minute: 0);
  bool _streakReminderEnabled = true;
  bool _achievementReminderEnabled = true;

  bool _autoplayAudio = true;
  bool _showLearningHints = true;
  int _dailyGoalMinutes = 20;

  bool _privateProfile = false;
  bool _shareLearningActivity = true;
  bool _allowFollowers = true;
  bool _wifiOnlyDownloads = false;

  _SettingsSection _activeSection = _SettingsSection.account;
  StorageService? _storage;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _bioController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final results = await Future.wait([
      SupabaseService.getProfile(),
      StorageService.getInstance(),
    ]);
    if (!mounted) return;

    final profile = results[0] as Map<String, dynamic>?;
    final storage = results[1] as StorageService;
    final user = context.read<UserProvider>().user;

    final username = (profile?['username'] as String?) ?? user?.name ?? '';
    final bio = (profile?['bio'] as String?) ?? user?.bio ?? '';
    final role = (profile?['role'] as String?) ?? user?.role ?? 'user';
    final joined = DateTime.tryParse((profile?['created_at'] as String?) ?? '');

    final reminderHour = storage.getDailyReminderHour().clamp(0, 23).toInt();
    final reminderMinute = storage.getDailyReminderMinute().clamp(0, 59).toInt();

    setState(() {
      _storage = storage;
      _usernameController.text = username;
      _bioController.text = bio;
      _role = role;
      _joinedAt = joined ?? user?.joinedAt ?? DateTime.now();
      _avatarUrl = (profile?['avatar_url'] as String?) ?? user?.avatarUrl;
      _coverImageUrl =
          (profile?['cover_image_url'] as String?) ?? user?.coverImageUrl;

      _themeMode = context.read<ThemeProvider>().themeMode;
      _soundEnabled = storage.getSoundEnabled();
      _hapticsEnabled = storage.getHapticsEnabled();
      _notificationsEnabled = storage.getNotificationsEnabled();
      _dailyReminderEnabled = storage.getDailyReminderEnabled();
      _dailyReminderTime = TimeOfDay(
        hour: reminderHour,
        minute: reminderMinute,
      );
      _streakReminderEnabled = storage.getStreakReminderEnabled();
      _achievementReminderEnabled = storage.getAchievementReminderEnabled();

      _autoplayAudio = storage.getAutoplayEnabled();
      _showLearningHints = storage.getLearningHintEnabled();
      _dailyGoalMinutes = storage.getDailyGoalMinutes().clamp(10, 180);

      _privateProfile = storage.getPrivateProfile();
      _shareLearningActivity = storage.getShareLearningActivity();
      _allowFollowers = storage.getAllowFollowers();
      _wifiOnlyDownloads = storage.getWifiOnlyDownloads();

      _loading = false;
    });

    AudioService.getInstance().setSoundEnabled(_soundEnabled);
    AudioService.getInstance().setHapticsEnabled(_hapticsEnabled);
  }

  Future<void> _pickAndUploadAvatar(AppLocalizations t) async {
    if (!await SupabaseService.ensureAuthenticated()) {
      await _handleSessionExpired();
      return;
    }

    final picked = await image_picker_service.pickImageFileBytes();
    if (!mounted || picked.cancelled) return;
    if (!picked.success || picked.bytes == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${t.profileAvatarUploadFailed}: ${picked.message ?? 'unknown error'}',
          ),
        ),
      );
      return;
    }
    if (picked.bytes!.lengthInBytes > _maxUploadBytes) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t.profileImageTooLarge(_maxUploadMb))),
      );
      return;
    }

    setState(() => _uploadingAvatar = true);

    final ext = p
        .extension(picked.fileName ?? '')
        .replaceFirst('.', '')
        .toLowerCase();
    final url = await SupabaseService.uploadAvatar(
      picked.bytes!,
      fileExt: ext.isEmpty ? 'jpg' : ext,
    );

    if (!mounted) return;
    setState(() => _uploadingAvatar = false);

    if (url == null) {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_withDetail(t.profileAvatarUploadFailed, detail)),
        ),
      );
      return;
    }

    setState(() => _avatarUrl = url);

    final saved = await SupabaseService.updateProfile(avatarUrl: url);
    if (!mounted) return;
    if (saved) {
      await context.read<UserProvider>().refreshProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileSaveSuccess)));
    } else {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_withDetail(t.profileSaveFailed, detail))),
      );
    }
  }

  Future<void> _pickAndUploadCover(AppLocalizations t) async {
    if (!await SupabaseService.ensureAuthenticated()) {
      await _handleSessionExpired();
      return;
    }

    final picked = await image_picker_service.pickImageFileBytes();
    if (!mounted || picked.cancelled) return;
    if (!picked.success || picked.bytes == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${t.profileCoverUploadFailed}: ${picked.message ?? 'unknown error'}',
          ),
        ),
      );
      return;
    }
    if (picked.bytes!.lengthInBytes > _maxUploadBytes) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t.profileImageTooLarge(_maxUploadMb))),
      );
      return;
    }

    setState(() => _uploadingCover = true);

    final ext = p
        .extension(picked.fileName ?? '')
        .replaceFirst('.', '')
        .toLowerCase();
    final url = await SupabaseService.uploadCoverImage(
      picked.bytes!,
      fileExt: ext.isEmpty ? 'jpg' : ext,
    );

    if (!mounted) return;
    setState(() => _uploadingCover = false);

    if (url == null) {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_withDetail(t.profileCoverUploadFailed, detail)),
        ),
      );
      return;
    }

    setState(() => _coverImageUrl = url);

    final saved = await SupabaseService.updateProfile(coverImageUrl: url);
    if (!mounted) return;
    if (saved) {
      await context.read<UserProvider>().refreshProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileCoverUploadSuccess)));
    } else {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_withDetail(t.profileCoverUploadFailed, detail)),
        ),
      );
    }
  }

  Future<void> _save(AppLocalizations t) async {
    final userProvider = context.read<UserProvider>();
    if (!await SupabaseService.ensureAuthenticated()) {
      await _handleSessionExpired();
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    final username = _usernameController.text.trim();
    final bio = _bioController.text.trim();

    final ok = await userProvider.updateProfile(
      username: username,
      bio: bio.isEmpty ? null : bio,
      avatarUrl: _avatarUrl,
      coverImageUrl: _coverImageUrl,
    );

    if (!mounted) return;
    setState(() => _saving = false);

    if (ok) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileSaveSuccess)));
      Navigator.pop(context, true);
    } else {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_withDetail(t.profileSaveFailed, detail))),
      );
    }
  }

  Future<void> _generateBindingCode(AppLocalizations t) async {
    if (!await SupabaseService.ensureAuthenticated()) {
      await _handleSessionExpired();
      return;
    }

    setState(() => _generatingBindingCode = true);
    final result = await SupabaseService.generateChildBindingCode();
    if (!mounted) return;
    setState(() => _generatingBindingCode = false);

    if (result == null) {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_withDetail(t.profileSaveFailed, detail))),
      );
      return;
    }

    final expiresAt = DateTime.tryParse(result['expires_at']?.toString() ?? '');
    setState(() {
      _bindingCode = result['code']?.toString();
      _bindingCodeExpiresAt = expiresAt?.toLocal();
    });
  }

  Future<void> _copyBindingCode(AppLocalizations t) async {
    final code = _bindingCode?.trim() ?? '';
    if (code.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t.parentBindingCodeCopied)));
  }

  Future<void> _switchRole(String nextRole, AppLocalizations t) async {
    final userProvider = context.read<UserProvider>();
    if (!await SupabaseService.ensureAuthenticated()) {
      await _handleSessionExpired();
      return;
    }

    setState(() => _switchingRole = true);
    final ok = await userProvider.updateProfile(
      username: _usernameController.text.trim(),
      bio: _bioController.text.trim().isEmpty
          ? null
          : _bioController.text.trim(),
      avatarUrl: _avatarUrl,
      coverImageUrl: _coverImageUrl,
      role: nextRole,
    );

    if (!mounted) return;
    setState(() {
      _switchingRole = false;
      if (ok) {
        _role = nextRole;
        if (RoleRoutes.isParentRole(nextRole)) {
          _bindingCode = null;
          _bindingCodeExpiresAt = null;
        }
      }
    });

    if (!ok) {
      final detail = SupabaseService.lastOperationError;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_withDetail(t.profileSaveFailed, detail))),
      );
      return;
    }

    final isParent = RoleRoutes.isParentRole(nextRole);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isParent
              ? t.parentSwitchToParentSuccess
              : t.parentSwitchToLearnerSuccess,
        ),
      ),
    );

    Navigator.of(context).pushNamedAndRemoveUntil(
      isParent ? RoleRoutes.parentDashboard : RoleRoutes.home,
      (route) => false,
    );
  }

  Future<void> _setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    setState(() => _themeMode = mode);
    await context.read<ThemeProvider>().setThemeMode(mode);
  }

  Future<void> _setLanguage(String code) async {
    if (context.read<LanguageProvider>().languageCode == code) return;
    await context.read<LanguageProvider>().setLanguage(code);
  }

  Future<void> _setSoundEnabled(bool enabled) async {
    setState(() => _soundEnabled = enabled);
    await _storage?.saveSoundEnabled(enabled);
    AudioService.getInstance().setSoundEnabled(enabled);
  }

  Future<void> _setHapticsEnabled(bool enabled) async {
    setState(() => _hapticsEnabled = enabled);
    await _storage?.saveHapticsEnabled(enabled);
    AudioService.getInstance().setHapticsEnabled(enabled);
  }

  Future<void> _setNotificationsEnabled(bool enabled, AppLocalizations t) async {
    if (enabled) {
      final granted = await NotificationService.getInstance().requestPermission();
      if (!granted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t.settingsNotificationPermissionDenied)),
        );
        return;
      }
    }

    setState(() {
      _notificationsEnabled = enabled;
      if (!enabled) {
        _dailyReminderEnabled = false;
      }
    });

    await _storage?.saveNotificationsEnabled(enabled);
    if (!enabled) {
      await _storage?.saveDailyReminderEnabled(false);
      await NotificationService.getInstance().cancelAll();
    }
  }

  Future<void> _setDailyReminderEnabled(bool enabled, AppLocalizations t) async {
    if (enabled && !_notificationsEnabled) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.settingsReminderDisabledHint)));
      return;
    }

    setState(() => _dailyReminderEnabled = enabled);
    await _storage?.saveDailyReminderEnabled(enabled);

    if (enabled) {
      await NotificationService.getInstance().scheduleDailyReminder(
        hour: _dailyReminderTime.hour,
        minute: _dailyReminderTime.minute,
      );
    }
  }

  Future<void> _pickReminderTime(AppLocalizations t) async {
    if (!_dailyReminderEnabled) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.settingsReminderDisabledHint)));
      return;
    }

    final picked = await showTimePicker(
      context: context,
      initialTime: _dailyReminderTime,
    );
    if (picked == null) return;

    setState(() => _dailyReminderTime = picked);
    await _storage?.saveDailyReminderTime(
      hour: picked.hour,
      minute: picked.minute,
    );
    await NotificationService.getInstance().scheduleDailyReminder(
      hour: picked.hour,
      minute: picked.minute,
    );
  }

  Future<void> _setStreakReminderEnabled(bool enabled) async {
    setState(() => _streakReminderEnabled = enabled);
    await _storage?.saveStreakReminderEnabled(enabled);
  }

  Future<void> _setAchievementReminderEnabled(bool enabled) async {
    setState(() => _achievementReminderEnabled = enabled);
    await _storage?.saveAchievementReminderEnabled(enabled);
  }

  Future<void> _setAutoplayAudio(bool enabled) async {
    setState(() => _autoplayAudio = enabled);
    await _storage?.saveAutoplayEnabled(enabled);
  }

  Future<void> _setLearningHints(bool enabled) async {
    setState(() => _showLearningHints = enabled);
    await _storage?.saveLearningHintEnabled(enabled);
  }

  Future<void> _setDailyGoal(int minutes) async {
    setState(() => _dailyGoalMinutes = minutes);
    await _storage?.saveDailyGoalMinutes(minutes);
  }

  Future<void> _setPrivateProfile(bool enabled) async {
    setState(() => _privateProfile = enabled);
    await _storage?.savePrivateProfile(enabled);
  }

  Future<void> _setShareLearningActivity(bool enabled) async {
    setState(() => _shareLearningActivity = enabled);
    await _storage?.saveShareLearningActivity(enabled);
  }

  Future<void> _setAllowFollowers(bool enabled) async {
    setState(() => _allowFollowers = enabled);
    await _storage?.saveAllowFollowers(enabled);
  }

  Future<void> _setWifiOnlyDownloads(bool enabled) async {
    setState(() => _wifiOnlyDownloads = enabled);
    await _storage?.saveWifiOnlyDownloads(enabled);
  }

  Future<void> _clearLocalCache(AppLocalizations t) async {
    imageCache.clear();
    imageCache.clearLiveImages();
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t.settingsClearLocalCacheDone)));
  }

  Future<void> _showComingSoon(AppLocalizations t) async {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t.settingsComingSoon)));
  }

  Future<void> _signOut(AppLocalizations t) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t.settingsSignOutConfirmTitle),
        content: Text(t.settingsSignOutConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: Text(t.profileLogoutConfirm),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    await context.read<UserProvider>().logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
  }

  String _withDetail(String base, String? detail) {
    final cleaned = detail?.trim() ?? '';
    if (cleaned.isEmpty) return base;
    return '$base: $cleaned';
  }

  Future<void> _handleSessionExpired() async {
    if (!mounted) return;
    final t = context.read<LanguageProvider>().t;
    final detail = SupabaseService.lastOperationError;
    final message = t.isZh
        ? '登录已过期，请重新登录'
        : 'Session expired. Please sign in again.';
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final userProvider = context.read<UserProvider>();
    messenger.showSnackBar(
      SnackBar(content: Text(_withDetail(message, detail))),
    );
    await userProvider.logout();
    if (!mounted) return;
    navigator.pushNamedAndRemoveUntil('/login', (route) => false);
  }

  void _selectSection(_SettingsSection section) {
    if (_activeSection == section) return;
    setState(() => _activeSection = section);
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    }
  }

  bool _isQuickAccessEnabled(_SettingsSection section) {
    return true;
  }

  Widget _buildActiveSection(AppLocalizations t) {
    switch (_activeSection) {
      case _SettingsSection.account:
        return _buildAccountSection(t);
      case _SettingsSection.appearance:
        return _buildAppearanceSection(t);
      case _SettingsSection.learning:
        return _buildLearningSection(t);
      case _SettingsSection.notifications:
        return _buildNotificationsSection(t);
      case _SettingsSection.privacy:
        return _buildPrivacySection(t);
      case _SettingsSection.parent:
        return _buildParentModeSection(t);
      case _SettingsSection.support:
        return _buildSupportSection(t);
    }
  }

  List<_SectionItem> _sectionItems(AppLocalizations t) {
    return [
      _SectionItem(_SettingsSection.account, Icons.badge_outlined, t.settingsSectionAccount),
      _SectionItem(
        _SettingsSection.appearance,
        Icons.palette_outlined,
        t.settingsSectionAppearance,
      ),
      _SectionItem(
        _SettingsSection.learning,
        Icons.school_outlined,
        t.settingsSectionLearning,
      ),
      _SectionItem(
        _SettingsSection.notifications,
        Icons.notifications_active_outlined,
        t.settingsSectionNotifications,
      ),
      _SectionItem(
        _SettingsSection.privacy,
        Icons.lock_outline_rounded,
        t.settingsSectionPrivacy,
      ),
      _SectionItem(_SettingsSection.parent, Icons.family_restroom, t.parentModeSectionTitle),
      _SectionItem(
        _SettingsSection.support,
        Icons.help_center_outlined,
        t.settingsSectionSupport,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        titleSpacing: 16,
        centerTitle: false,
        toolbarHeight: 76,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(t.profileSettings),
            const SizedBox(height: 2),
            Text(
              t.profileSettingsSubtitle,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 980),
                child: Form(
                  key: _formKey,
                  child: ListView(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
                    children: [
                      _buildOverviewCard(t),
                      const SizedBox(height: 16),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final isWide = constraints.maxWidth >= 900;
                          if (isWide) {
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SizedBox(
                                  width: 220,
                                  child: _buildQuickAccess(
                                    t,
                                    verticalLayout: true,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: _buildActiveSection(t),
                                ),
                              ],
                            );
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildQuickAccess(t, verticalLayout: false),
                              const SizedBox(height: 16),
                              _buildActiveSection(t),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildOverviewCard(AppLocalizations t) {
    final user = context.watch<UserProvider>().user;
    final profileName = _usernameController.text.trim().isEmpty
        ? (user?.name.isNotEmpty == true ? user!.name : 'Primoria Learner')
        : _usernameController.text.trim();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEEF2FF), Color(0xFFF8FAFC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Row(
        children: [
          _buildAvatar(size: 68),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profileName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${t.profileRoleLabel(_role)} · ${t.profileMonthYear(_joinedAt)}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Text(
              t.settingsSupportVersion(_viewerVersion),
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF475569),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAccess(
    AppLocalizations t, {
    required bool verticalLayout,
  }) {
    final items = _sectionItems(t);
    Widget navButton(_SectionItem item) {
      final active = _activeSection == item.section;
      final enabled = _isQuickAccessEnabled(item.section);
      return AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: verticalLayout ? double.infinity : null,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: active
              ? const Color(0xFFE5E7EB)
              : const Color(0xFFF8FAFC).withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: active
                ? const Color(0xFFCBD5E1)
                : const Color(0xFFD1D5DB).withValues(alpha: 0.9),
          ),
        ),
        child: Text(
          item.label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 15,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: !enabled
                ? const Color(0xFF9CA3AF)
                : active
                ? const Color(0xFF111827)
                : const Color(0xFF4B5563),
          ),
        ),
      );
    }

    if (verticalLayout) {
      return Column(
        children: items.map((item) {
          final enabled = _isQuickAccessEnabled(item.section);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: enabled ? () => _selectSection(item.section) : null,
              child: navButton(item),
            ),
          );
        }).toList(),
      );
    }

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: items.map((item) {
        final enabled = _isQuickAccessEnabled(item.section);
        return InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled ? () => _selectSection(item.section) : null,
          child: navButton(item),
        );
      }).toList(),
    );
  }

  Widget _buildAccountSection(AppLocalizations t) {
    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.account]!,
      icon: Icons.badge_outlined,
      title: t.settingsSectionAccount,
      description: t.settingsSectionAccountDesc,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCoverPreview(t),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildAvatar(size: 84),
              const SizedBox(width: 14),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _uploadingAvatar ? null : () => _pickAndUploadAvatar(t),
                  icon: _uploadingAvatar
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.upload_rounded),
                  label: Text(t.profileUploadAvatar),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _fieldLabel(t.profileUsername),
          const SizedBox(height: 8),
          TextFormField(
            controller: _usernameController,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              hintText: t.profileUsername,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            validator: (v) {
              final text = (v ?? '').trim();
              if (text.isEmpty) return t.profileFieldRequired;
              if (text.length < 3 || text.length > 32) {
                return t.profileUsernameLengthHint;
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          _fieldLabel(t.profileBio),
          const SizedBox(height: 8),
          TextFormField(
            controller: _bioController,
            maxLines: 3,
            maxLength: 200,
            decoration: InputDecoration(
              hintText: t.profileBio,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 8),
          _infoRow(t.profileRole, t.profileRoleLabel(_role)),
          const SizedBox(height: 8),
          _infoRow(t.profileJoinedAt, t.profileMonthYear(_joinedAt)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : () => _save(t),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.indigo600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _saving
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      t.profileSave,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppearanceSection(AppLocalizations t) {
    final languageCode = context.watch<LanguageProvider>().languageCode;
    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.appearance]!,
      icon: Icons.palette_outlined,
      title: t.settingsSectionAppearance,
      description: t.settingsSectionAppearanceDesc,
      child: Column(
        children: [
          _choiceRow(
            icon: Icons.dark_mode_outlined,
            title: t.settingsThemeModeLabel,
            options: [
              _ChoiceItem<ThemeMode>(t.settingsThemeSystem, ThemeMode.system),
              _ChoiceItem<ThemeMode>(t.settingsThemeLight, ThemeMode.light),
              _ChoiceItem<ThemeMode>(t.settingsThemeDark, ThemeMode.dark),
            ],
            selected: _themeMode,
            onSelected: _setThemeMode,
          ),
          const SizedBox(height: 10),
          _choiceRow(
            icon: Icons.language_rounded,
            title: t.settingsLanguageLabel,
            options: [
              _ChoiceItem<String>('English', 'en'),
              _ChoiceItem<String>('中文', 'zh'),
            ],
            selected: languageCode,
            onSelected: _setLanguage,
          ),
        ],
      ),
    );
  }

  Widget _buildLearningSection(AppLocalizations t) {
    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.learning]!,
      icon: Icons.school_outlined,
      title: t.settingsSectionLearning,
      description: t.settingsSectionLearningDesc,
      child: Column(
        children: [
          _toggleTile(
            icon: Icons.volume_up_outlined,
            title: t.settingsSoundEffects,
            subtitle: t.settingsSoundEffectsHint,
            value: _soundEnabled,
            onChanged: _setSoundEnabled,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.vibration_outlined,
            title: t.settingsHaptics,
            subtitle: t.settingsHapticsHint,
            value: _hapticsEnabled,
            onChanged: _setHapticsEnabled,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.play_circle_outline,
            title: t.settingsAutoplayAudio,
            subtitle: t.settingsAutoplayAudioHint,
            value: _autoplayAudio,
            onChanged: _setAutoplayAudio,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.tips_and_updates_outlined,
            title: t.settingsLearningHints,
            subtitle: t.settingsLearningHintsHint,
            value: _showLearningHints,
            onChanged: _setLearningHints,
          ),
          const SizedBox(height: 10),
          _sliderTile(
            icon: Icons.flag_outlined,
            title: t.settingsDailyGoal,
            valueText: t.settingsDailyGoalValue(_dailyGoalMinutes),
            value: _dailyGoalMinutes.toDouble(),
            min: 10,
            max: 180,
            divisions: 34,
            onChanged: (v) => _setDailyGoal(v.round()),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsSection(AppLocalizations t) {
    final reminderTime = MaterialLocalizations.of(
      context,
    ).formatTimeOfDay(_dailyReminderTime);

    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.notifications]!,
      icon: Icons.notifications_active_outlined,
      title: t.settingsSectionNotifications,
      description: t.settingsSectionNotificationsDesc,
      child: Column(
        children: [
          _toggleTile(
            icon: Icons.notifications_outlined,
            title: t.settingsNotificationsMaster,
            subtitle: t.settingsNotificationsMasterHint,
            value: _notificationsEnabled,
            onChanged: (value) => _setNotificationsEnabled(value, t),
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.schedule_rounded,
            title: t.settingsDailyReminder,
            subtitle: t.settingsDailyReminderHint,
            value: _dailyReminderEnabled,
            enabled: _notificationsEnabled,
            onChanged: (value) => _setDailyReminderEnabled(value, t),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.access_time,
            title: t.settingsReminderTime,
            subtitle: reminderTime,
            enabled: _dailyReminderEnabled,
            actionLabel: t.settingsReminderPickTime,
            onTap: () => _pickReminderTime(t),
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.local_fire_department_outlined,
            title: t.settingsStreakReminder,
            subtitle: t.settingsStreakReminderHint,
            value: _streakReminderEnabled,
            enabled: _notificationsEnabled,
            onChanged: _setStreakReminderEnabled,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.workspace_premium_outlined,
            title: t.settingsAchievementReminder,
            subtitle: t.settingsAchievementReminderHint,
            value: _achievementReminderEnabled,
            enabled: _notificationsEnabled,
            onChanged: _setAchievementReminderEnabled,
          ),
        ],
      ),
    );
  }

  Widget _buildPrivacySection(AppLocalizations t) {
    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.privacy]!,
      icon: Icons.lock_outline_rounded,
      title: t.settingsSectionPrivacy,
      description: t.settingsSectionPrivacyDesc,
      child: Column(
        children: [
          _toggleTile(
            icon: Icons.visibility_off_outlined,
            title: t.settingsPrivacyProfilePrivate,
            subtitle: t.settingsPrivacyProfilePrivateHint,
            value: _privateProfile,
            onChanged: _setPrivateProfile,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.show_chart_rounded,
            title: t.settingsPrivacyShareActivity,
            subtitle: t.settingsPrivacyShareActivityHint,
            value: _shareLearningActivity,
            onChanged: _setShareLearningActivity,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.person_add_alt_1_outlined,
            title: t.settingsPrivacyAllowFollowers,
            subtitle: t.settingsPrivacyAllowFollowersHint,
            value: _allowFollowers,
            onChanged: _setAllowFollowers,
          ),
          const SizedBox(height: 10),
          _toggleTile(
            icon: Icons.wifi_outlined,
            title: t.settingsPrivacyWifiOnly,
            subtitle: t.settingsPrivacyWifiOnlyHint,
            value: _wifiOnlyDownloads,
            onChanged: _setWifiOnlyDownloads,
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.cleaning_services_outlined,
            title: t.settingsClearLocalCache,
            subtitle: t.settingsClearLocalCacheHint,
            actionLabel: t.settingsClearLocalCache,
            onTap: () => _clearLocalCache(t),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportSection(AppLocalizations t) {
    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.support]!,
      icon: Icons.help_center_outlined,
      title: t.settingsSectionSupport,
      description: t.settingsSectionSupportDesc,
      child: Column(
        children: [
          _actionTile(
            icon: Icons.help_outline_rounded,
            title: t.settingsSupportHelpCenter,
            actionLabel: t.settingsSupportHelpCenter,
            onTap: () => _showComingSoon(t),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.feedback_outlined,
            title: t.settingsSupportFeedback,
            actionLabel: t.settingsSupportFeedback,
            onTap: () => _showComingSoon(t),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.shield_outlined,
            title: t.settingsSupportPrivacyPolicy,
            actionLabel: t.settingsSupportPrivacyPolicy,
            onTap: () => _showComingSoon(t),
          ),
          const SizedBox(height: 10),
          _actionTile(
            icon: Icons.description_outlined,
            title: t.settingsSupportTerms,
            actionLabel: t.settingsSupportTerms,
            onTap: () => _showComingSoon(t),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Text(
              t.settingsSupportVersion(_viewerVersion),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF475569),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.settingsSignOut,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFB91C1C),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  t.settingsSignOutHint,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF7F1D1D),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _signOut(t),
                    icon: const Icon(Icons.logout_rounded),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    label: Text(t.profileLogoutConfirm),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildParentModeSection(AppLocalizations t) {
    final isParent = RoleRoutes.isParentRole(_role);

    return _buildSectionCard(
      key: _sectionKeys[_SettingsSection.parent]!,
      icon: Icons.family_restroom,
      title: t.parentModeSectionTitle,
      description: isParent ? t.parentModeParentBody : t.parentModeLearnerBody,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoRow(t.parentModeCurrentRole, t.profileRoleLabel(_role)),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _switchingRole
                ? null
                : () => _switchRole(isParent ? 'user' : 'parent', t),
            icon: _switchingRole
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    isParent ? Icons.school_outlined : Icons.family_restroom,
                  ),
            label: Text(
              _switchingRole
                  ? t.parentSwitching
                  : isParent
                  ? t.parentSwitchToLearner
                  : t.parentSwitchToParent,
            ),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.indigo600,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          const SizedBox(height: 12),
          if (isParent)
            OutlinedButton.icon(
              onPressed: () =>
                  Navigator.of(context).pushNamed(RoleRoutes.parentDashboard),
              icon: const Icon(Icons.dashboard_customize_outlined),
              label: Text(t.parentDashboardOpen),
            )
          else ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.parentBindingCodeTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      if (_bindingCode != null) ...[
                        const SizedBox(height: 10),
                        SelectableText(
                          _bindingCode!,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 3,
                            color: AppColors.indigo600,
                          ),
                        ),
                        if (_bindingCodeExpiresAt != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            t.parentBindingCodeExpiresAt(_bindingCodeExpiresAt!),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
                if (_bindingCode != null)
                  IconButton(
                    onPressed: () => _copyBindingCode(t),
                    icon: const Icon(Icons.copy_rounded),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _generatingBindingCode
                  ? null
                  : () => _generateBindingCode(t),
              child: _generatingBindingCode
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      _bindingCode == null
                          ? t.parentBindingCodeGenerate
                          : t.parentBindingCodeRefresh,
                    ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required Key key,
    required IconData icon,
    required String title,
    required String description,
    required Widget child,
  }) {
    return Container(
      key: key,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F0F172A),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: const Color(0xFF4338CA)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: AppTypography.label.copyWith(
        color: const Color(0xFF475569),
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _choiceRow<T>({
    required IconData icon,
    required String title,
    required List<_ChoiceItem<T>> options,
    required T selected,
    required Future<void> Function(T) onSelected,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF475569)),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF334155),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: options.map((option) {
              return ChoiceChip(
                label: Text(option.label),
                selected: selected == option.value,
                onSelected: (active) {
                  if (!active) return;
                  onSelected(option.value);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _toggleTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Future<void> Function(bool) onChanged,
    bool enabled = true,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: enabled ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Icon(icon, size: 17, color: const Color(0xFF475569)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: enabled
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: enabled
                        ? const Color(0xFF64748B)
                        : const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: enabled ? onChanged : null,
          ),
        ],
      ),
    );
  }

  Widget _actionTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required String actionLabel,
    required VoidCallback onTap,
    bool enabled = true,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: enabled ? const Color(0xFFF8FAFC) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Icon(icon, size: 17, color: const Color(0xFF475569)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: enabled
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF94A3B8),
                  ),
                ),
                if (subtitle != null && subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: enabled
                          ? const Color(0xFF64748B)
                          : const Color(0xFF94A3B8),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          TextButton(
            onPressed: enabled ? onTap : null,
            child: Text(actionLabel),
          ),
        ],
      ),
    );
  }

  Widget _sliderTile({
    required IconData icon,
    required String title,
    required String valueText,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Icon(icon, size: 17, color: const Color(0xFF475569)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              Text(
                valueText,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF475569),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildCoverPreview(AppLocalizations t) {
    final hasCover =
        _coverImageUrl != null && _coverImageUrl!.trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(t.profileCoverImage),
        const SizedBox(height: 8),
        Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 100,
                width: double.infinity,
                child: hasCover
                    ? Image.network(
                        _coverImageUrl!,
                        fit: BoxFit.cover,
                        alignment: Alignment.topCenter,
                        errorBuilder: (_, __, ___) => _coverPlaceholder(),
                      )
                    : _coverPlaceholder(),
              ),
            ),
            Positioned(
              right: 8,
              bottom: 8,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.85),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: _uploadingCover ? null : () => _pickAndUploadCover(t),
                icon: _uploadingCover
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.edit_outlined, size: 16),
                label: Text(
                  t.profileChangeCover,
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _coverPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
    );
  }

  Widget _buildAvatar({double size = 84}) {
    final provider = _avatarImageProvider(_avatarUrl);
    final fallbackInitial = _usernameController.text.trim().isNotEmpty
        ? _usernameController.text.trim()[0].toUpperCase()
        : 'U';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.indigo50,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFCFD8E3)),
      ),
      child: provider != null
          ? ClipOval(
              child: Image(image: provider, fit: BoxFit.cover),
            )
          : Center(
              child: Text(
                fallbackInitial,
                style: TextStyle(
                  fontSize: size * 0.36,
                  fontWeight: FontWeight.w800,
                  color: AppColors.indigo,
                ),
              ),
            ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF1E293B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  ImageProvider<Object>? _avatarImageProvider(String? avatarUrl) {
    final raw = avatarUrl?.trim() ?? '';
    if (raw.isEmpty) return null;

    if (raw.startsWith('data:image')) {
      final comma = raw.indexOf(',');
      if (comma <= 0 || comma >= raw.length - 1) return null;
      try {
        final bytes = base64Decode(raw.substring(comma + 1));
        return MemoryImage(bytes);
      } catch (_) {
        return null;
      }
    }

    return NetworkImage(raw);
  }
}

class _SectionItem {
  final _SettingsSection section;
  final IconData icon;
  final String label;

  const _SectionItem(this.section, this.icon, this.label);
}

class _ChoiceItem<T> {
  final String label;
  final T value;

  const _ChoiceItem(this.label, this.value);
}
