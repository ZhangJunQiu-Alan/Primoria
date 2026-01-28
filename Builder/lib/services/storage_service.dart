import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/course.dart';

/// 本地存储服务
class StorageService {
  static const String _courseKey = 'current_course';
  static const String _autoSaveKey = 'auto_save_enabled';

  static SharedPreferences? _prefs;

  /// 初始化
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// 保存课程到本地
  static Future<bool> saveCourse(Course course) async {
    if (_prefs == null) await init();

    try {
      final jsonString = jsonEncode(course.toJson());
      return await _prefs!.setString(_courseKey, jsonString);
    } catch (e) {
      return false;
    }
  }

  /// 从本地加载课程
  static Future<Course?> loadCourse() async {
    if (_prefs == null) await init();

    try {
      final jsonString = _prefs!.getString(_courseKey);
      if (jsonString == null) return null;

      final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
      return Course.fromJson(jsonMap);
    } catch (e) {
      return null;
    }
  }

  /// 检查是否有保存的课程
  static Future<bool> hasSavedCourse() async {
    if (_prefs == null) await init();
    return _prefs!.containsKey(_courseKey);
  }

  /// 清除保存的课程
  static Future<bool> clearCourse() async {
    if (_prefs == null) await init();
    return await _prefs!.remove(_courseKey);
  }

  /// 设置自动保存
  static Future<bool> setAutoSave(bool enabled) async {
    if (_prefs == null) await init();
    return await _prefs!.setBool(_autoSaveKey, enabled);
  }

  /// 获取自动保存设置
  static Future<bool> getAutoSave() async {
    if (_prefs == null) await init();
    return _prefs!.getBool(_autoSaveKey) ?? true;
  }
}

/// 远端 API 服务（占位实现）
class ApiService {
  static const String _baseUrl = 'https://api.primoria.com';

  /// 保存课程到服务器（占位）
  static Future<ApiResponse> saveCourseToServer(Course course) async {
    // TODO: 实现真实的 API 调用
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(
      success: true,
      message: '保存成功（模拟）',
    );
  }

  /// 从服务器加载课程（占位）
  static Future<ApiResponse<Course>> loadCourseFromServer(String courseId) async {
    // TODO: 实现真实的 API 调用
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(
      success: false,
      message: '功能即将推出',
    );
  }
}

/// API 响应
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;

  const ApiResponse({
    required this.success,
    required this.message,
    this.data,
  });
}
