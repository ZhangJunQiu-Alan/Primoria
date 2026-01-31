import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';

/// Supabase 服务 - 处理认证、课程存储、发布等
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;

  /// 当前用户
  static User? get currentUser => client.auth.currentUser;

  /// 是否已登录
  static bool get isLoggedIn => currentUser != null;

  /// 监听认证状态变化
  static Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  // ==================== 认证 ====================

  /// 邮箱注册
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

  /// 邮箱登录
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

  /// 登出
  static Future<void> signOut() async {
    await client.auth.signOut();
  }

  /// 重置密码（发送重置邮件）
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

  /// Google 登录
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

  /// GitHub 登录
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

  /// 获取 OAuth 重定向 URL
  static String _getRedirectUrl() {
    // 对于 Web，使用当前页面 URL
    return Uri.base.origin;
  }

  /// 获取用户资料
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

  /// 更新用户资料
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

  // ==================== 课程管理 ====================

  /// 保存课程（创建或更新）
  static Future<CourseResult> saveCourse(Course course) async {
    if (currentUser == null) {
      return const CourseResult(success: false, message: 'Please sign in first');
    }

    try {
      // 检查课程是否存在
      final existing = await client
          .from('courses')
          .select('id, owner_id')
          .eq('id', course.courseId)
          .maybeSingle();

      String courseId;

      if (existing == null) {
        // 创建新课程
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
        // 更新现有课程
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

      // 获取最新版本号
      final latestVersion = await client
          .from('course_versions')
          .select('version')
          .eq('course_id', courseId)
          .order('version', ascending: false)
          .limit(1)
          .maybeSingle();

      final newVersion = (latestVersion?['version'] as int? ?? 0) + 1;

      // 创建新版本
      final versionResult = await client.from('course_versions').insert({
        'course_id': courseId,
        'version': newVersion,
        'content': course.toJson(),
        'created_by': currentUser!.id,
      }).select('id').single();

      // 更新课程的当前草稿版本
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

  /// 发布课程
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

  /// 获取用户的课程列表
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

  /// 获取课程详情（包括内容）
  static Future<Course?> getCourseContent(String courseId, {String? versionId}) async {
    try {
      // 如果没有指定版本，获取最新草稿或已发布版本
      String? targetVersionId = versionId;

      if (targetVersionId == null) {
        final course = await client
            .from('courses')
            .select('current_draft_version_id, current_published_version_id, owner_id')
            .eq('id', courseId)
            .single();

        // 如果是作者，优先获取草稿版本
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

  /// 搜索已发布的课程
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

  /// 获取推荐课程
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

  /// 删除课程
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

  // ==================== 辅助方法 ====================

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

/// 认证结果
class AuthResult {
  final bool success;
  final String message;

  const AuthResult({required this.success, required this.message});
}

/// 课程操作结果
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
