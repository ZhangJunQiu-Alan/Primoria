import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../theme/design_tokens.dart';
import '../services/supabase_service.dart';

/// User profile edit dialog
class ProfileDialog extends ConsumerStatefulWidget {
  const ProfileDialog({super.key});

  @override
  ConsumerState<ProfileDialog> createState() => _ProfileDialogState();
}

class _ProfileDialogState extends ConsumerState<ProfileDialog> {
  final _nameController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _email;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final user = SupabaseService.currentUser;
    if (user == null) {
      Navigator.pop(context);
      return;
    }

    _email = user.email;

    final profile = await SupabaseService.getProfile();
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (profile != null) {
          _nameController.text = profile['display_name'] ?? '';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
      ),
      child: Container(
        width: 400,
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.primary100,
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  ),
                  child: const Icon(
                    Icons.person,
                    color: AppColors.primary500,
                    size: 28,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.profileTitle,
                        style: const TextStyle(
                          fontSize: AppFontSize.xl,
                          fontWeight: FontWeight.w600,
                          color: AppColors.neutral800,
                        ),
                      ),
                      Text(
                        t.profileSubtitle,
                        style: const TextStyle(
                          fontSize: AppFontSize.sm,
                          color: AppColors.neutral500,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: AppColors.neutral400),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.lg),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xl),
                  child: CircularProgressIndicator(),
                ),
              )
            else ...[
              // Avatar
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: AppColors.primary100,
                      child: Text(
                        _getInitials(),
                        style: const TextStyle(
                          fontSize: AppFontSize.xxl,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary600,
                        ),
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.xs),
                        decoration: BoxDecoration(
                          color: AppColors.primary500,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(
                          Icons.camera_alt,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Email (read-only)
              TextFormField(
                initialValue: _email,
                enabled: false,
                decoration: InputDecoration(
                  labelText: t.profileEmail,
                  prefixIcon: const Icon(Icons.email_outlined, size: 20),
                  filled: true,
                  fillColor: AppColors.neutral100,
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Display name
              TextFormField(
                controller: _nameController,
                enabled: !_isSaving,
                decoration: InputDecoration(
                  labelText: t.profileDisplayName,
                  hintText: t.profileDisplayNameHint,
                  prefixIcon: const Icon(Icons.person_outline, size: 20),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Language tile
              InkWell(
                onTap: () => _showLanguagePicker(context, t),
                borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 14,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.neutral300),
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.language,
                        size: 20,
                        color: AppColors.neutral500,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          t.profileLanguage,
                          style: const TextStyle(
                            fontSize: AppFontSize.md,
                            color: AppColors.neutral700,
                          ),
                        ),
                      ),
                      Text(
                        t.langDisplayName,
                        style: const TextStyle(
                          fontSize: AppFontSize.sm,
                          color: AppColors.neutral500,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: AppColors.neutral400,
                      ),
                    ],
                  ),
                ),
              ),

              // Error message
              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 18,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            fontSize: AppFontSize.sm,
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.lg),

              // Save button
              ElevatedButton(
                onPressed: _isSaving ? null : () => _saveProfile(t),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : Text(t.profileSave),
              ),

              const SizedBox(height: AppSpacing.md),

              // Sign out
              TextButton(
                onPressed: _isSaving ? null : _logout,
                style: TextButton.styleFrom(foregroundColor: AppColors.error),
                child: Text(t.profileSignOut),
              ),
            ],
          ],
        ),
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

  String _getInitials() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      return _email?.substring(0, 1).toUpperCase() ?? '?';
    }
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  }

  Future<void> _saveProfile(BuilderLocalizations t) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.maybeOf(context);

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final success = await SupabaseService.updateProfile(
      displayName: _nameController.text.trim(),
    );

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    if (success) {
      if (navigator.mounted && navigator.canPop()) {
        navigator.pop();
      }
      if (messenger != null && messenger.mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(t.profileUpdated),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } else {
      setState(() {
        _errorMessage = t.profileSaveFailed;
      });
    }
  }

  Future<void> _logout() async {
    // Dismiss the dialog BEFORE signing out so that GoRouter's subsequent
    // navigation to '/' (triggered by the signedOut event) doesn't find a
    // deactivated dialog context still on the stack.
    if (mounted) Navigator.of(context).pop();
    await SupabaseService.signOut();
  }
}

/// Single language option row inside the picker sheet
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
