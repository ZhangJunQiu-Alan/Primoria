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

  // ==================== Course service ====================

  /// Fetch all subjects ordered by name.
  static Future<List<Map<String, dynamic>>> getSubjects() async {
    try {
      final res = await client.from('subjects').select().order('name');
      return (res as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// Fetch published courses. Optionally filter by [subjectId] or full-text [searchQuery].
  static Future<List<Map<String, dynamic>>> getCourses({
    String? subjectId,
    String? searchQuery,
  }) async {
    try {
      if (searchQuery != null && searchQuery.trim().isNotEmpty) {
        final res = await client.rpc('search_courses', params: {
          'p_query': searchQuery.trim(),
          if (subjectId != null) 'p_subject_id': subjectId,
        });
        return (res as List).cast<Map<String, dynamic>>();
      }

      var q = client
          .from('courses')
          .select('id, title, slug, description, difficulty_level, estimated_minutes, tags, subject_id, subjects(id, name, color_hex)')
          .eq('status', 'published');

      if (subjectId != null) {
        q = q.eq('subject_id', subjectId);
      }

      final res = await q.order('published_at', ascending: false).limit(30);
      return (res as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// Fetch current user's enrollments with nested course data.
  static Future<List<Map<String, dynamic>>> getEnrollments() async {
    if (currentUser == null) return [];
    try {
      final res = await client
          .from('enrollments')
          .select(
            '*, courses(id, title, slug, description, difficulty_level, estimated_minutes, tags, subject_id, subjects(id, name, color_hex))',
          )
          .eq('user_id', currentUser!.id)
          .order('last_accessed_at', ascending: false);
      return (res as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// Fetch course detail: course + chapters + lessons + completion status for current user.
  static Future<Map<String, dynamic>?> getCourseDetail(String courseId) async {
    try {
      final course = await client
          .from('courses')
          .select('*, subjects(id, name, color_hex)')
          .eq('id', courseId)
          .single();

      final chapters = await client
          .from('chapters')
          .select('*, lessons(id, title, type, sort_key, xp_reward, duration_seconds)')
          .eq('course_id', courseId)
          .order('sort_key');
      final chapList = (chapters as List).cast<Map<String, dynamic>>();

      // Sort lessons within each chapter
      for (final ch in chapList) {
        final lessons = ch['lessons'] as List? ?? [];
        lessons.sort((a, b) =>
            ((a as Map)['sort_key'] as int? ?? 0)
                .compareTo((b as Map)['sort_key'] as int? ?? 0));
        ch['lessons'] = lessons;
      }

      // Fetch completed lesson IDs for current user
      final completedIds = <String>{};
      if (currentUser != null) {
        final allLessonIds = chapList
            .expand((ch) => (ch['lessons'] as List? ?? []))
            .map((l) => (l as Map<String, dynamic>)['id'] as String)
            .toList();

        if (allLessonIds.isNotEmpty) {
          final completions = await client
              .from('lesson_completions')
              .select('lesson_id')
              .eq('user_id', currentUser!.id)
              .inFilter('lesson_id', allLessonIds);
          for (final c in (completions as List)) {
            completedIds.add((c as Map<String, dynamic>)['lesson_id'] as String);
          }
        }
      }

      Map<String, dynamic>? enrollment;
      if (currentUser != null) {
        enrollment = await client
            .from('enrollments')
            .select()
            .eq('user_id', currentUser!.id)
            .eq('course_id', courseId)
            .maybeSingle();
      }

      return {
        'course': course as Map<String, dynamic>,
        'chapters': chapList,
        'completed_lesson_ids': completedIds.toList(),
        'enrollment': enrollment,
      };
    } catch (_) {
      return null;
    }
  }

  /// Fetch a single lesson's content_json and metadata.
  static Future<Map<String, dynamic>?> getLessonContent(String lessonId) async {
    try {
      return await client
          .from('lessons')
          .select('id, title, content_json, xp_reward, duration_seconds')
          .eq('id', lessonId)
          .single() as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Enroll current user in a course (idempotent).
  static Future<bool> enrollInCourse(String courseId) async {
    if (currentUser == null) return false;
    try {
      await client.from('enrollments').upsert(
        {'user_id': currentUser!.id, 'course_id': courseId, 'status': 'in_progress'},
        onConflict: 'user_id,course_id',
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Update enrollment progress (progress_bp: 0–10000).
  static Future<void> updateEnrollmentProgress({
    required String courseId,
    required int progressBp,
  }) async {
    if (currentUser == null) return;
    try {
      await client
          .from('enrollments')
          .update({
            'progress_bp': progressBp,
            'last_accessed_at': DateTime.now().toIso8601String(),
          })
          .eq('user_id', currentUser!.id)
          .eq('course_id', courseId);
    } catch (_) {}
  }

  /// Complete a lesson and award XP via the atomic RPC.
  static Future<bool> completeLessonAndAwardXp({
    required String lessonId,
    int score = 0,
    int timeSpentSeconds = 0,
  }) async {
    if (currentUser == null) return false;
    try {
      await client.rpc('complete_lesson_and_award_xp', params: {
        'p_lesson_id': lessonId,
        'p_score': score,
        'p_seconds': timeSpentSeconds,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  // ==================== Gamification ====================

  /// Get user stats from user_stats table
  static Future<Map<String, dynamic>?> getUserStats() async {
    if (currentUser == null) return null;
    try {
      final response = await client
          .from('user_stats')
          .select()
          .eq('user_id', currentUser!.id)
          .maybeSingle();
      return response;
    } catch (_) {
      return null;
    }
  }

  /// Get follow counts for current user (following + followers)
  static Future<Map<String, int>> getFollowCounts() async {
    if (currentUser == null) return {'following': 0, 'followers': 0};
    try {
      final following = await client
          .from('follows')
          .select()
          .eq('follower_id', currentUser!.id);
      final followers = await client
          .from('follows')
          .select()
          .eq('following_id', currentUser!.id);
      return {
        'following': (following as List).length,
        'followers': (followers as List).length,
      };
    } catch (_) {
      return {'following': 0, 'followers': 0};
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
