import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/image_picker_service.dart' as image_picker_service;
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import '../utils/role_routes.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  static const int _maxUploadBytes = 5 * 1024 * 1024;
  static const int _maxUploadMb = 5;

  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _bioController = TextEditingController();

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

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final profile = await SupabaseService.getProfile();
    if (!mounted) return;

    final user = context.read<UserProvider>().user;
    final username = (profile?['username'] as String?) ?? user?.name ?? '';
    final bio = (profile?['bio'] as String?) ?? user?.bio ?? '';
    final role = (profile?['role'] as String?) ?? user?.role ?? 'user';
    final joined = DateTime.tryParse((profile?['created_at'] as String?) ?? '');

    setState(() {
      _usernameController.text = username;
      _bioController.text = bio;
      _role = role;
      _joinedAt = joined ?? user?.joinedAt ?? DateTime.now();
      _avatarUrl = (profile?['avatar_url'] as String?) ?? user?.avatarUrl;
      _coverImageUrl =
          (profile?['cover_image_url'] as String?) ?? user?.coverImageUrl;
      _loading = false;
    });
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

    // Persist avatar immediately so user does not have to tap "Save" for image update.
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

    // Persist immediately — single current cover overwritten.
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

  String _withDetail(String base, String? detail) {
    final cleaned = detail?.trim() ?? '';
    if (cleaned.isEmpty) return base;
    return '$base: $cleaned';
  }

  Future<void> _handleSessionExpired() async {
    if (!mounted) return;
    final detail = SupabaseService.lastOperationError;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final userProvider = context.read<UserProvider>();
    messenger.showSnackBar(
      SnackBar(content: Text(_withDetail('登录已过期，请重新登录', detail))),
    );
    await userProvider.logout();
    if (!mounted) return;
    navigator.pushNamedAndRemoveUntil('/login', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(title: Text(t.profileSettings), centerTitle: false),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.profilePersonalInfo,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 16),
                        // Cover image preview + upload
                        _buildCoverPreview(t),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            _buildAvatar(),
                            const SizedBox(width: 14),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _uploadingAvatar
                                    ? null
                                    : () => _pickAndUploadAvatar(t),
                                icon: _uploadingAvatar
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.upload_rounded),
                                label: Text(t.profileUploadAvatar),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Text(
                          t.profileUsername,
                          style: AppTypography.label.copyWith(
                            color: const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _usernameController,
                          textInputAction: TextInputAction.next,
                          decoration: InputDecoration(
                            hintText: t.profileUsername,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
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
                        Text(
                          t.profileBio,
                          style: AppTypography.label.copyWith(
                            color: const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _bioController,
                          maxLines: 3,
                          maxLength: 200,
                          decoration: InputDecoration(
                            hintText: t.profileBio,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        _infoRow(t.profileRole, t.profileRoleLabel(_role)),
                        const SizedBox(height: 8),
                        _infoRow(
                          t.profileJoinedAt,
                          t.profileMonthYear(_joinedAt),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  _buildParentModeSection(t),
                  const SizedBox(height: 20),
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
            ),
    );
  }

  Widget _buildCoverPreview(AppLocalizations t) {
    final hasCover =
        _coverImageUrl != null && _coverImageUrl!.trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t.profileCoverImage,
          style: AppTypography.label.copyWith(color: const Color(0xFF475569)),
        ),
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
                onPressed: _uploadingCover
                    ? null
                    : () => _pickAndUploadCover(t),
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

  Widget _buildAvatar() {
    final provider = _avatarImageProvider(_avatarUrl);
    final fallbackInitial = _usernameController.text.trim().isNotEmpty
        ? _usernameController.text.trim()[0].toUpperCase()
        : 'U';

    return Container(
      width: 84,
      height: 84,
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
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: AppColors.indigo,
                ),
              ),
            ),
    );
  }

  Widget _buildParentModeSection(AppLocalizations t) {
    final isParent = RoleRoutes.isParentRole(_role);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.parentModeSectionTitle,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isParent ? t.parentModeParentBody : t.parentModeLearnerBody,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
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
                            t.parentBindingCodeExpiresAt(
                              _bindingCodeExpiresAt!,
                            ),
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
