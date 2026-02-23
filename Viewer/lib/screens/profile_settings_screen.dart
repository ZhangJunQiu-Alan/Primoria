import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/image_picker_service.dart' as image_picker_service;
import '../services/supabase_service.dart';
import '../theme/theme.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _bioController = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  bool _uploadingAvatar = false;

  String _role = 'user';
  DateTime _joinedAt = DateTime.now();
  String? _avatarUrl;

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
      _loading = false;
    });
  }

  Future<void> _pickAndUploadAvatar(AppLocalizations t) async {
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileAvatarUploadFailed)));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileSaveFailed)));
    }
  }

  Future<void> _save(AppLocalizations t) async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    final username = _usernameController.text.trim();
    final bio = _bioController.text.trim();

    final ok = await context.read<UserProvider>().updateProfile(
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.profileSaveFailed)));
    }
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
