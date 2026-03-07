import 'dart:convert';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase service for Viewer — auth only (ported from Builder).
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;
  static String? _lastOperationError;

  /// Last detailed error captured by profile/storage operations.
  static String? get lastOperationError => _lastOperationError;

  /// Current user
  static User? get currentUser => client.auth.currentUser;

  /// Is logged in
  static bool get isLoggedIn => currentUser != null;

  /// Auth state changes
  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  /// Ensure we still have an authenticated user.
  /// Attempts a session refresh when [currentUser] is null but a session exists.
  static Future<bool> ensureAuthenticated() async {
    final user = currentUser;
    if (user != null) {
      _lastOperationError = null;
      return true;
    }

    try {
      final session = client.auth.currentSession;
      final refreshToken = session?.refreshToken;
      if (refreshToken != null && refreshToken.isNotEmpty) {
        final refreshed = await client.auth.refreshSession(refreshToken);
        if (refreshed.session?.user != null || currentUser != null) {
          _lastOperationError = null;
          return true;
        }
      }
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return false;
    }

    _lastOperationError = 'Not authenticated: current user is null';
    return false;
  }

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

  static Future<Map<String, dynamic>?> generateChildBindingCode({
    int ttlMinutes = 30,
  }) async {
    final authed = await ensureAuthenticated();
    if (!authed) return null;

    try {
      final response = ttlMinutes == 30
          ? await client.rpc('generate_child_binding_code')
          : await client.rpc(
              'generate_child_binding_code',
              params: {'p_ttl_minutes': ttlMinutes},
            );
      _lastOperationError = null;
      return _firstMap(response);
    } catch (e) {
      if (ttlMinutes != 30 &&
          _isMissingRpcFunctionError(e, 'generate_child_binding_code')) {
        try {
          final fallbackResponse = await client.rpc(
            'generate_child_binding_code',
          );
          _lastOperationError = null;
          return _firstMap(fallbackResponse);
        } catch (fallbackError) {
          _lastOperationError = _describeSupabaseError(fallbackError);
          return null;
        }
      }
      _lastOperationError = _describeSupabaseError(e);
      return null;
    }
  }

  static Future<Map<String, dynamic>?> bindChildWithCode(String code) async {
    final authed = await ensureAuthenticated();
    if (!authed) return null;

    try {
      final response = await client.rpc(
        'bind_child_with_code',
        params: {'p_code': code.trim()},
      );
      _lastOperationError = null;
      return _firstMap(response);
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return null;
    }
  }

  static Future<bool> unbindChild(String childId) async {
    final authed = await ensureAuthenticated();
    if (!authed) return false;

    try {
      final response = await client.rpc(
        'unbind_child',
        params: {'p_child_id': childId},
      );
      _lastOperationError = null;
      return response == true;
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return false;
    }
  }

  static Future<List<Map<String, dynamic>>> getParentChildrenOverview() async {
    final authed = await ensureAuthenticated();
    if (!authed) return [];

    try {
      final response = await client.rpc('get_parent_children_overview');
      _lastOperationError = null;
      return _toMapList(response);
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return [];
    }
  }

  static Future<Map<String, dynamic>?> getParentChildReport(
    String childId, {
    int days = 7,
  }) async {
    final authed = await ensureAuthenticated();
    if (!authed) return null;

    try {
      final response = days == 7
          ? await client.rpc(
              'get_parent_child_report',
              params: {'p_child_id': childId},
            )
          : await client.rpc(
              'get_parent_child_report',
              params: {'p_child_id': childId, 'p_days': days},
            );
      _lastOperationError = null;
      return _firstMap(response);
    } catch (e) {
      if (days != 7 &&
          _isMissingRpcFunctionError(e, 'get_parent_child_report')) {
        try {
          final fallbackResponse = await client.rpc(
            'get_parent_child_report',
            params: {'p_child_id': childId},
          );
          _lastOperationError = null;
          return _firstMap(fallbackResponse);
        } catch (fallbackError) {
          _lastOperationError = _describeSupabaseError(fallbackError);
          return null;
        }
      }
      _lastOperationError = _describeSupabaseError(e);
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
            'id, title, slug, description, thumbnail_url, difficulty_level, estimated_minutes, tags, subject_id, subjects(id, name, color_hex)',
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
            '*, courses(id, title, slug, description, thumbnail_url, difficulty_level, estimated_minutes, tags, subject_id, subjects(id, name, color_hex))',
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
          .select(
            'id, course_id, sort_key, title, content_json, xp_reward, duration_seconds',
          )
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

      // Builder stores the full course snapshot on the first lesson row.
      // If this lesson has empty content_json and no content_blocks, fall back
      // to the first non-empty snapshot in the same course.
      if (_isLessonContentEmpty(map['content_json'])) {
        final courseId = map['course_id']?.toString();
        if (courseId != null && courseId.isNotEmpty) {
          final lessonRows = await client
              .from('lessons')
              .select('content_json')
              .eq('course_id', courseId)
              .order('sort_key', ascending: true);

          for (final row in lessonRows as List) {
            final rowMap = row is Map
                ? Map<String, dynamic>.from(row)
                : const <String, dynamic>{};
            final candidate = rowMap['content_json'];
            if (!_isLessonContentEmpty(candidate)) {
              map['content_json'] = candidate;
              break;
            }
          }
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
        earnedMap[row['achievement_id'].toString()] = row['earned_at']
            .toString();
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
  static Future<void> insertTodayTasks(List<Map<String, dynamic>> tasks) async {
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

  /// Fetch active study dates for the past [days] days.
  /// A day is considered active when the user has at least one positive XP
  /// transaction on that local date.
  static Future<Set<String>> getActiveDates({int days = 14}) async {
    if (currentUser == null) return {};
    try {
      final now = DateTime.now().toLocal();
      final localStartOfToday = DateTime(now.year, now.month, now.day);
      final sinceLocal = localStartOfToday.subtract(Duration(days: days));
      final sinceUtc = sinceLocal.toUtc();
      final rows = await client
          .from('xp_transactions')
          .select('amount, created_at')
          .eq('user_id', currentUser!.id)
          .gte('created_at', sinceUtc.toIso8601String());
      final activeDates = <String>{};
      for (final row in rows as List) {
        final amount = _toInt((row as Map<String, dynamic>)['amount']);
        if (amount <= 0) continue;
        final ts = DateTime.parse(row['created_at'] as String).toLocal();
        activeDates.add(_dateKeyFromLocal(ts));
      }
      return activeDates;
    } catch (_) {
      return {};
    }
  }

  // ==================== Gamification — XP History ====================

  /// Query xp_transactions for the past [days] days and aggregate by local date.
  /// Returns a map of UTC-midnight keys (built from local date components)
  /// to total XP for that day, for use in the heatmap widget.
  static Future<Map<DateTime, int>> getDailyXpHistory({int days = 365}) async {
    if (currentUser == null) return {};
    try {
      final since = DateTime.now().subtract(Duration(days: days));
      final rows = await client
          .from('xp_transactions')
          .select('amount, created_at')
          .eq('user_id', currentUser!.id)
          .gte('created_at', since.toIso8601String());
      final Map<DateTime, int> result = {};
      for (final row in rows as List) {
        final ts = DateTime.parse(row['created_at'] as String).toLocal();
        final key = DateTime.utc(ts.year, ts.month, ts.day);
        result[key] = (result[key] ?? 0) + _toInt((row as Map)['amount']);
      }
      return result;
    } catch (_) {
      return {};
    }
  }

  // ==================== Gamification ====================

  /// Get user stats — aggregated live from source tables so the values are
  /// always accurate regardless of whether the denormalised user_stats row
  /// has been synced by an RPC.
  ///
  /// * total_xp          → SUM(amount) from xp_transactions
  /// * courses_completed → COUNT of enrollments with status='completed'
  /// * lessons_completed → COUNT of lesson_completions rows
  /// * current_streak    → computed from positive XP days (local date)
  /// * longest_streak    → computed from positive XP days (local date)
  static Future<Map<String, dynamic>?> getUserStats() async {
    if (currentUser == null) return null;
    try {
      final uid = currentUser!.id;

      // Run list queries concurrently.
      final listResults = await Future.wait<List>([
        client
            .from('xp_transactions')
            .select('amount, created_at')
            .eq('user_id', uid),
        client
            .from('enrollments')
            .select('id')
            .eq('user_id', uid)
            .eq('status', 'completed'),
        client.from('lesson_completions').select('id').eq('user_id', uid),
      ]);

      final xpRows = listResults[0].cast<Map<String, dynamic>>();
      final totalXp = xpRows.fold<int>(
        0,
        (sum, row) => sum + _toInt(row['amount']),
      );
      final activeDayKeys = <DateTime>{};
      for (final row in xpRows) {
        final amount = _toInt(row['amount']);
        if (amount <= 0) continue;
        final createdAt = row['created_at'] as String?;
        if (createdAt == null || createdAt.isEmpty) continue;
        final localTs = DateTime.parse(createdAt).toLocal();
        activeDayKeys.add(
          DateTime.utc(localTs.year, localTs.month, localTs.day),
        );
      }

      final coursesCompleted = listResults[1].length;
      final lessonsCompleted = listResults[2].length;
      final currentStreak = _computeCurrentStreak(activeDayKeys);
      final longestStreak = _computeLongestStreak(activeDayKeys);

      return {
        'total_xp': totalXp,
        'courses_completed': coursesCompleted,
        'lessons_completed': lessonsCompleted,
        'current_streak': currentStreak,
        'longest_streak': longestStreak,
      };
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
    String? coverImageUrl,
    String? role,
  }) async {
    final authed = await ensureAuthenticated();
    if (!authed || currentUser == null) {
      return false;
    }

    try {
      await client
          .from('profiles')
          .update({
            if (username != null) 'username': username,
            if (bio != null) 'bio': bio,
            if (avatarUrl != null) 'avatar_url': avatarUrl,
            if (coverImageUrl != null) 'cover_image_url': coverImageUrl,
            if (role != null) 'role': role,
          })
          .eq('id', currentUser!.id);
      _lastOperationError = null;
      return true;
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return false;
    }
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static Map<String, dynamic>? _firstMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    if (value is List && value.isNotEmpty) {
      final first = value.first;
      if (first is Map<String, dynamic>) {
        return first;
      }
      if (first is Map) {
        return Map<String, dynamic>.from(first);
      }
    }
    return null;
  }

  static List<Map<String, dynamic>> _toMapList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  static String _dateKeyFromLocal(DateTime local) =>
      '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';

  static int _computeCurrentStreak(Set<DateTime> activeDayKeys) {
    if (activeDayKeys.isEmpty) return 0;
    final now = DateTime.now().toLocal();
    final today = DateTime.utc(now.year, now.month, now.day);
    DateTime cursor = today;

    // Keep streak if user studied yesterday but not yet today.
    if (!activeDayKeys.contains(cursor)) {
      final yesterday = cursor.subtract(const Duration(days: 1));
      if (!activeDayKeys.contains(yesterday)) return 0;
      cursor = yesterday;
    }

    var streak = 0;
    while (activeDayKeys.contains(cursor)) {
      streak++;
      cursor = cursor.subtract(const Duration(days: 1));
    }
    return streak;
  }

  static int _computeLongestStreak(Set<DateTime> activeDayKeys) {
    if (activeDayKeys.isEmpty) return 0;
    final sorted = activeDayKeys.toList()..sort();
    var longest = 1;
    var current = 1;
    for (var i = 1; i < sorted.length; i++) {
      final diff = sorted[i].difference(sorted[i - 1]).inDays;
      if (diff == 1) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }
    return longest;
  }

  /// Upload cover image bytes and return public URL.
  /// Uses a fixed path (upsert) to ensure only one cover per user.
  static Future<String?> uploadCoverImage(
    Uint8List bytes, {
    String fileExt = 'jpg',
  }) async {
    final authed = await ensureAuthenticated();
    if (!authed || currentUser == null) {
      return null;
    }
    try {
      final ext = fileExt.replaceAll('.', '').trim().toLowerCase();
      final normalizedExt = ext.isEmpty ? 'jpg' : ext;
      final contentType = _avatarContentTypeForExt(normalizedExt);
      // Primary fixed filename for single-current-cover semantics.
      final fixedPath =
          'public/${currentUser!.id}/profile_cover.$normalizedExt';

      try {
        await client.storage
            .from('avatars')
            .uploadBinary(
              fixedPath,
              bytes,
              fileOptions: FileOptions(upsert: true, contentType: contentType),
            );
        _lastOperationError = null;
        final url = client.storage.from('avatars').getPublicUrl(fixedPath);
        return '$url?v=${DateTime.now().millisecondsSinceEpoch}';
      } catch (fixedErr) {
        final fixedErrorMessage = _describeSupabaseError(fixedErr);

        // Fallback path avoids RLS update-owner mismatch on pre-existing files
        // created outside the current user context.
        final fallbackPath =
            'public/${currentUser!.id}/profile_cover_${DateTime.now().millisecondsSinceEpoch}.$normalizedExt';
        try {
          await client.storage
              .from('avatars')
              .uploadBinary(
                fallbackPath,
                bytes,
                fileOptions: FileOptions(
                  upsert: false,
                  contentType: contentType,
                ),
              );
          _lastOperationError = null;
          final url = client.storage.from('avatars').getPublicUrl(fallbackPath);
          return '$url?v=${DateTime.now().millisecondsSinceEpoch}';
        } catch (fallbackErr) {
          final fallbackErrorMessage = _describeSupabaseError(fallbackErr);
          _lastOperationError =
              'Fixed-path upload failed: $fixedErrorMessage | Fallback upload failed: $fallbackErrorMessage';
          return null;
        }
      }
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
      return null;
    }
  }

  /// Upload avatar bytes to Supabase Storage and return a public URL.
  static Future<String?> uploadAvatar(
    Uint8List bytes, {
    String fileExt = 'jpg',
  }) async {
    final authed = await ensureAuthenticated();
    if (!authed || currentUser == null) {
      return null;
    }
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
      _lastOperationError = null;
      return client.storage.from('avatars').getPublicUrl(path);
    } catch (e) {
      _lastOperationError = _describeSupabaseError(e);
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

  static String _describeSupabaseError(Object error) {
    if (error is StorageException) {
      final parts = <String>[
        'type=StorageException',
        if ((error.statusCode ?? '').toString().isNotEmpty)
          'statusCode=${error.statusCode}',
        if ((error.error ?? '').toString().isNotEmpty) 'error=${error.error}',
        if (error.message.isNotEmpty) 'message=${error.message}',
      ];
      return parts.join(', ');
    }

    if (error is PostgrestException) {
      final code = error.code?.toString().trim() ?? '';
      final details = error.details?.toString().trim() ?? '';
      final hint = error.hint?.toString().trim() ?? '';
      if (code == 'PGRST202') {
        return 'Parent mode backend function is unavailable. Please apply the latest parent mode migration or retry after the schema cache refreshes.';
      }
      if (code == '22P02' &&
          (details.contains('enum user_role') ||
              error.message.contains('enum user_role')) &&
          (details.contains('parent') || error.message.contains('parent'))) {
        return 'Parent mode backend role support is unavailable. Please apply the latest parent mode migration to the current Supabase project before switching to parent mode.';
      }
      final parts = <String>[
        'type=PostgrestException',
        if (code.isNotEmpty) 'code=$code',
        if (details.isNotEmpty) 'details=$details',
        if (hint.isNotEmpty) 'hint=$hint',
        'message=${error.message}',
      ];
      return parts.join(', ');
    }

    if (error is AuthException) {
      return 'type=AuthException, message=${error.message}';
    }

    return error.toString();
  }

  // ==================== Helper methods ====================

  static bool _isRetryableAuthTimeout(String message) {
    final raw = message.toLowerCase();
    return raw.contains('request_timeout') ||
        raw.contains('timed out') ||
        raw.contains('context deadline exceeded');
  }

  static bool _isMissingRpcFunctionError(Object error, String functionName) {
    if (error is! PostgrestException) return false;
    final code = error.code?.toString().trim() ?? '';
    final details = error.details?.toString() ?? '';
    final message = error.message;
    return code == 'PGRST202' &&
        (details.contains(functionName) || message.contains(functionName));
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
