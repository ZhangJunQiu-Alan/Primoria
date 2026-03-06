import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';
import '../theme/design_tokens.dart';

enum _BuilderSettingsSection {
  account,
  workflow,
  ai,
  notifications,
  publishing,
  integrations,
  security,
  billing,
  data,
}

class BuilderSettingsDialog extends ConsumerStatefulWidget {
  const BuilderSettingsDialog({super.key});

  @override
  ConsumerState<BuilderSettingsDialog> createState() =>
      _BuilderSettingsDialogState();
}

class _BuilderSettingsDialogState extends ConsumerState<BuilderSettingsDialog> {
  static const String _fakePlan = 'Creator Pro';

  final _displayNameController = TextEditingController();
  final _avatarUrlController = TextEditingController();
  final _webhookUrlController = TextEditingController();
  final _customDomainController = TextEditingController();

  bool _loading = true;
  bool _savingProfile = false;
  bool _savingPrefs = false;
  _BuilderSettingsSection _section = _BuilderSettingsSection.account;

  String? _email;
  String _role = 'author';

  bool _autoSave = true;
  String _defaultDifficulty = 'beginner';
  String _defaultPriceTier = 'free';
  bool _publishChecklist = true;
  bool _publishConfirm = true;

  bool _aiQualityGuard = true;
  bool _aiAutoQuiz = false;
  bool _aiStrictSchema = true;

  bool _emailNotifications = true;
  bool _commentAlerts = true;
  bool _fanAlerts = true;
  bool _weeklyDigest = true;

  bool _publicProfile = true;
  bool _usageTelemetry = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _avatarUrlController.dispose();
    _webhookUrlController.dispose();
    _customDomainController.dispose();
    super.dispose();
  }

  String _tr(BuilderLocalizations t, String zh, String en) {
    return t.isZh ? zh : en;
  }

  Future<void> _load() async {
    final user = SupabaseService.currentUser;
    if (user == null) {
      if (mounted) Navigator.of(context).pop();
      return;
    }

    await StorageService.init();
    final profile = await SupabaseService.getProfile();
    final autoSave = await StorageService.getAutoSave();

    if (!mounted) return;

    final defaultDisplayName =
        (profile?['display_name'] as String?)?.trim().isNotEmpty == true
        ? profile!['display_name'] as String
        : ((user.userMetadata?['full_name'] as String?) ??
              (user.userMetadata?['name'] as String?) ??
              user.email?.split('@').first ??
              'Creator');

    setState(() {
      _email = user.email;
      _role = ((profile?['role'] as String?) ?? 'author').trim();
      _displayNameController.text = defaultDisplayName;
      _avatarUrlController.text =
          ((profile?['avatar_url'] as String?) ??
                  (user.userMetadata?['avatar_url'] as String?) ??
                  (user.userMetadata?['picture'] as String?) ??
                  '')
              .trim();
      _webhookUrlController.text = StorageService.getWebhookUrl();
      _customDomainController.text = StorageService.getCustomDomain();

      _autoSave = autoSave;
      _defaultDifficulty = StorageService.getDefaultCourseDifficulty();
      _defaultPriceTier = StorageService.getDefaultCoursePriceTier();
      _publishChecklist = StorageService.getPublishChecklistEnabled();
      _publishConfirm = StorageService.getPublishConfirmEnabled();

      _aiQualityGuard = StorageService.getAiQualityGuardEnabled();
      _aiAutoQuiz = StorageService.getAiAutoQuizEnabled();
      _aiStrictSchema = StorageService.getAiStrictSchemaEnabled();

      _emailNotifications = StorageService.getEmailNotificationsEnabled();
      _commentAlerts = StorageService.getCommentAlertEnabled();
      _fanAlerts = StorageService.getFanAlertEnabled();
      _weeklyDigest = StorageService.getWeeklyDigestEnabled();

      _publicProfile = StorageService.getPublicProfileEnabled();
      _usageTelemetry = StorageService.getUsageTelemetryEnabled();
      _loading = false;
    });
  }

  Future<void> _saveProfile(BuilderLocalizations t) async {
    setState(() => _savingProfile = true);

    final success = await SupabaseService.updateProfile(
      displayName: _displayNameController.text.trim(),
      avatarUrl: _avatarUrlController.text.trim().isEmpty
          ? null
          : _avatarUrlController.text.trim(),
    );

    if (!mounted) return;
    setState(() => _savingProfile = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_tr(t, '账号资料已保存', 'Account profile saved')),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t.profileSaveFailed),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _savePreferences(BuilderLocalizations t) async {
    setState(() => _savingPrefs = true);

    await Future.wait([
      StorageService.setAutoSave(_autoSave),
      StorageService.saveDefaultCourseDifficulty(_defaultDifficulty),
      StorageService.saveDefaultCoursePriceTier(_defaultPriceTier),
      StorageService.savePublishChecklistEnabled(_publishChecklist),
      StorageService.savePublishConfirmEnabled(_publishConfirm),
      StorageService.saveAiQualityGuardEnabled(_aiQualityGuard),
      StorageService.saveAiAutoQuizEnabled(_aiAutoQuiz),
      StorageService.saveAiStrictSchemaEnabled(_aiStrictSchema),
      StorageService.saveEmailNotificationsEnabled(_emailNotifications),
      StorageService.saveCommentAlertEnabled(_commentAlerts),
      StorageService.saveFanAlertEnabled(_fanAlerts),
      StorageService.saveWeeklyDigestEnabled(_weeklyDigest),
      StorageService.saveWebhookUrl(_webhookUrlController.text.trim()),
      StorageService.saveCustomDomain(_customDomainController.text.trim()),
      StorageService.savePublicProfileEnabled(_publicProfile),
      StorageService.saveUsageTelemetryEnabled(_usageTelemetry),
    ]);

    if (!mounted) return;
    setState(() => _savingPrefs = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_tr(t, '偏好设置已保存', 'Preferences saved')),
        backgroundColor: AppColors.success,
      ),
    );
  }

  Future<void> _clearDrafts(BuilderLocalizations t) async {
    final removed = await StorageService.clearAllCourseDrafts();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _tr(t, '已清理 $removed 个本地草稿', 'Cleared $removed local draft(s)'),
        ),
      ),
    );
  }

  Future<void> _logout() async {
    if (mounted) Navigator.of(context).pop();
    await SupabaseService.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));

    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
      ),
      child: SizedBox(
        width: 1120,
        height: 760,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _buildHeader(t),
                  const Divider(height: 1),
                  Expanded(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final isWide = constraints.maxWidth >= 920;
                        if (isWide) {
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 250,
                                child: _buildSectionNav(t, vertical: true),
                              ),
                              const VerticalDivider(width: 1),
                              Expanded(child: _buildActivePanel(t)),
                            ],
                          );
                        }

                        return Column(
                          children: [
                            _buildSectionNav(t, vertical: false),
                            const Divider(height: 1),
                            Expanded(child: _buildActivePanel(t)),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildHeader(BuilderLocalizations t) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primary100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.tune_rounded, color: AppColors.primary700),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _tr(t, 'Builder 设置中心', 'Builder Settings Center'),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.neutral800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _tr(
                    t,
                    '为创作者工作流、AI 生成、发布与安全进行统一配置',
                    'Configure creator workflow, AI generation, publishing, and security in one place',
                  ),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.neutral500,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close),
          ),
        ],
      ),
    );
  }

  List<(_BuilderSettingsSection, IconData, String)> _sections(
    BuilderLocalizations t,
  ) {
    return [
      (
        _BuilderSettingsSection.account,
        Icons.person_outline_rounded,
        _tr(t, '账号与品牌', 'Account & Brand'),
      ),
      (
        _BuilderSettingsSection.workflow,
        Icons.route_rounded,
        _tr(t, '创作工作流', 'Creator Workflow'),
      ),
      (
        _BuilderSettingsSection.ai,
        Icons.auto_awesome,
        _tr(t, 'AI Studio', 'AI Studio'),
      ),
      (
        _BuilderSettingsSection.notifications,
        Icons.notifications_active_outlined,
        _tr(t, '通知策略', 'Notifications'),
      ),
      (
        _BuilderSettingsSection.publishing,
        Icons.publish_outlined,
        _tr(t, '发布与 SEO', 'Publishing & SEO'),
      ),
      (
        _BuilderSettingsSection.integrations,
        Icons.hub_outlined,
        _tr(t, '集成与 API', 'Integrations & API'),
      ),
      (
        _BuilderSettingsSection.security,
        Icons.security_outlined,
        _tr(t, '安全与访问', 'Security & Access'),
      ),
      (
        _BuilderSettingsSection.billing,
        Icons.credit_card_outlined,
        _tr(t, '计费与计划', 'Billing & Plans'),
      ),
      (
        _BuilderSettingsSection.data,
        Icons.storage_rounded,
        _tr(t, '数据控制', 'Data Controls'),
      ),
    ];
  }

  Widget _buildSectionNav(BuilderLocalizations t, {required bool vertical}) {
    final sections = _sections(t);

    Widget item(_BuilderSettingsSection section, IconData icon, String label) {
      final active = _section == section;
      return InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _section = section),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color: active ? AppColors.primary100 : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: active ? AppColors.primary300 : AppColors.neutral200,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 16,
                color: active ? AppColors.primary700 : AppColors.neutral500,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                  color: active ? AppColors.primary700 : AppColors.neutral700,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (vertical) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: ListView(
          children: sections
              .map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: item(entry.$1, entry.$2, entry.$3),
                ),
              )
              .toList(),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: sections
            .map(
              (entry) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: item(entry.$1, entry.$2, entry.$3),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildActivePanel(BuilderLocalizations t) {
    switch (_section) {
      case _BuilderSettingsSection.account:
        return _buildAccountPanel(t);
      case _BuilderSettingsSection.workflow:
        return _buildWorkflowPanel(t);
      case _BuilderSettingsSection.ai:
        return _buildAiPanel(t);
      case _BuilderSettingsSection.notifications:
        return _buildNotificationPanel(t);
      case _BuilderSettingsSection.publishing:
        return _buildPublishingPanel(t);
      case _BuilderSettingsSection.integrations:
        return _buildIntegrationsPanel(t);
      case _BuilderSettingsSection.security:
        return _buildSecurityPanel(t);
      case _BuilderSettingsSection.billing:
        return _buildBillingPanel(t);
      case _BuilderSettingsSection.data:
        return _buildDataPanel(t);
    }
  }

  Widget _panelShell({
    required BuilderLocalizations t,
    required String title,
    required String subtitle,
    required List<Widget> children,
  }) {
    return SingleChildScrollView(
      key: ValueKey(_section),
      physics: const ClampingScrollPhysics(),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary50.withValues(alpha: 0.7),
                  AppColors.secondary50.withValues(alpha: 0.65),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.neutral800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.neutral600,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                _avatarPreview(size: 46),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _settingsCard({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.neutral800,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _toggleTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.neutral50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.neutral800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.neutral500,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(value: value, onChanged: onChanged),
        ],
      ),
    );
  }

  Widget _avatarPreview({double size = 70}) {
    final url = _avatarUrlController.text.trim();
    final initial = _displayNameController.text.trim().isNotEmpty
        ? _displayNameController.text.trim()[0].toUpperCase()
        : (_email?.isNotEmpty == true ? _email![0].toUpperCase() : 'A');

    if (url.isEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.primary100,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.primary300),
        ),
        alignment: Alignment.center,
        child: Text(
          initial,
          style: TextStyle(
            fontSize: size * 0.34,
            fontWeight: FontWeight.w800,
            color: AppColors.primary700,
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.primary300),
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          color: AppColors.primary100,
          alignment: Alignment.center,
          child: Text(
            initial,
            style: TextStyle(
              fontSize: size * 0.34,
              fontWeight: FontWeight.w800,
              color: AppColors.primary700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAccountPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '账号与品牌资料', 'Account & Brand Profile'),
      subtitle: _tr(
        t,
        '管理公开展示信息，保持创作者身份一致性。',
        'Manage public-facing profile and creator branding basics.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '身份信息', 'Identity'),
          child: Column(
            children: [
              TextFormField(
                initialValue: _email,
                enabled: false,
                decoration: InputDecoration(
                  labelText: t.profileEmail,
                  prefixIcon: const Icon(Icons.email_outlined),
                  filled: true,
                  fillColor: AppColors.neutral100,
                ),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _displayNameController,
                decoration: InputDecoration(
                  labelText: t.profileDisplayName,
                  hintText: t.profileDisplayNameHint,
                  prefixIcon: const Icon(Icons.badge_outlined),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _avatarUrlController,
                decoration: InputDecoration(
                  labelText: _tr(t, '头像 URL', 'Avatar URL'),
                  hintText: 'https://...',
                  prefixIcon: const Icon(Icons.link_outlined),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _avatarPreview(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.neutral50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.neutral200),
                      ),
                      child: Text(
                        _tr(
                          t,
                          '当前角色：${_role.toUpperCase()}\n你可以继续在 Dashboard 与 Builder 内使用该身份。',
                          'Current role: ${_role.toUpperCase()}\nYour role controls access across Dashboard and Builder.',
                        ),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.neutral600,
                          fontWeight: FontWeight.w600,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _savingProfile
                          ? null
                          : () => _showLanguagePicker(context, t),
                      icon: const Icon(Icons.language),
                      label: Text(
                        _tr(
                          t,
                          '界面语言：${t.langDisplayName}',
                          'Language: ${t.langDisplayName}',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.icon(
                    onPressed: _savingProfile ? null : () => _saveProfile(t),
                    icon: _savingProfile
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.save_outlined),
                    label: Text(_tr(t, '保存账号', 'Save Account')),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWorkflowPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '创作工作流', 'Creator Workflow'),
      subtitle: _tr(
        t,
        '定义课程默认值与发布前检查策略。',
        'Set default course behavior and pre-publish safety checks.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '课程默认值', 'Course Defaults'),
          child: Column(
            children: [
              _toggleTile(
                title: _tr(t, '自动保存草稿', 'Auto-save Drafts'),
                subtitle: _tr(
                  t,
                  '在编辑过程中持续保存草稿，减少误操作损失。',
                  'Continuously save browser drafts while editing.',
                ),
                value: _autoSave,
                onChanged: (v) => setState(() => _autoSave = v),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _defaultDifficulty,
                decoration: InputDecoration(
                  labelText: _tr(t, '默认难度', 'Default Difficulty'),
                ),
                items: [
                  DropdownMenuItem(
                    value: 'beginner',
                    child: Text(t.difficultyBeginner),
                  ),
                  DropdownMenuItem(
                    value: 'intermediate',
                    child: Text(t.difficultyIntermediate),
                  ),
                  DropdownMenuItem(
                    value: 'advanced',
                    child: Text(t.difficultyAdvanced),
                  ),
                ],
                onChanged: (v) => setState(
                  () => _defaultDifficulty = v ?? _defaultDifficulty,
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _defaultPriceTier,
                decoration: InputDecoration(
                  labelText: _tr(t, '默认定价', 'Default Price Tier'),
                ),
                items: [
                  DropdownMenuItem(value: 'free', child: Text(t.priceFree)),
                  DropdownMenuItem(
                    value: 'premium',
                    child: Text(t.pricePremium),
                  ),
                ],
                onChanged: (v) =>
                    setState(() => _defaultPriceTier = v ?? _defaultPriceTier),
              ),
            ],
          ),
        ),
        _settingsCard(
          title: _tr(t, '发布防护', 'Publish Guardrails'),
          child: Column(
            children: [
              _toggleTile(
                title: _tr(t, '发布前检查清单', 'Pre-publish Checklist'),
                subtitle: _tr(
                  t,
                  '发布时提示检查封面、简介、课时完整性。',
                  'Require final checks for cover, description, and lesson completeness.',
                ),
                value: _publishChecklist,
                onChanged: (v) => setState(() => _publishChecklist = v),
              ),
              _toggleTile(
                title: _tr(t, '二次确认发布', 'Require Publish Confirmation'),
                subtitle: _tr(
                  t,
                  '防止误发布，发布动作需明确确认。',
                  'Prevent accidental publishing with an explicit confirmation step.',
                ),
                value: _publishConfirm,
                onChanged: (v) => setState(() => _publishConfirm = v),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _savingPrefs ? null : () => _savePreferences(t),
                  child: Text(
                    _savingPrefs
                        ? _tr(t, '保存中...', 'Saving...')
                        : _tr(t, '保存偏好', 'Save Preferences'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAiPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, 'AI Studio 策略', 'AI Studio Strategy'),
      subtitle: _tr(
        t,
        '约束 AI 生成行为，减少低质量课程输出。',
        'Control AI behavior to reduce low-quality generation output.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, 'AI 质量守卫', 'AI Guardrails'),
          child: Column(
            children: [
              _toggleTile(
                title: _tr(t, '启用质量评分门槛', 'Enable Quality Score Gate'),
                subtitle: _tr(
                  t,
                  '当生成质量分低于阈值时提示优化。',
                  'Prompt enhancement when quality score is below threshold.',
                ),
                value: _aiQualityGuard,
                onChanged: (v) => setState(() => _aiQualityGuard = v),
              ),
              _toggleTile(
                title: _tr(t, '自动补全期末测验', 'Auto Add Final Quiz'),
                subtitle: _tr(
                  t,
                  '在课程缺少收尾评估时自动建议测验。',
                  'Suggest a final quiz when generated courses miss assessment closure.',
                ),
                value: _aiAutoQuiz,
                onChanged: (v) => setState(() => _aiAutoQuiz = v),
              ),
              _toggleTile(
                title: _tr(t, '严格 Schema 校验', 'Strict Schema Validation'),
                subtitle: _tr(
                  t,
                  '导入与生成均使用严格结构校验。',
                  'Apply stricter schema validation for generated/imported content.',
                ),
                value: _aiStrictSchema,
                onChanged: (v) => setState(() => _aiStrictSchema = v),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _savingPrefs ? null : () => _savePreferences(t),
                  child: Text(
                    _savingPrefs
                        ? _tr(t, '保存中...', 'Saving...')
                        : _tr(t, '保存 AI 策略', 'Save AI Settings'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '通知策略', 'Notification Routing'),
      subtitle: _tr(
        t,
        '定义创作者消息与运营提醒的接收方式。',
        'Choose how creator alerts and growth signals are delivered.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '提醒开关', 'Alert Toggles'),
          child: Column(
            children: [
              _toggleTile(
                title: _tr(t, '邮件通知总开关', 'Master Email Notifications'),
                subtitle: _tr(
                  t,
                  '关闭后仅保留应用内状态。',
                  'Disables all email notifications.',
                ),
                value: _emailNotifications,
                onChanged: (v) => setState(() => _emailNotifications = v),
              ),
              _toggleTile(
                title: _tr(t, '新评论提醒', 'New Comment Alerts'),
                subtitle: _tr(
                  t,
                  '课程收到新评论时提醒。',
                  'Notify when learners leave comments.',
                ),
                value: _commentAlerts,
                onChanged: (v) => setState(() => _commentAlerts = v),
              ),
              _toggleTile(
                title: _tr(t, '粉丝增长提醒', 'Follower Growth Alerts'),
                subtitle: _tr(
                  t,
                  '粉丝数出现变化时提醒。',
                  'Notify when follower count changes.',
                ),
                value: _fanAlerts,
                onChanged: (v) => setState(() => _fanAlerts = v),
              ),
              _toggleTile(
                title: _tr(t, '每周运营摘要', 'Weekly Performance Digest'),
                subtitle: _tr(
                  t,
                  '每周汇总课程浏览、互动与完课趋势。',
                  'Weekly summary of views, engagement, and completion trend.',
                ),
                value: _weeklyDigest,
                onChanged: (v) => setState(() => _weeklyDigest = v),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _savingPrefs ? null : () => _savePreferences(t),
                  child: Text(
                    _savingPrefs
                        ? _tr(t, '保存中...', 'Saving...')
                        : _tr(t, '保存通知偏好', 'Save Notification Settings'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPublishingPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '发布与 SEO', 'Publishing & SEO'),
      subtitle: _tr(
        t,
        '配置内容对外展示和搜索分发策略。',
        'Configure public distribution and discoverability defaults.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '站点配置', 'Channel Configuration'),
          child: Column(
            children: [
              TextFormField(
                controller: _customDomainController,
                decoration: InputDecoration(
                  labelText: _tr(t, '自定义域名', 'Custom Domain'),
                  hintText: 'academy.example.com',
                  prefixIcon: const Icon(Icons.language),
                ),
              ),
              const SizedBox(height: 10),
              _toggleTile(
                title: _tr(t, '公开创作者资料页', 'Public Creator Profile'),
                subtitle: _tr(
                  t,
                  '允许访客通过资料页查看你的课程集合。',
                  'Allow visitors to browse your creator profile and course catalog.',
                ),
                value: _publicProfile,
                onChanged: (v) => setState(() => _publicProfile = v),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _savingPrefs ? null : () => _savePreferences(t),
                  child: Text(
                    _savingPrefs
                        ? _tr(t, '保存中...', 'Saving...')
                        : _tr(t, '保存发布设置', 'Save Publishing Settings'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIntegrationsPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '集成与 API', 'Integrations & API'),
      subtitle: _tr(
        t,
        '连接外部系统，打通运营自动化链路。',
        'Connect external systems for operational automations.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, 'Webhook', 'Webhook'),
          child: Column(
            children: [
              TextFormField(
                controller: _webhookUrlController,
                decoration: InputDecoration(
                  labelText: _tr(t, '回调地址', 'Endpoint URL'),
                  hintText: 'https://hooks.example.com/primoria',
                  prefixIcon: const Icon(Icons.link_outlined),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              _tr(t, '测试发送稍后接入', 'Test delivery coming soon'),
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.send_outlined),
                      label: Text(_tr(t, '测试发送', 'Test Delivery')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton(
                    onPressed: _savingPrefs ? null : () => _savePreferences(t),
                    child: Text(
                      _savingPrefs
                          ? _tr(t, '保存中...', 'Saving...')
                          : _tr(t, '保存 Webhook', 'Save Webhook'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        _settingsCard(
          title: _tr(t, 'API 凭证', 'API Credentials'),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.neutral50,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Text(
              _tr(
                t,
                '公开密钥与私钥管理将在后续版本接入（建议与工作区角色权限联动）。',
                'Public/secret key management will be added in a follow-up release with workspace role controls.',
              ),
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.neutral600,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '安全与访问', 'Security & Access'),
      subtitle: _tr(
        t,
        '管理账号会话和访问边界。',
        'Manage session safety and access boundaries.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '账号状态', 'Account Status'),
          child: Column(
            children: [
              _kvRow(_tr(t, '登录邮箱', 'Sign-in Email'), _email ?? '--'),
              _kvRow(_tr(t, '当前角色', 'Current Role'), _role.toUpperCase()),
              _kvRow(_tr(t, '当前计划', 'Current Plan'), _fakePlan),
            ],
          ),
        ),
        _settingsCard(
          title: _tr(t, '会话操作', 'Session Actions'),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          _tr(
                            t,
                            '全设备登出能力稍后接入',
                            'Sign-out-all-devices will be added soon',
                          ),
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.devices_outlined),
                  label: Text(_tr(t, '退出其他设备', 'Sign out other devices')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _logout,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.error,
                  ),
                  icon: const Icon(Icons.logout),
                  label: Text(t.profileSignOut),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBillingPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '计费与计划', 'Billing & Plans'),
      subtitle: _tr(
        t,
        '管理订阅权益、用量包和团队席位。',
        'Manage subscription benefits, usage packs, and seats.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '当前计划', 'Current Subscription'),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.accent100.withValues(alpha: 0.55),
                  AppColors.secondary100.withValues(alpha: 0.55),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.neutral200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fakePlan,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.neutral800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _tr(
                          t,
                          '包含 AI 生成、高级分析与品牌配置。',
                          'Includes AI generation, advanced analytics, and branding controls.',
                        ),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.neutral600,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          _tr(t, '计费工作台稍后接入', 'Billing workspace coming soon'),
                        ),
                      ),
                    );
                  },
                  child: Text(_tr(t, '管理计划', 'Manage Plan')),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDataPanel(BuilderLocalizations t) {
    return _panelShell(
      t: t,
      title: _tr(t, '数据控制', 'Data Controls'),
      subtitle: _tr(
        t,
        '处理本地草稿、导出与数据采集策略。',
        'Manage local drafts, export pathways, and telemetry policy.',
      ),
      children: [
        _settingsCard(
          title: _tr(t, '隐私与采集', 'Privacy & Telemetry'),
          child: Column(
            children: [
              _toggleTile(
                title: _tr(t, '使用行为遥测', 'Usage Telemetry'),
                subtitle: _tr(
                  t,
                  '用于改进编辑器性能和交互体验。',
                  'Share anonymized usage signals to improve editor UX.',
                ),
                value: _usageTelemetry,
                onChanged: (v) => setState(() => _usageTelemetry = v),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: _savingPrefs ? null : () => _savePreferences(t),
                  child: Text(
                    _savingPrefs
                        ? _tr(t, '保存中...', 'Saving...')
                        : _tr(t, '保存数据策略', 'Save Data Settings'),
                  ),
                ),
              ),
            ],
          ),
        ),
        _settingsCard(
          title: _tr(t, '本地草稿', 'Local Drafts'),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _tr(
                    t,
                    '清空浏览器中的课程草稿缓存，不影响云端正式课程。',
                    'Clear browser-stored course drafts without affecting cloud courses.',
                  ),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.neutral600,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: () => _clearDrafts(t),
                icon: const Icon(Icons.delete_sweep_outlined),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                ),
                label: Text(_tr(t, '清理草稿', 'Clear Drafts')),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _kvRow(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 140,
            child: Text(
              k,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.neutral500,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              v,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.neutral800,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguagePicker(BuildContext context, BuilderLocalizations t) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final currentCode = ref.read(languageProvider);
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t.profileLanguageTitle,
                style: const TextStyle(
                  fontSize: AppFontSize.lg,
                  fontWeight: FontWeight.w700,
                  color: AppColors.neutral800,
                ),
              ),
              const SizedBox(height: 16),
              _LanguageOption(
                flag: '🇺🇸',
                label: BuilderLocalizations.langEnglish,
                selected: currentCode == 'en',
                onTap: () {
                  ref.read(languageProvider.notifier).setLanguage('en');
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 12),
              _LanguageOption(
                flag: '🇨🇳',
                label: BuilderLocalizations.langChinese,
                selected: currentCode == 'zh',
                onTap: () {
                  ref.read(languageProvider.notifier).setLanguage('zh');
                  Navigator.pop(ctx);
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LanguageOption extends StatelessWidget {
  final String flag;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.flag,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary100 : AppColors.neutral100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary500 : AppColors.neutral200,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(flag, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: AppFontSize.md,
                  fontWeight: FontWeight.w600,
                  color: selected ? AppColors.primary600 : AppColors.neutral700,
                ),
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle,
                color: AppColors.primary500,
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
