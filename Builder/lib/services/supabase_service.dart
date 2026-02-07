import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';

/// Supabase service - handles auth, course storage, publishing, etc.
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;

  /// Current user
  static User? get currentUser => client.auth.currentUser;

  /// Is logged in
  static bool get isLoggedIn => currentUser != null;

  /// Auth state changes
  static Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

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
      return AuthResult(success: false, message: _translateAuthError(e.message));
    } catch (e) {
      return AuthResult(success: false, message: 'Sign up failed: $e');
    }
  }

  /// Sign in with email
  static Future<AuthResult> signIn({
    required String email,
    required String password,
  }) async {
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
      return AuthResult(success: false, message: _translateAuthError(e.message));
    } catch (e) {
      return AuthResult(success: false, message: 'Sign in failed: $e');
    }
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
      return AuthResult(success: false, message: _translateAuthError(e.message));
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
      return AuthResult(success: false, message: _translateAuthError(e.message));
    } catch (e) {
      return AuthResult(success: false, message: 'Sign in failed: $e');
    }
  }

  /// Sign in with GitHub
  static Future<AuthResult> signInWithGitHub() async {
    try {
      await client.auth.signInWithOAuth(
        OAuthProvider.github,
        redirectTo: _getRedirectUrl(),
      );
      return const AuthResult(success: true, message: 'Redirecting...');
    } on AuthException catch (e) {
      return AuthResult(success: false, message: _translateAuthError(e.message));
    } catch (e) {
      return AuthResult(success: false, message: 'Sign in failed: $e');
    }
  }

  /// Get OAuth redirect URL
  static String _getRedirectUrl() {
    // For web, use current page URL
    return Uri.base.origin;
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
      await client.from('profiles').update({
        if (displayName != null) 'display_name': displayName,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      }).eq('id', currentUser!.id);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== Course Management ====================

  /// Save course (create or update)
  static Future<CourseResult> saveCourse(Course course) async {
    if (currentUser == null) {
      return const CourseResult(success: false, message: 'Please sign in first');
    }

    try {
      // Check if course exists
      final existing = await client
          .from('courses')
          .select('id, owner_id')
          .eq('id', course.courseId)
          .maybeSingle();

      String courseId;

      if (existing == null) {
        // Create new course
        final insertResult = await client.from('courses').insert({
          'id': course.courseId,
          'owner_id': currentUser!.id,
          'title': course.metadata.title,
          'description': course.metadata.description,
          'tags': course.metadata.tags,
          'difficulty': course.metadata.difficulty,
          'estimated_minutes': course.metadata.estimatedMinutes,
          'status': 'draft',
        }).select('id').single();

        courseId = insertResult['id'] as String;
      } else {
        // Update existing course
        if (existing['owner_id'] != currentUser!.id) {
          return const CourseResult(
            success: false,
            message: 'You do not have permission to edit this course',
          );
        }

        await client.from('courses').update({
          'title': course.metadata.title,
          'description': course.metadata.description,
          'tags': course.metadata.tags,
          'difficulty': course.metadata.difficulty,
          'estimated_minutes': course.metadata.estimatedMinutes,
        }).eq('id', course.courseId);

        courseId = course.courseId;
      }

      // Get latest version
      final latestVersion = await client
          .from('course_versions')
          .select('version')
          .eq('course_id', courseId)
          .order('version', ascending: false)
          .limit(1)
          .maybeSingle();

      final newVersion = (latestVersion?['version'] as int? ?? 0) + 1;

      // Create new version
      final versionResult = await client.from('course_versions').insert({
        'course_id': courseId,
        'version': newVersion,
        'content': course.toJson(),
        'created_by': currentUser!.id,
      }).select('id').single();

      // Update current draft version
      await client.from('courses').update({
        'current_draft_version_id': versionResult['id'],
      }).eq('id', courseId);

      return CourseResult(
        success: true,
        message: 'Saved (version $newVersion)',
        courseId: courseId,
        versionId: versionResult['id'] as String,
      );
    } catch (e) {
      return CourseResult(success: false, message: 'Save failed: $e');
    }
  }

  /// Publish course
  static Future<CourseResult> publishCourse(String courseId, String versionId) async {
    if (currentUser == null) {
      return const CourseResult(success: false, message: 'Please sign in first');
    }

    try {
      await client.rpc('publish_course', params: {
        'p_course_id': courseId,
        'p_version_id': versionId,
      });

      return const CourseResult(success: true, message: 'Published');
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
          .eq('owner_id', currentUser!.id)
          .order('updated_at', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Get course details (including content)
  static Future<Course?> getCourseContent(String courseId, {String? versionId}) async {
    try {
      // If no version specified, get latest draft or published version
      String? targetVersionId = versionId;

      if (targetVersionId == null) {
        final course = await client
            .from('courses')
            .select('current_draft_version_id, current_published_version_id, owner_id')
            .eq('id', courseId)
            .single();

        // If the author, prefer draft version
        if (course['owner_id'] == currentUser?.id) {
          targetVersionId = course['current_draft_version_id'] as String?;
        }
        targetVersionId ??= course['current_published_version_id'] as String?;
      }

      if (targetVersionId == null) {
        return null;
      }

      final version = await client
          .from('course_versions')
          .select('content')
          .eq('id', targetVersionId)
          .single();

      final content = version['content'] as Map<String, dynamic>;
      return Course.fromJson(content);
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
      final response = await client.rpc('search_courses', params: {
        'p_query': query,
        'p_tags': tags,
        'p_difficulty': difficulty,
        'p_limit': limit,
        'p_offset': offset,
      });

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Get recommended courses
  static Future<List<Map<String, dynamic>>> getRecommendedCourses({int limit = 20}) async {
    try {
      final response = await client.rpc('recommend_courses', params: {
        'p_limit': limit,
      });

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  /// Delete course
  static Future<CourseResult> deleteCourse(String courseId) async {
    if (currentUser == null) {
      return const CourseResult(success: false, message: 'Please sign in first');
    }

    try {
      await client.from('courses').delete().eq('id', courseId);
      return const CourseResult(success: true, message: 'Deleted');
    } catch (e) {
      return CourseResult(success: false, message: 'Delete failed: $e');
    }
  }

  // ==================== Helper methods ====================

  static String _translateAuthError(String message) {
    if (message.contains('Invalid login credentials')) {
      return 'Incorrect email or password';
    }
    if (message.contains('Email not confirmed')) {
      return 'Please confirm your email first';
    }
    if (message.contains('User already registered')) {
      return 'Email is already registered';
    }
    if (message.contains('Password should be at least')) {
      return 'Password must be at least 6 characters';
    }
    if (message.contains('Invalid email')) {
      return 'Invalid email format';
    }
    return message;
  }
}

/// Auth result
class AuthResult {
  final bool success;
  final String message;

  const AuthResult({required this.success, required this.message});
}

/// Course operation result
class CourseResult {
  final bool success;
  final String message;
  final String? courseId;
  final String? versionId;

  const CourseResult({
    required this.success,
    required this.message,
    this.courseId,
    this.versionId,
  });
}
