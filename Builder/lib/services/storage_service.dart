import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/course.dart';

/// Local storage service
class StorageService {
  static const String _courseKey = 'current_course';
  static const String _autoSaveKey = 'auto_save_enabled';

  static SharedPreferences? _prefs;

  /// Initialize
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Save course locally
  static Future<bool> saveCourse(Course course) async {
    if (_prefs == null) await init();

    try {
      final jsonString = jsonEncode(course.toJson());
      return await _prefs!.setString(_courseKey, jsonString);
    } catch (e) {
      return false;
    }
  }

  /// Load course from local storage
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

  /// Check if there is a saved course
  static Future<bool> hasSavedCourse() async {
    if (_prefs == null) await init();
    return _prefs!.containsKey(_courseKey);
  }

  /// Clear saved course
  static Future<bool> clearCourse() async {
    if (_prefs == null) await init();
    return await _prefs!.remove(_courseKey);
  }

  /// Set auto-save
  static Future<bool> setAutoSave(bool enabled) async {
    if (_prefs == null) await init();
    return await _prefs!.setBool(_autoSaveKey, enabled);
  }

  /// Get auto-save setting
  static Future<bool> getAutoSave() async {
    if (_prefs == null) await init();
    return _prefs!.getBool(_autoSaveKey) ?? true;
  }
}

/// Remote API service (placeholder)
class ApiService {
  static const String _baseUrl = 'https://api.primoria.com';

  /// Save course to server (placeholder)
  static Future<ApiResponse> saveCourseToServer(Course course) async {
    // TODO: implement real API call
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(
      success: true,
      message: 'Saved (mock)',
    );
  }

  /// Load course from server (placeholder)
  static Future<ApiResponse<Course>> loadCourseFromServer(String courseId) async {
    // TODO: implement real API call
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(
      success: false,
      message: 'Coming soon',
    );
  }
}

/// API response
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
