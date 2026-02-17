import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase service for Viewer — auth only (ported from Builder).
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;

  /// Current user
  static User? get currentUser => client.auth.currentUser;

  /// Is logged in
  static bool get isLoggedIn => currentUser != null;

  /// Auth state changes
  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  // ==================== Auth ====================

  /// Sign up with email
  static Future<AuthResult> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      final response = await client.auth.signUp(
        email: email,
        password: password,
        data: displayName != null ? {'name': displayName} : null,
      );

      if (response.user != null) {
        return AuthResult(success: true, message: 'Sign up successful');
      } else {
        return const AuthResult(success: false, message: 'Sign up failed');
      }
    } on AuthException catch (e) {
      return AuthResult(
        success: false,
        message: _translateAuthError(e.message),
      );
    } catch (e) {
      return AuthResult(success: false, message: 'Sign up failed: $e');
    }
  }

  /// Sign in with email
  static Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final response = await client.auth.signInWithPassword(
          email: email,
          password: password,
        );

        if (response.user != null) {
          return AuthResult(success: true, message: 'Signed in');
        } else {
          return const AuthResult(success: false, message: 'Sign in failed');
        }
      } on AuthException catch (e) {
        if (_isRetryableAuthTimeout(e.message) && attempt == 0) {
          await Future<void>.delayed(const Duration(milliseconds: 700));
          continue;
        }
        return AuthResult(
          success: false,
          message: _translateAuthError(e.message),
          isUserNotFound: e.message.contains('Invalid login credentials'),
        );
      } catch (e) {
        final errorText = e.toString();
        if (_isRetryableAuthTimeout(errorText) && attempt == 0) {
          await Future<void>.delayed(const Duration(milliseconds: 700));
          continue;
        }
        return AuthResult(success: false, message: 'Sign in failed: $e');
      }
    }

    return const AuthResult(success: false, message: 'Sign in failed');
  }

  /// Sign out
  static Future<void> signOut() async {
    await client.auth.signOut();
  }

  /// Reset password (send reset email)
  static Future<AuthResult> resetPassword({required String email}) async {
    try {
      await client.auth.resetPasswordForEmail(email);
      return const AuthResult(success: true, message: 'Reset link sent');
    } on AuthException catch (e) {
      return AuthResult(
        success: false,
        message: _translateAuthError(e.message),
      );
    } catch (e) {
      return AuthResult(success: false, message: 'Send failed: $e');
    }
  }

  /// Sign in with Google
  static Future<AuthResult> signInWithGoogle() async {
    try {
      await client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: _getRedirectUrl(),
      );
      return const AuthResult(success: true, message: 'Redirecting...');
    } on AuthException catch (e) {
      return AuthResult(
        success: false,
        message: _translateAuthError(e.message),
      );
    } catch (e) {
      return AuthResult(success: false, message: 'Sign in failed: $e');
    }
  }

  /// Get OAuth redirect URL
  static String _getRedirectUrl() {
    return '${Uri.base.origin}/auth/callback';
  }

  /// Get user profile
  static Future<Map<String, dynamic>?> getProfile() async {
    if (currentUser == null) return null;

    try {
      final response = await client
          .from('profiles')
          .select()
          .eq('id', currentUser!.id)
          .single();
      return response;
    } catch (e) {
      return null;
    }
  }

  /// Update user profile
  static Future<bool> updateProfile({
    String? displayName,
    String? avatarUrl,
  }) async {
    if (currentUser == null) return false;

    try {
      await client
          .from('profiles')
          .update({
            if (displayName != null) 'display_name': displayName,
            if (avatarUrl != null) 'avatar_url': avatarUrl,
          })
          .eq('id', currentUser!.id);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== Helper methods ====================

  static bool _isRetryableAuthTimeout(String message) {
    final raw = message.toLowerCase();
    return raw.contains('request_timeout') ||
        raw.contains('timed out') ||
        raw.contains('context deadline exceeded');
  }

  static String _translateAuthError(String message) {
    var normalized = message;
    final trimmed = message.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        final decoded = jsonDecode(trimmed);
        if (decoded is Map<String, dynamic>) {
          final code = decoded['code']?.toString() ?? '';
          final details =
              decoded['message']?.toString() ??
              decoded['msg']?.toString() ??
              decoded['error_description']?.toString() ??
              decoded['error']?.toString() ??
              '';
          normalized = '$code $details'.trim();
        }
      } catch (_) {
        normalized = message;
      }
    }

    if (normalized.contains('Invalid login credentials')) {
      return 'Incorrect email or password';
    }
    if (normalized.contains('Email not confirmed')) {
      return 'Please confirm your email first';
    }
    if (normalized.contains('User already registered')) {
      return 'Email is already registered';
    }
    if (normalized.contains('Password should be at least')) {
      return 'Password must be at least 6 characters';
    }
    if (normalized.contains('Invalid email')) {
      return 'Invalid email format';
    }
    if (normalized.contains('Unsupported provider') ||
        normalized.contains('provider is not enabled')) {
      return 'This login provider is not enabled in Supabase Auth.';
    }
    if (normalized.contains('redirect_to is not allowed')) {
      return 'This callback URL is not allowed. Add it to Supabase redirect URLs.';
    }
    if (_isRetryableAuthTimeout(normalized) ||
        normalized.contains('Database error querying schema')) {
      return 'Sign-in service is temporarily busy. Please retry in a few seconds.';
    }
    return normalized;
  }
}

/// Auth result
class AuthResult {
  final bool success;
  final String message;
  final bool isUserNotFound;

  const AuthResult({
    required this.success,
    required this.message,
    this.isUserNotFound = false,
  });
}
