import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../services/supabase_service.dart';

/// 用户资料编辑对话框
class ProfileDialog extends StatefulWidget {
  const ProfileDialog({super.key});

  @override
  State<ProfileDialog> createState() => _ProfileDialogState();
}

class _ProfileDialogState extends State<ProfileDialog> {
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
            // 标题
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
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Profile',
                        style: TextStyle(
                          fontSize: AppFontSize.xl,
                          fontWeight: FontWeight.w600,
                          color: AppColors.neutral800,
                        ),
                      ),
                      Text(
                        'Edit your public info',
                        style: TextStyle(
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
              // 头像
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

              // 邮箱（只读）
              TextFormField(
                initialValue: _email,
                enabled: false,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined, size: 20),
                  filled: true,
                  fillColor: AppColors.neutral100,
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // 显示名称
              TextFormField(
                controller: _nameController,
                enabled: !_isSaving,
                decoration: const InputDecoration(
                  labelText: 'Display name',
                  hintText: 'How should we call you?',
                  prefixIcon: Icon(Icons.person_outline, size: 20),
                ),
              ),

              // 错误信息
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
                      const Icon(Icons.error_outline, size: 18, color: AppColors.error),
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

              // 保存按钮
              ElevatedButton(
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Text('Save'),
              ),

              const SizedBox(height: AppSpacing.md),

              // 退出登录
              TextButton(
                onPressed: _isSaving ? null : _logout,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.error,
                ),
                child: const Text('Sign out'),
              ),
            ],
          ],
        ),
      ),
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

  Future<void> _saveProfile() async {
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
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated'),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      setState(() {
        _errorMessage = 'Save failed. Please try again.';
      });
    }
  }

  Future<void> _logout() async {
    await SupabaseService.signOut();
    if (mounted) {
      Navigator.pop(context);
    }
  }
}
