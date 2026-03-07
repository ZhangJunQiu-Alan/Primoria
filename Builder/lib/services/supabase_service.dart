import 'dart:convert';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';
import '../models/lesson.dart';
import 'id_generator.dart';
import 'course_schema_validator.dart';

/// Supabase service - handles auth, course storage, publishing, etc.
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;
  static const Set<String> _builderRoles = {'author', 'admin'};
  static const String _builderAccessDeniedMessage =
      'This account does not have Builder access. '
      'Please use an author/admin account.';

  /// Current user
  static User? get currentUser => client.auth.currentUser;

  /// Is logged in
  static bool get isLoggedIn => currentUser != null;

  /// Auth state changes
  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  static String get builderAccessDeniedMessage => _builderAccessDeniedMessage;

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
          final hasAccess = await ensureBuilderAccess(signOutIfDenied: true);
          if (!hasAccess) {
            return const AuthResult(
              success: false,
              message: _builderAccessDeniedMessage,
            );
          }
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

  /// Sign in with Apple
  static Future<AuthResult> signInWithApple() async {
    try {
      await client.auth.signInWithOAuth(
        OAuthProvider.apple,
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

  /// Sign in with WeChat (placeholder — requires WeChat Open Platform setup)
  static Future<AuthResult> signInWithWeChat() async {
    return const AuthResult(
      success: false,
      message: 'WeChat login is not yet available.',
    );
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

  static bool isBuilderRole(String? role) {
    if (role == null) return false;
    return _builderRoles.contains(role);
  }

  static Future<String?> getCurrentUserRole() async {
    if (currentUser == null) return null;
    try {
      final profile = await client
          .from('profiles')
          .select('role')
          .eq('id', currentUser!.id)
          .maybeSingle();
      return profile?['role']?.toString();
    } catch (_) {
      return null;
    }
  }

  /// Checks whether current account can access Builder pages/features.
  static Future<bool> ensureBuilderAccess({
    bool signOutIfDenied = false,
  }) async {
    if (currentUser == null) return false;
    final role = await getCurrentUserRole();
    final allowed = isBuilderRole(role);
    if (!allowed && signOutIfDenied) {
      await signOut();
    }
    return allowed;
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
              'title': course.metadata.title,
              'description': course.metadata.description,
              'tags': course.metadata.tags,
              'difficulty_level': _normalizeDifficulty(
                course.metadata.difficulty,
              ),
              'estimated_minutes': course.metadata.estimatedMinutes,
              // Save means draft snapshot in cloud.
              'status': 'draft',
              'published_at': null,
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

  /// Save a lesson under an existing course.
  ///
  /// - If [lessonId] is null, append a new lesson to the course.
  /// - If [lessonId] is provided, update that lesson in place.
  /// - Never creates a new course row.
  static Future<CourseResult> saveLessonToCourse({
    required String courseId,
    required Course lessonCourse,
    String? lessonId,
  }) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    final normalizedCourse = lessonCourse.copyWith(courseId: courseId);
    final validation = CourseSchemaValidator.validateCourse(
      normalizedCourse,
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
      final existingCourse = await client
          .from('courses')
          .select('id, author_id')
          .eq('id', courseId)
          .maybeSingle();
      if (existingCourse == null) {
        return const CourseResult(success: false, message: 'Course not found');
      }
      if (existingCourse['author_id'] != currentUser!.id) {
        return const CourseResult(
          success: false,
          message: 'You do not have permission to edit this course',
        );
      }

      final lessonTitle = normalizedCourse.lessons
          .map((lesson) => lesson.title.trim())
          .firstWhere(
            (title) => title.isNotEmpty,
            orElse: () => normalizedCourse.metadata.title.trim(),
          );
      final title = lessonTitle.isEmpty ? 'Untitled Lesson' : lessonTitle;
      final lessonPayload = {
        'title': title,
        'content_json': normalizedCourse.toJson(),
        'type': 'interactive',
      };

      String persistedLessonId;
      final trimmedLessonId = lessonId?.trim();
      if (trimmedLessonId != null && trimmedLessonId.isNotEmpty) {
        final existingLesson = await client
            .from('lessons')
            .select('id')
            .eq('id', trimmedLessonId)
            .eq('course_id', courseId)
            .maybeSingle();
        if (existingLesson == null) {
          return const CourseResult(
            success: false,
            message: 'Lesson not found for this course',
          );
        }

        await client
            .from('lessons')
            .update(lessonPayload)
            .eq('id', trimmedLessonId);
        persistedLessonId = trimmedLessonId;
      } else {
        final lastLesson = await client
            .from('lessons')
            .select('sort_key')
            .eq('course_id', courseId)
            .order('sort_key', ascending: false)
            .limit(1)
            .maybeSingle();

        final lastSortKey = (lastLesson?['sort_key'] as num?)?.toInt() ?? 0;
        final nextSortKey = lastSortKey + 1000;

        final inserted = await client
            .from('lessons')
            .insert({
              'course_id': courseId,
              'sort_key': nextSortKey,
              ...lessonPayload,
              'is_locked': false,
              'unlock_type': 'none',
              'prerequisite_lesson_id': null,
              'paywall_product_id': null,
            })
            .select('id')
            .single();
        persistedLessonId = inserted['id'] as String;
      }

      // Touch the course row so Dashboard ordering/time reflects lesson save.
      await client
          .from('courses')
          .update({'status': 'draft'})
          .eq('id', courseId)
          .eq('author_id', currentUser!.id);

      return CourseResult(
        success: true,
        message: validation.warnings.isEmpty
            ? 'Saved'
            : 'Saved with ${validation.warnings.length} warning(s)',
        courseId: courseId,
        versionId: courseId,
        validation: validation,
        lessonId: persistedLessonId,
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

      // Defensive write-back:
      // In environments with old publish_course RPC, lesson content_json may
      // be overwritten to [] when content_blocks are empty. Restore snapshot.
      await _writeSnapshotToFirstLesson(
        courseId: courseId,
        snapshot: normalized,
      );

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

      // Fallback: reconstruct from individual lesson rows (agentic-generated
      // courses store {blocks:[...]} per lesson, not a full course snapshot).
      final reconstructed = await _reconstructCourseFromLessons(courseId);
      if (reconstructed != null) return reconstructed;

      // Last resort: open builder with title only (no content).
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

  /// Reconstruct a Course from individual lesson rows written by the agentic
  /// generator. Each lesson row has content_json = {blocks: [...]}.
  static Future<Course?> _reconstructCourseFromLessons(String courseId) async {
    final courseRow = await client
        .from('courses')
        .select(
          'id, title, description, difficulty_level, estimated_minutes, tags',
        )
        .eq('id', courseId)
        .maybeSingle();
    if (courseRow == null) return null;

    final lessons = await client
        .from('lessons')
        .select('id, title, content_json, sort_key')
        .eq('course_id', courseId)
        .order('sort_key', ascending: true);

    final lessonList = List<Map<String, dynamic>>.from(lessons as List);
    // Only use lessons that carry the agentic {blocks:[...]} format.
    final agenticLessons = lessonList.where((l) {
      final cj = l['content_json'];
      if (cj is! Map) return false;
      return cj.containsKey('blocks');
    }).toList();

    if (agenticLessons.isEmpty) return null;

    final courseLessons = agenticLessons.map((l) {
      final cj = Map<String, dynamic>.from(l['content_json'] as Map);
      final rawBlocks = cj['blocks'] as List<dynamic>? ?? [];
      return CourseLesson.fromJson({
        'lessonId': l['id'] as String,
        'title': l['title'] as String? ?? 'Untitled',
        'blocks': rawBlocks,
      });
    }).toList();

    final rawTags = courseRow['tags'];
    final tags = rawTags is List
        ? rawTags.map((e) => e.toString()).toList()
        : <String>[];

    return Course(
      courseId: courseId,
      metadata: CourseMetadata(
        title: courseRow['title'] as String? ?? 'Untitled Course',
        description: courseRow['description'] as String? ?? '',
        author: const CourseAuthor(userId: 'ai', displayName: 'AI'),
        tags: tags,
        difficulty: _normalizeDifficulty(
          courseRow['difficulty_level'] as String?,
        ),
        estimatedMinutes: courseRow['estimated_minutes'] as int? ?? 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        version: '1.0.0',
      ),
      settings: const CourseSettings(),
      lessons: courseLessons,
    );
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

  /// Upload a course thumbnail image to Supabase Storage.
  /// Returns (publicUrl, null) on success, (null, errorMessage) on failure.
  static Future<(String?, String?)> uploadCourseThumbnail({
    required Uint8List bytes,
    required String fileName,
  }) async {
    if (currentUser == null) {
      return (null, 'Please sign in first');
    }

    try {
      final ext = fileName.contains('.')
          ? fileName.split('.').last.toLowerCase()
          : 'jpg';
      final path = '${currentUser!.id}/${IdGenerator.generate()}.$ext';
      final mime = _imageExtToMime(ext);

      await client.storage
          .from('course-thumbnails')
          .uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: mime, upsert: true),
          );

      final url = client.storage.from('course-thumbnails').getPublicUrl(path);
      return (url, null);
    } catch (e) {
      return (null, e.toString());
    }
  }

  static String _imageExtToMime(String ext) {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /// Create a course row only (no chapters, lessons, or snapshot).
  /// Used by Dashboard's Create Course flow.
  static Future<CourseResult> createCourseRow({
    required String title,
    String? description,
    String? thumbnailUrl,
    String difficultyLevel = 'beginner',
    int? estimatedMinutes,
    String priceTier = 'free',
    double price = 0,
  }) async {
    if (currentUser == null) {
      return const CourseResult(
        success: false,
        message: 'Please sign in first',
      );
    }

    try {
      final tempId = IdGenerator.generate();
      final isPremium = priceTier == 'premium';
      final insertResult = await client
          .from('courses')
          .insert({
            'author_id': currentUser!.id,
            'title': title,
            'slug': _buildCourseSlug(title, tempId),
            'status': 'draft',
            if (description != null && description.isNotEmpty)
              'description': description,
            if (thumbnailUrl != null && thumbnailUrl.isNotEmpty)
              'thumbnail_url': thumbnailUrl,
            'difficulty_level': _normalizeDifficulty(difficultyLevel),
            if (estimatedMinutes != null) 'estimated_minutes': estimatedMinutes,
            'price_tier': isPremium ? 'premium' : 'free',
            'price': isPremium ? price : 0,
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

  /// Update course metadata fields.
  /// Used by Dashboard's Edit Course flow.
  static Future<CourseResult> updateCourseInfo({
    required String courseId,
    required String title,
    String? description,
    String? thumbnailUrl,
    String difficultyLevel = 'beginner',
    int? estimatedMinutes,
    String priceTier = 'free',
    double price = 0,
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
      final isPremium = priceTier == 'premium';
      final updated = await client
          .from('courses')
          .update({
            'title': nextTitle,
            'description': (description ?? '').isNotEmpty ? description : null,
            'thumbnail_url': (thumbnailUrl ?? '').isNotEmpty
                ? thumbnailUrl
                : null,
            'difficulty_level': _normalizeDifficulty(difficultyLevel),
            'estimated_minutes': estimatedMinutes ?? 0,
            'price_tier': isPremium ? 'premium' : 'free',
            'price': isPremium ? price : 0,
          })
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

      return const CourseResult(success: true, message: 'Course info updated');
    } catch (e) {
      return CourseResult(success: false, message: 'Update failed: $e');
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

  /// Get lesson titles for a course by querying lessons directly.
  /// Returns an empty list if the course has no saved content yet.
  static Future<List<String>> getCourseLessonTitles(String courseId) async {
    try {
      final lessons = await client
          .from('lessons')
          .select('title')
          .eq('course_id', courseId)
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
    final lessons = course.lessons;
    final fullJson = course.toJson();

    // Fetch ALL existing lesson rows for this course.
    // Agentic-generated courses store lessons at sort_key = order×1000
    // (1000, 2000, 3000 …), so the old [1000, 2000) upper-bound filter would
    // miss rows 2-N and cause duplicates on save.
    final existingRaw = await client
        .from('lessons')
        .select('id')
        .eq('course_id', course.courseId)
        .gte('sort_key', 1000)
        .order('sort_key', ascending: true);
    final existingIds = (existingRaw as List)
        .map((l) => l['id'] as String)
        .toList();

    if (lessons.isEmpty) {
      // Fallback: single row with course title (shouldn't normally occur)
      final payload = {
        'title': course.metadata.title.isEmpty
            ? 'Untitled Lesson'
            : course.metadata.title,
        'content_json': fullJson,
        'type': 'interactive',
        'sort_key': 1000,
      };
      if (existingIds.isEmpty) {
        await client.from('lessons').insert({
          'course_id': course.courseId,
          'is_locked': false,
          'unlock_type': 'none',
          'prerequisite_lesson_id': null,
          'paywall_product_id': null,
          ...payload,
        });
      } else {
        await client.from('lessons').update(payload).eq('id', existingIds[0]);
        if (existingIds.length > 1) {
          await client
              .from('lessons')
              .delete()
              .inFilter('id', existingIds.sublist(1));
        }
      }
      return;
    }

    // One lesson row per lesson.  Only the first row carries content_json
    // (the full course snapshot); remaining rows carry just the lesson title.
    for (int i = 0; i < lessons.length; i++) {
      final lessonTitle = lessons[i].title.trim().isNotEmpty
          ? lessons[i].title.trim()
          : (i == 0
                ? (course.metadata.title.isEmpty
                      ? 'Untitled'
                      : course.metadata.title)
                : 'Lesson ${i + 1}');
      final payload = <String, dynamic>{
        'title': lessonTitle,
        'type': 'interactive',
        'sort_key': 1000 + i * 10,
        if (i == 0) 'content_json': fullJson,
      };

      if (i < existingIds.length) {
        await client.from('lessons').update(payload).eq('id', existingIds[i]);
      } else {
        await client.from('lessons').insert({
          'course_id': course.courseId,
          'is_locked': false,
          'unlock_type': 'none',
          'prerequisite_lesson_id': null,
          'paywall_product_id': null,
          ...payload,
        });
      }
    }

    // Delete any extra snapshot rows if lesson count decreased.
    if (existingIds.length > lessons.length) {
      await client
          .from('lessons')
          .delete()
          .inFilter('id', existingIds.sublist(lessons.length));
    }
  }

  static Future<void> _writeSnapshotToFirstLesson({
    required String courseId,
    required Map<String, dynamic> snapshot,
  }) async {
    final lesson = await client
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
        .order('sort_key', ascending: true)
        .limit(1)
        .maybeSingle();

    if (lesson == null) return;

    String? firstLessonTitle;
    final lessons = snapshot['lessons'];
    if (lessons is List && lessons.isNotEmpty) {
      final first = lessons.first;
      if (first is Map) {
        final raw = first['title'];
        if (raw is String && raw.trim().isNotEmpty) {
          firstLessonTitle = raw.trim();
        }
      }
    }
    if ((firstLessonTitle == null || firstLessonTitle.isEmpty) &&
        snapshot['pages'] is List) {
      final pages = snapshot['pages'] as List;
      if (pages.isNotEmpty) {
        final first = pages.first;
        if (first is Map) {
          final raw = first['title'];
          if (raw is String && raw.trim().isNotEmpty) {
            firstLessonTitle = raw.trim();
          }
        }
      }
    }

    await client
        .from('lessons')
        .update({
          if (firstLessonTitle != null && firstLessonTitle.isNotEmpty)
            'title': firstLessonTitle,
          'content_json': snapshot,
        })
        .eq('id', lesson['id'] as String);
  }

  static Future<Map<String, dynamic>?> _loadCourseSnapshot(
    String courseId,
  ) async {
    final lesson = await client
        .from('lessons')
        .select('content_json')
        .eq('course_id', courseId)
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
  final String? lessonId;
  final CourseSchemaValidationResult? validation;

  const CourseResult({
    required this.success,
    required this.message,
    this.courseId,
    this.versionId,
    this.lessonId,
    this.validation,
  });
}
