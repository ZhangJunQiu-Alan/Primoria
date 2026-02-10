import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/supabase_service.dart';
import '../../theme/design_tokens.dart';

/// Screen that handles OAuth callback redirects.
///
/// Shows a spinner while waiting for auth completion, parses error params
/// from the URL, and redirects to the intended destination on success.
class AuthCallbackScreen extends StatefulWidget {
  const AuthCallbackScreen({super.key});

  @override
  State<AuthCallbackScreen> createState() => _AuthCallbackScreenState();
}

class _AuthCallbackScreenState extends State<AuthCallbackScreen> {
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
      setState(() => _error = _humanizeError(error));
    }
  }

  String _humanizeError(String raw) {
    if (raw.contains('access_denied') || raw.contains('cancelled')) {
      return 'Sign-in was cancelled. Please try again.';
    }
    if (raw.contains('invalid_request') || raw.contains('invalid_state')) {
      return 'The sign-in session has expired. Please try again.';
    }
    if (raw.contains('Unsupported provider') ||
        raw.contains('provider is not enabled')) {
      return 'This login provider is not enabled in Supabase Auth.';
    }
    if (raw.contains('redirect_to') && raw.contains('not allowed')) {
      return 'This callback URL is not allowed. Add it to Supabase redirect URLs.';
    }
    if (raw.contains('server_error')) {
      return 'The authentication server encountered an error. Please try again later.';
    }
    return 'Sign-in failed: $raw';
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
        setState(() => _error = 'Sign-in timed out. Please try again.');
      }
    });
  }

  void _onSuccess() {
    if (!mounted) return;
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
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(child: _error != null ? _buildErrorCard() : _buildLoading()),
    );
  }

  Widget _buildLoading() {
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
          'Signing in...',
          style: TextStyle(
            fontSize: AppFontSize.lg,
            color: AppColors.neutral700,
          ),
        ),
      ],
    );
  }

  Widget _buildErrorCard() {
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
            'Authentication Error',
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
              child: const Text('Back to Home'),
            ),
          ),
        ],
      ),
    );
  }
}
