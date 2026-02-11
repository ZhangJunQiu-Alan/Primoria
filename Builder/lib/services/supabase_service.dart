import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';
import 'id_generator.dart';
import 'course_schema_validator.dart';

/// Supabase service - handles auth, course storage, publishing, etc.
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

  /// Check if an email is registered
  static Future<bool> isEmailRegistered(String email) async {
    try {
      // Attempt to send a password recovery to check existence.
      // Supabase doesn't expose a direct "user exists" API for anon,
      // so we query the profiles table if accessible, otherwise fall back.
      final response = await client
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
      return response != null;
    } catch (_) {
      // If profiles table doesn't have email or RLS blocks it,
      // we can't pre-check — just let signIn handle errors.
      return true; // assume exists, let sign-in decide
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

  /// Pending redirect path to restore after OAuth callback
  static String? pendingRedirect;

  /// Returns and clears the pending redirect path.
  static String? consumePendingRedirect() {
    final path = pendingRedirect;
    pendingRedirect = null;
    return path;
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

  // ==================== Course Management ====================

  /// Save course (create or update)
  static Future<CourseResult> saveCourse(Course course) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    final validation = CourseSchemaValidator.validateCourse(
      course,
      mode: CourseSchemaValidationMode.save,
    );
    if (validation.hasBlockingErrors) {
      return CourseResult(
        success: false,
        message: _formatSchemaValidationMessage(
          action: 'Save',
          errors: validation.errorMessages,
        ),
        validation: validation,
      );
    }

    try {
      final inputCourseId = _isUuid(course.courseId) ? course.courseId : null;
      final existing = inputCourseId == null
          ? null
          : await client
                .from('courses')
                .select('id, author_id')
                .eq('id', inputCourseId)
                .maybeSingle();

      String persistedCourseId;

      if (existing == null) {
        // Create new course
        final insertResult = await client
            .from('courses')
            .insert({
              if (inputCourseId != null) 'id': inputCourseId,
              'author_id': currentUser!.id,
              'title': course.metadata.title,
              'slug': _buildCourseSlug(
                course.metadata.title,
                inputCourseId ?? IdGenerator.generate(),
              ),
              'description': course.metadata.description,
              'tags': course.metadata.tags,
              'difficulty_level': _normalizeDifficulty(
                course.metadata.difficulty,
              ),
              'estimated_minutes': course.metadata.estimatedMinutes,
              'status': 'draft',
            })
            .select('id')
            .single();

        persistedCourseId = insertResult['id'] as String;
      } else {
        // Update existing course
        final existingCourseId = existing['id'] as String;
        if (existing['author_id'] != currentUser!.id) {
          return const CourseResult(
            success: false,
            message: 'You do not have permission to edit this course',
          );
        }

        await client
            .from('courses')
            .update({
              'description': course.metadata.description,
              'tags': course.metadata.tags,
              'difficulty_level': _normalizeDifficulty(
                course.metadata.difficulty,
              ),
              'estimated_minutes': course.metadata.estimatedMinutes,
            })
            .eq('id', existingCourseId);

        persistedCourseId = existingCourseId;
      }

      await _saveCourseSnapshot(course.copyWith(courseId: persistedCourseId));

      return CourseResult(
        success: true,
        message: validation.warnings.isEmpty
            ? 'Saved'
            : 'Saved with ${validation.warnings.length} warning(s)',
        courseId: persistedCourseId,
        // Keep backward compatibility with current publish flow.
        versionId: persistedCourseId,
        validation: validation,
      );
    } catch (e) {
      return CourseResult(success: false, message: 'Save failed: $e');
    }
  }

  /// Publish course
  static Future<CourseResult> publishCourse(
    String courseId,
    String versionId,
  ) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    try {
      final snapshot = await _loadCourseSnapshot(courseId);
      if (snapshot == null) {
        return const CourseResult(
          success: false,
          message: 'Publish failed: no saved course snapshot found',
        );
      }

      final normalized = Map<String, dynamic>.from(snapshot)
        ..['courseId'] = courseId;
      final validation = CourseSchemaValidator.validateJsonMap(
        normalized,
        mode: CourseSchemaValidationMode.publish,
      );
      if (validation.hasBlockingErrors) {
        return CourseResult(
          success: false,
          message: _formatSchemaValidationMessage(
            action: 'Publish',
            errors: validation.errorMessages,
          ),
          validation: validation,
        );
      }

      await client.rpc('publish_course', params: {'p_course_id': courseId});

      return CourseResult(
        success: true,
        message: validation.warnings.isEmpty
            ? 'Published'
            : 'Published with ${validation.warnings.length} warning(s)',
        validation: validation,
      );
    } catch (e) {
      return CourseResult(success: false, message: 'Publish failed: $e');
    }
  }

  /// Get the user's course list
  static Future<List<Map<String, dynamic>>> getMyCourses() async {
    if (currentUser == null) return [];

    try {
      final response = await client
          .from('courses')
          .select()
          .eq('author_id', currentUser!.id)
          .order('updated_at', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Get course details (including content)
  static Future<Course?> getCourseContent(
    String courseId, {
    String? versionId,
  }) async {
    try {
      final snapshot = await _loadCourseSnapshot(courseId);
      if (snapshot != null && snapshot.containsKey('courseId')) {
        final normalizedSnapshot = Map<String, dynamic>.from(snapshot)
          ..['courseId'] = courseId;
        return Course.fromJson(normalizedSnapshot);
      }

      // Fallback: at least open the builder with base metadata.
      final courseRow = await client
          .from('courses')
          .select('id, title')
          .eq('id', courseId)
          .maybeSingle();
      if (courseRow == null) return null;

      return Course.create(
        title: courseRow['title'] as String? ?? 'Untitled Course',
      ).copyWith(courseId: courseId);
    } catch (e) {
      return null;
    }
  }

  /// Search published courses
  static Future<List<Map<String, dynamic>>> searchCourses({
    String? query,
    List<String>? tags,
    String? difficulty,
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final response = await client.rpc(
        'search_courses',
        params: {
          'p_query': query,
          'p_tags': tags,
          'p_difficulty': difficulty,
          'p_limit': limit,
          'p_offset': offset,
        },
      );

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Get recommended courses
  static Future<List<Map<String, dynamic>>> getRecommendedCourses({
    int limit = 20,
  }) async {
    try {
      final response = await client.rpc(
        'recommend_courses',
        params: {'p_limit': limit},
      );

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Create a course row only (no chapters, lessons, or snapshot).
  /// Used by Dashboard's Create Course flow.
  static Future<CourseResult> createCourseRow({required String title}) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    try {
      final tempId = IdGenerator.generate();
      final insertResult = await client
          .from('courses')
          .insert({
            'author_id': currentUser!.id,
            'title': title,
            'slug': _buildCourseSlug(title, tempId),
            'status': 'draft',
          })
          .select('id')
          .single();

      return CourseResult(
        success: true,
        message: 'Created',
        courseId: insertResult['id'] as String,
      );
    } catch (e) {
      return CourseResult(success: false, message: 'Create failed: $e');
    }
  }

  /// Rename an existing course row.
  /// Used by Dashboard's Edit action to change course name explicitly.
  static Future<CourseResult> renameCourse({
    required String courseId,
    required String title,
  }) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    final nextTitle = title.trim();
    if (nextTitle.isEmpty) {
      return const CourseResult(
        success: false,
        message: 'Course name cannot be empty',
      );
    }

    try {
      final updated = await client
          .from('courses')
          .update({'title': nextTitle})
          .eq('id', courseId)
          .eq('author_id', currentUser!.id)
          .select('id')
          .maybeSingle();

      if (updated == null) {
        return const CourseResult(
          success: false,
          message: 'Course not found or no permission',
        );
      }

      return const CourseResult(success: true, message: 'Course name updated');
    } catch (e) {
      return CourseResult(success: false, message: 'Update failed: $e');
    }
  }

  /// Get lesson titles for a course by querying chapters → lessons directly.
  /// Returns an empty list if the course has no saved content yet.
  static Future<List<String>> getCourseLessonTitles(String courseId) async {
    try {
      final chapters = await client
          .from('chapters')
          .select('id')
          .eq('course_id', courseId)
          .order('sort_key', ascending: true);

      if ((chapters as List).isEmpty) return [];

      final chapterIds = chapters.map((c) => c['id'] as String).toList();

      final lessons = await client
          .from('lessons')
          .select('title')
          .inFilter('chapter_id', chapterIds)
          .order('sort_key', ascending: true);

      return (lessons as List)
          .map((l) => (l['title'] as String?) ?? 'Untitled')
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Delete course
  static Future<CourseResult> deleteCourse(String courseId) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    try {
      await client.from('courses').delete().eq('id', courseId);
      return const CourseResult(success: true, message: 'Deleted');
    } catch (e) {
      return CourseResult(success: false, message: 'Delete failed: $e');
    }
  }

  // ==================== Dashboard Metrics ====================

  /// Get dashboard metrics for the current user.
  /// Returns { fans, likes, shares, income } with 0 defaults.
  static Future<Map<String, int>> getDashboardMetrics() async {
    if (currentUser == null) {
      return {'fans': 0, 'likes': 0, 'shares': 0, 'income': 0};
    }

    int fans = 0;
    int likes = 0;

    // Fans = number of followers (follows where following_id = me)
    try {
      final result = await client
          .from('follows')
          .select()
          .eq('following_id', currentUser!.id);
      fans = (result as List).length;
    } catch (_) {}

    // Likes = total course_feedback on my courses
    try {
      final myCourseIds = await _getMyCourseIds();
      if (myCourseIds.isNotEmpty) {
        final result = await client
            .from('course_feedback')
            .select()
            .inFilter('course_id', myCourseIds);
        likes = (result as List).length;
      }
    } catch (_) {}

    return {
      'fans': fans,
      'likes': likes,
      'shares': 0, // No shares table yet
      'income': 0, // No income table yet
    };
  }

  /// Get recent comments on the current user's courses.
  /// Returns list of { comment, rating, created_at, username, avatar_url }.
  static Future<List<Map<String, dynamic>>> getRecentComments({
    int limit = 4,
  }) async {
    if (currentUser == null) return [];

    try {
      final myCourseIds = await _getMyCourseIds();
      if (myCourseIds.isEmpty) return [];

      final result = await client
          .from('course_feedback')
          .select('id, comment, rating, created_at, user_id, course_id')
          .inFilter('course_id', myCourseIds)
          .order('created_at', ascending: false)
          .limit(limit);

      final comments = List<Map<String, dynamic>>.from(result);

      // Enrich with profile info
      for (final comment in comments) {
        try {
          final profile = await client
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', comment['user_id'] as String)
              .maybeSingle();
          comment['username'] =
              profile?['username'] ?? profile?['display_name'] ?? 'User';
          comment['avatar_url'] = profile?['avatar_url'];
        } catch (_) {
          comment['username'] = 'User';
          comment['avatar_url'] = null;
        }
      }

      return comments;
    } catch (_) {
      return [];
    }
  }

  /// Helper: get current user's course IDs
  static Future<List<String>> _getMyCourseIds() async {
    if (currentUser == null) return [];
    try {
      final courses = await client
          .from('courses')
          .select('id')
          .eq('author_id', currentUser!.id);
      return (courses as List).map((c) => c['id'].toString()).toList();
    } catch (_) {
      return [];
    }
  }

  // ==================== Helper methods ====================

  static Future<void> _saveCourseSnapshot(Course course) async {
    final chapter = await client
        .from('chapters')
        .select('id')
        .eq('course_id', course.courseId)
        .order('sort_key', ascending: true)
        .limit(1)
        .maybeSingle();

    final chapterId =
        chapter?['id'] as String? ??
        (await client
                .from('chapters')
                .insert({
                  'course_id': course.courseId,
                  'title': 'Chapter 1',
                  'sort_key': 1000,
                  'is_locked': false,
                })
                .select('id')
                .single())['id']
            as String;

    final lesson = await client
        .from('lessons')
        .select('id')
        .eq('chapter_id', chapterId)
        .order('sort_key', ascending: true)
        .limit(1)
        .maybeSingle();

    final lessonPayload = {
      'title': course.metadata.title.isEmpty
          ? 'Untitled Lesson'
          : course.metadata.title,
      'content_json': course.toJson(),
      'type': 'interactive',
      'sort_key': 1000,
    };

    if (lesson == null) {
      await client.from('lessons').insert({
        'chapter_id': chapterId,
        ...lessonPayload,
      });
      return;
    }

    await client
        .from('lessons')
        .update(lessonPayload)
        .eq('id', lesson['id'] as String);
  }

  static Future<Map<String, dynamic>?> _loadCourseSnapshot(
    String courseId,
  ) async {
    final chapter = await client
        .from('chapters')
        .select('id')
        .eq('course_id', courseId)
        .order('sort_key', ascending: true)
        .limit(1)
        .maybeSingle();

    if (chapter == null) return null;

    final lesson = await client
        .from('lessons')
        .select('content_json')
        .eq('chapter_id', chapter['id'] as String)
        .order('sort_key', ascending: true)
        .limit(1)
        .maybeSingle();

    final content = lesson?['content_json'];
    if (content is Map<String, dynamic>) return content;
    if (content is Map) return Map<String, dynamic>.from(content);
    return null;
  }

  static String _normalizeDifficulty(String? difficulty) {
    switch (difficulty) {
      case 'beginner':
      case 'intermediate':
      case 'advanced':
        return difficulty!;
      default:
        return 'beginner';
    }
  }

  static bool _isUuid(String value) {
    return RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
    ).hasMatch(value);
  }

  static String _buildCourseSlug(String title, String courseId) {
    final normalized = title.toLowerCase().trim().replaceAll(
      RegExp(r'[^a-z0-9]+'),
      '-',
    );
    final base = normalized.replaceAll(RegExp(r'^-+|-+$'), '');
    final fallback = base.isEmpty ? 'course' : base;
    return '$fallback-${courseId.split('-').first}';
  }

  static String _formatSchemaValidationMessage({
    required String action,
    required List<String> errors,
  }) {
    if (errors.isEmpty) return '$action blocked by schema validation';
    final shown = errors.take(8).toList();
    final more = errors.length - shown.length;
    final suffix = more > 0 ? '\n...and $more more issue(s)' : '';
    return '$action blocked by schema validation:\n${shown.join('\n')}$suffix';
  }

  static bool _isRetryableAuthTimeout(String message) {
    final raw = message.toLowerCase();
    return raw.contains('request_timeout') ||
        raw.contains('timed out') ||
        raw.contains('context deadline exceeded');
  }

  static String _translateAuthError(String message) {
    var normalized = message;
    final trimmed = message.trim();

    // Some auth failures come back as JSON payload string.
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

/// Course operation result
class CourseResult {
  final bool success;
  final String message;
  final String? courseId;
  final String? versionId;
  final CourseSchemaValidationResult? validation;

  const CourseResult({
    required this.success,
    required this.message,
    this.courseId,
    this.versionId,
    this.validation,
  });
}
