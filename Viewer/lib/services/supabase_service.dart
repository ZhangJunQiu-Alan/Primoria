import 'dart:convert';
import 'dart:typed_data';

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
        final res = await client.rpc(
          'search_courses',
          params: {
            'p_query': searchQuery.trim(),
            if (subjectId != null) 'p_subject_id': subjectId,
          },
        );
        return (res as List).cast<Map<String, dynamic>>();
      }

      var q = client
          .from('courses')
          .select(
            'id, title, slug, description, difficulty_level, estimated_minutes, tags, subject_id, subjects(id, name, color_hex)',
          )
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

  /// Fetch course detail: course + grouped lessons + completion status.
  /// Grouping is derived from lessons.group_* fields.
  static Future<Map<String, dynamic>?> getCourseDetail(String courseId) async {
    try {
      final course = await client
          .from('courses')
          .select('*, subjects(id, name, color_hex)')
          .eq('id', courseId)
          .single();

      final lessonsRes = await client
          .from('lessons')
          .select(
            'id, title, type, sort_key, xp_reward, duration_seconds, is_locked, unlock_type, prerequisite_lesson_id, paywall_product_id',
          )
          .eq('course_id', courseId)
          .order('sort_key');
      final lessonList = (lessonsRes as List).cast<Map<String, dynamic>>();

      final lessons =
          lessonList.map((row) => Map<String, dynamic>.from(row)).toList()
            ..sort(
              (a, b) => ((a['sort_key'] as num?)?.toInt() ?? 0).compareTo(
                (b['sort_key'] as num?)?.toInt() ?? 0,
              ),
            );

      final chapList = <Map<String, dynamic>>[
        {
          'id': 'chapter-1',
          'title': 'Chapter 1',
          'sort_key': 1000,
          'lessons': lessons,
        },
      ];

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
            completedIds.add(
              (c as Map<String, dynamic>)['lesson_id'] as String,
            );
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
        'course': course,
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
      final lesson = await client
          .from('lessons')
          .select('id, title, content_json, xp_reward, duration_seconds')
          .eq('id', lessonId)
          .single();

      final map = (lesson as Map).cast<String, dynamic>();

      if (_isLessonContentEmpty(map['content_json'])) {
        final blocks = await client
            .from('content_blocks')
            .select('id, type, content, config, is_interactive, sort_key')
            .eq('lesson_id', lessonId)
            .order('sort_key', ascending: true);

        if (blocks.isNotEmpty) {
          map['content_json'] = blocks
              .whereType<Map>()
              .map(
                (b) => <String, dynamic>{
                  'block_id': b['id'],
                  'type': b['type'],
                  'content': b['content'],
                  'config': b['config'],
                  'is_interactive': b['is_interactive'],
                  'sort_key': b['sort_key'],
                },
              )
              .toList();
        }
      }

      return map;
    } catch (_) {
      return null;
    }
  }

  static bool _isLessonContentEmpty(dynamic raw) {
    if (raw == null) return true;
    if (raw is String) {
      final t = raw.trim();
      return t.isEmpty || t == '{}' || t == '[]';
    }
    if (raw is List) return raw.isEmpty;
    if (raw is Map) {
      final map = Map<String, dynamic>.from(raw);
      if (map.isEmpty) return true;
      final pages = map['pages'];
      if (pages is List) return pages.isEmpty;
      final blocks = map['blocks'];
      if (blocks is List) return blocks.isEmpty;
      return false;
    }
    return false;
  }

  /// Enroll current user in a course (idempotent).
  static Future<bool> enrollInCourse(String courseId) async {
    if (currentUser == null) return false;
    try {
      await client.from('enrollments').upsert({
        'user_id': currentUser!.id,
        'course_id': courseId,
        'status': 'in_progress',
      }, onConflict: 'user_id,course_id');
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
  /// Returns the XP breakdown map from the server, or null on error.
  static Future<Map<String, dynamic>?> completeLessonAndAwardXp({
    required String lessonId,
    int score = 0,
    int timeSpentSeconds = 0,
    int correctCount = 0,
    int totalCount = 0,
  }) async {
    if (currentUser == null) return null;
    try {
      final result = await client.rpc(
        'complete_lesson_and_award_xp',
        params: {
          'p_lesson_id': lessonId,
          'p_score': score,
          'p_seconds': timeSpentSeconds,
          'p_correct_count': correctCount,
          'p_total_count': totalCount,
        },
      );
      if (result is Map) {
        return Map<String, dynamic>.from(result);
      }
      return {};
    } catch (_) {
      return null;
    }
  }

  // ==================== Gamification — Achievements ====================

  /// Fetch all achievements with the current user's earned state.
  static Future<List<Map<String, dynamic>>> getAchievementsWithStatus() async {
    try {
      // All achievement definitions
      final all = await client
          .from('achievements')
          .select('id, slug, name, description, category, rarity')
          .order('rarity', ascending: true);

      if (currentUser == null) return List<Map<String, dynamic>>.from(all);

      // User's earned achievements
      final earned = await client
          .from('user_achievements')
          .select('achievement_id, earned_at')
          .eq('user_id', currentUser!.id);

      final earnedMap = <String, String>{};
      for (final row in earned as List) {
        earnedMap[row['achievement_id'].toString()] =
            row['earned_at'].toString();
      }

      return (all as List).map<Map<String, dynamic>>((a) {
        final m = Map<String, dynamic>.from(a);
        m['earned_at'] = earnedMap[m['id']?.toString()];
        return m;
      }).toList();
    } catch (_) {
      return [];
    }
  }

  /// Record a newly unlocked achievement for the current user.
  static Future<void> unlockAchievement(String achievementId) async {
    if (currentUser == null) return;
    try {
      await client.from('user_achievements').upsert({
        'user_id': currentUser!.id,
        'achievement_id': achievementId,
      });
    } catch (_) {}
  }

  /// Get IDs of achievements already earned by the current user.
  static Future<Set<String>> getEarnedAchievementIds() async {
    if (currentUser == null) return {};
    try {
      final rows = await client
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', currentUser!.id);
      return {for (final r in rows as List) r['achievement_id'].toString()};
    } catch (_) {
      return {};
    }
  }

  /// Fetch the user's pinned achievement IDs from their profile.
  static Future<List<String>> getPinnedAchievementIds() async {
    if (currentUser == null) return [];
    try {
      final row = await client
          .from('profiles')
          .select('pinned_achievement_ids')
          .eq('id', currentUser!.id)
          .maybeSingle();
      final raw = row?['pinned_achievement_ids'];
      if (raw is List) return raw.map((e) => e.toString()).toList();
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Save pinned achievement IDs to the user's profile (max 3).
  static Future<void> savePinnedAchievementIds(List<String> ids) async {
    if (currentUser == null) return;
    try {
      await client
          .from('profiles')
          .update({'pinned_achievement_ids': ids.take(3).toList()})
          .eq('id', currentUser!.id);
    } catch (_) {}
  }

  // ==================== Gamification — Daily Tasks ====================

  /// Fetch today's daily tasks for the current user.
  static Future<List<Map<String, dynamic>>> getTodayTasks() async {
    if (currentUser == null) return [];
    try {
      final today = DateTime.now().toLocal();
      final dateStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      final rows = await client
          .from('daily_tasks')
          .select()
          .eq('user_id', currentUser!.id)
          .eq('task_date', dateStr)
          .order('created_at');
      return List<Map<String, dynamic>>.from(rows);
    } catch (_) {
      return [];
    }
  }

  /// Insert a batch of new daily tasks for today.
  static Future<void> insertTodayTasks(
    List<Map<String, dynamic>> tasks,
  ) async {
    if (currentUser == null) return;
    try {
      await client.from('daily_tasks').upsert(tasks);
    } catch (_) {}
  }

  /// Increment a task's current_value. Marks complete if target reached.
  static Future<Map<String, dynamic>?> incrementTaskProgress({
    required String taskId,
    required int increment,
    required int targetValue,
  }) async {
    if (currentUser == null) return null;
    try {
      // Fetch current value first
      final row = await client
          .from('daily_tasks')
          .select('current_value, is_completed')
          .eq('id', taskId)
          .eq('user_id', currentUser!.id)
          .maybeSingle();
      if (row == null) return null;
      if (row['is_completed'] == true) return row;

      final newValue =
          ((row['current_value'] as num?)?.toInt() ?? 0) + increment;
      final clamped = newValue.clamp(0, targetValue);
      final completed = clamped >= targetValue;

      final updated = await client
          .from('daily_tasks')
          .update({
            'current_value': clamped,
            'is_completed': completed,
            if (completed)
              'completed_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('id', taskId)
          .eq('user_id', currentUser!.id)
          .select()
          .maybeSingle();
      return updated;
    } catch (_) {
      return null;
    }
  }

  // ==================== Gamification — Star Chain ====================

  /// Fetch daily_activity_log for the past 14 days (current + last week).
  static Future<Set<String>> getActiveDates({int days = 14}) async {
    if (currentUser == null) return {};
    try {
      final since = DateTime.now().subtract(Duration(days: days));
      final sinceStr =
          '${since.year}-${since.month.toString().padLeft(2, '0')}-${since.day.toString().padLeft(2, '0')}';
      final rows = await client
          .from('daily_activity_log')
          .select('date')
          .eq('user_id', currentUser!.id)
          .gte('date', sinceStr)
          .gt('lessons_count', 0);
      return {for (final r in rows as List) r['date'].toString()};
    } catch (_) {
      return {};
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
    String? username,
    String? bio,
    String? avatarUrl,
  }) async {
    if (currentUser == null) return false;

    try {
      await client
          .from('profiles')
          .update({
            if (username != null) 'username': username,
            if (bio != null) 'bio': bio,
            if (avatarUrl != null) 'avatar_url': avatarUrl,
          })
          .eq('id', currentUser!.id);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Upload avatar bytes to Supabase Storage and return a public URL.
  static Future<String?> uploadAvatar(
    Uint8List bytes, {
    String fileExt = 'jpg',
  }) async {
    if (currentUser == null) return null;
    try {
      final ext = fileExt.replaceAll('.', '').trim().toLowerCase();
      final normalizedExt = ext.isEmpty ? 'jpg' : ext;
      final path =
          'public/${currentUser!.id}/avatar_${DateTime.now().millisecondsSinceEpoch}.$normalizedExt';

      await client.storage
          .from('avatars')
          .uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(
              upsert: true,
              contentType: _avatarContentTypeForExt(normalizedExt),
            ),
          );
      return client.storage.from('avatars').getPublicUrl(path);
    } catch (_) {
      return null;
    }
  }

  static String _avatarContentTypeForExt(String ext) {
    switch (ext.toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'jpeg':
      case 'jpg':
      default:
        return 'image/jpeg';
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
