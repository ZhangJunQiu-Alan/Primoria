import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../services/supabase_service.dart';
import '../../theme/design_tokens.dart';

/// Screen that handles OAuth callback redirects.
///
/// Shows a spinner while waiting for auth completion, parses error params
/// from the URL, and redirects to the intended destination on success.
class AuthCallbackScreen extends ConsumerStatefulWidget {
  const AuthCallbackScreen({super.key});

  @override
  ConsumerState<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends ConsumerState<AuthCallbackScreen> {
  StreamSubscription<AuthState>? _authSub;
  Timer? _timeoutTimer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkForErrors();
    _listenForAuth();
  }

  void _checkForErrors() {
    final uri = Uri.base;
    // Check both query params and fragment params for error info
    final params = {
      ...uri.queryParameters,
      ...Uri.splitQueryString(uri.fragment),
    };

    final error = params['error'] ?? params['error_description'];
    if (error != null) {
      final t = BuilderLocalizations(ref.read(languageProvider));
      setState(() => _error = _humanizeError(error, t));
    }
  }

  String _humanizeError(String raw, BuilderLocalizations t) {
    if (raw.contains('access_denied') || raw.contains('cancelled')) {
      return t.isZh ? '登录已取消，请重试。' : 'Sign-in was cancelled. Please try again.';
    }
    if (raw.contains('invalid_request') || raw.contains('invalid_state')) {
      return t.isZh ? '登录会话已过期，请重试。' : 'The sign-in session has expired. Please try again.';
    }
    if (raw.contains('Unsupported provider') ||
        raw.contains('provider is not enabled')) {
      return t.isZh
          ? 'Supabase Auth 尚未启用该登录提供商。'
          : 'This login provider is not enabled in Supabase Auth.';
    }
    if (raw.contains('redirect_to') && raw.contains('not allowed')) {
      return t.isZh
          ? '回调 URL 未被允许，请将其加入 Supabase redirect URLs。'
          : 'This callback URL is not allowed. Add it to Supabase redirect URLs.';
    }
    if (raw.contains('server_error')) {
      return t.isZh
          ? '认证服务器发生错误，请稍后重试。'
          : 'The authentication server encountered an error. Please try again later.';
    }
    return t.isZh ? '登录失败：$raw' : 'Sign-in failed: $raw';
  }

  void _listenForAuth() {
    // If already logged in (SDK auto-parsed the token), redirect immediately
    if (SupabaseService.isLoggedIn) {
      _onSuccess();
      return;
    }

    // If there's already an error, don't wait
    if (_error != null) return;

    // Listen for auth state changes
    _authSub = SupabaseService.authStateChanges.listen((authState) {
      if (authState.event == AuthChangeEvent.signedIn) {
        _onSuccess();
      }
    });

    // Timeout after 10 seconds
    _timeoutTimer = Timer(const Duration(seconds: 10), () {
      if (mounted && !SupabaseService.isLoggedIn && _error == null) {
        final t = BuilderLocalizations(ref.read(languageProvider));
        setState(() => _error = t.isZh ? '登录超时，请重试。' : 'Sign-in timed out. Please try again.');
      }
    });
  }

  Future<void> _onSuccess() async {
    if (!mounted) return;
    final hasAccess = await SupabaseService.ensureBuilderAccess(
      signOutIfDenied: true,
    );
    if (!mounted) return;
    if (!hasAccess) {
      setState(() => _error = SupabaseService.builderAccessDeniedMessage);
      return;
    }
    final destination =
        SupabaseService.consumePendingRedirect() ?? '/dashboard';
    context.go(destination);
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: _error != null ? _buildErrorCard(t) : _buildLoading(t),
      ),
    );
  }

  Widget _buildLoading(BuilderLocalizations t) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 40,
          height: 40,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            color: AppColors.primary500,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          t.isZh ? '登录中...' : 'Signing in...',
          style: TextStyle(
            fontSize: AppFontSize.lg,
            color: AppColors.neutral700,
          ),
        ),
      ],
    );
  }

  Widget _buildErrorCard(BuilderLocalizations t) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 420),
      margin: const EdgeInsets.all(AppSpacing.lg),
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppBorderRadius.md),
        boxShadow: AppShadows.md,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
          const SizedBox(height: AppSpacing.md),
          Text(
            t.isZh ? '认证错误' : 'Authentication Error',
            style: TextStyle(
              fontSize: AppFontSize.xl,
              fontWeight: FontWeight.w600,
              color: AppColors.neutral900,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: AppFontSize.md,
              color: AppColors.neutral600,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.go('/'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary500,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppBorderRadius.sm),
                ),
              ),
              child: Text(t.isZh ? '返回首页' : 'Back to Home'),
            ),
          ),
        ],
      ),
    );
  }
}
