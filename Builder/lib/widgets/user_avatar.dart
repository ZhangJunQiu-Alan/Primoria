import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/supabase_service.dart';
import '../theme/design_tokens.dart';
import 'auth_dialog.dart';
import 'profile_dialog.dart';

/// Circular user avatar button that reacts to auth state.
///
/// - Logged in  → shows profile photo (or initials fallback) + popup menu
/// - Logged out → shows a person icon; tap opens auth dialog
class UserAvatar extends StatelessWidget {
  /// Diameter of the circle.
  final double size;

  /// Optional callback fired after a successful sign-in.
  final VoidCallback? onSignedIn;

  const UserAvatar({super.key, this.size = 38, this.onSignedIn});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: SupabaseService.authStateChanges,
      builder: (context, _) {
        final isLoggedIn = SupabaseService.isLoggedIn;
        final user = SupabaseService.currentUser;

        if (!isLoggedIn) {
          return _circle(
            context,
            child: const Icon(
              Icons.person_outline,
              color: Color(0xFF4D7CFF),
              size: 20,
            ),
            onTap: () => _showAuthDialog(context),
          );
        }

        // Try to get avatar URL from OAuth user_metadata
        final meta = user?.userMetadata;
        final avatarUrl =
            meta?['avatar_url'] as String? ?? meta?['picture'] as String?;
        final name =
            meta?['full_name'] as String? ??
            meta?['name'] as String? ??
            user?.email ??
            '';

        return PopupMenuButton<String>(
          offset: const Offset(0, 46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: _avatarCircle(avatarUrl, name),
          itemBuilder: (_) => [
            PopupMenuItem(
              enabled: false,
              child: Text(
                user?.email ?? 'Signed in',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.neutral600,
                ),
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'profile',
              child: Row(
                children: [
                  Icon(Icons.settings_outlined, size: 18),
                  SizedBox(width: 8),
                  Text('Profile'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'dashboard',
              child: Row(
                children: [
                  Icon(Icons.dashboard_outlined, size: 18),
                  SizedBox(width: 8),
                  Text('Dashboard'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout, size: 18, color: AppColors.error),
                  SizedBox(width: 8),
                  Text('Sign out', style: TextStyle(color: AppColors.error)),
                ],
              ),
            ),
          ],
          onSelected: (value) {
            switch (value) {
              case 'profile':
                showDialog(
                  context: context,
                  builder: (_) => const ProfileDialog(),
                );
              case 'dashboard':
                context.go('/dashboard');
              case 'logout':
                _logout(context);
            }
          },
        );
      },
    );
  }

  // ─── helpers ───

  Widget _avatarCircle(String? avatarUrl, String name) {
    final normalizedUrl = avatarUrl?.trim() ?? '';
    final initials = _getInitials(name);

    final avatarFrame = BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: const Color(0xFF4D7CFF), width: 2),
      boxShadow: const [
        BoxShadow(
          color: Color(0x334D7CFF),
          blurRadius: 6,
          offset: Offset(0, 2),
        ),
      ],
    );

    if (normalizedUrl.isEmpty) {
      return _initialsAvatar(initials, decoration: avatarFrame);
    }

    return Container(
      width: size,
      height: size,
      decoration: avatarFrame,
      child: ClipOval(
        child: Image.network(
          normalizedUrl,
          fit: BoxFit.cover,
          width: size,
          height: size,
          errorBuilder: (_, __, ___) => _initialsAvatarBody(initials),
        ),
      ),
    );
  }

  Widget _initialsAvatar(String initials, {required BoxDecoration decoration}) {
    return Container(
      width: size,
      height: size,
      decoration: decoration,
      child: _initialsAvatarBody(initials),
    );
  }

  Widget _initialsAvatarBody(String initials) {
    return Container(
      color: const Color(0xFF4D7CFF),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          fontSize: size * 0.38,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _circle(
    BuildContext context, {
    required Widget child,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFFE8EDFB),
          border: Border.all(color: const Color(0xFF4D7CFF), width: 2),
        ),
        alignment: Alignment.center,
        child: child,
      ),
    );
  }

  String _getInitials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    if (trimmed.contains('@')) {
      return trimmed[0].toUpperCase();
    }
    final parts = trimmed.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return trimmed[0].toUpperCase();
  }

  void _showAuthDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AuthDialog(
        onSuccess: () {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Signed in'),
                backgroundColor: AppColors.success,
              ),
            );
          }
          onSignedIn?.call();
        },
      ),
    );
  }

  Future<void> _logout(BuildContext context) async {
    await SupabaseService.signOut();
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Signed out')));
    }
  }
}
