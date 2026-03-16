import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/course.dart';

/// Local storage service
class StorageService {
  static const String _courseKey = 'current_course';
  static const String _autoSaveKey = 'auto_save_enabled';
  static const String _courseDraftPrefix = 'course_draft_';
  static const String _languageKey = 'language';
  static const String _settingsPrefix = 'builder_settings_';
  static const String _settingsDifficultyKey =
      '${_settingsPrefix}default_difficulty';
  static const String _settingsPriceTierKey =
      '${_settingsPrefix}default_price_tier';
  static const String _settingsPublishChecklistKey =
      '${_settingsPrefix}publish_checklist_enabled';
  static const String _settingsPublishConfirmKey =
      '${_settingsPrefix}publish_confirm_enabled';
  static const String _settingsAiQualityGuardKey =
      '${_settingsPrefix}ai_quality_guard_enabled';
  static const String _settingsAiAutoQuizKey =
      '${_settingsPrefix}ai_auto_quiz_enabled';
  static const String _settingsAiStrictSchemaKey =
      '${_settingsPrefix}ai_strict_schema_enabled';
  static const String _settingsEmailNotifyKey =
      '${_settingsPrefix}email_notifications_enabled';
  static const String _settingsCommentAlertKey =
      '${_settingsPrefix}comment_alert_enabled';
  static const String _settingsFanAlertKey =
      '${_settingsPrefix}fan_alert_enabled';
  static const String _settingsWeeklyDigestKey =
      '${_settingsPrefix}weekly_digest_enabled';
  static const String _settingsWebhookUrlKey = '${_settingsPrefix}webhook_url';
  static const String _settingsCustomDomainKey =
      '${_settingsPrefix}custom_domain';
  static const String _animationApiKeyKey = '${_settingsPrefix}animation_api_key';
  static const String _settingsPublicProfileKey =
      '${_settingsPrefix}public_profile_enabled';
  static const String _settingsUsageTelemetryKey =
      '${_settingsPrefix}usage_telemetry_enabled';

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

  static String _courseDraftKey(String courseId) {
    return '$_courseDraftPrefix$courseId';
  }

  /// Save unsaved draft for a specific course into browser storage.
  static Future<bool> saveCourseDraft(String courseId, Course course) async {
    if (courseId.isEmpty) return false;
    if (_prefs == null) await init();

    try {
      final jsonString = jsonEncode(course.toJson());
      return await _prefs!.setString(_courseDraftKey(courseId), jsonString);
    } catch (e) {
      return false;
    }
  }

  /// Load unsaved draft for a specific course.
  static Future<Course?> loadCourseDraft(String courseId) async {
    if (courseId.isEmpty) return null;
    if (_prefs == null) await init();

    try {
      final jsonString = _prefs!.getString(_courseDraftKey(courseId));
      if (jsonString == null) return null;

      final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
      return Course.fromJson(jsonMap);
    } catch (e) {
      return null;
    }
  }

  /// Whether a specific course has an unsaved browser draft.
  static Future<bool> hasCourseDraft(String courseId) async {
    if (courseId.isEmpty) return false;
    if (_prefs == null) await init();
    return _prefs!.containsKey(_courseDraftKey(courseId));
  }

  /// Remove a specific course draft from browser storage.
  static Future<bool> clearCourseDraft(String courseId) async {
    if (courseId.isEmpty) return false;
    if (_prefs == null) await init();
    return await _prefs!.remove(_courseDraftKey(courseId));
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

  /// Persist selected language code ('en' | 'zh').
  static Future<bool> saveLanguage(String code) async {
    if (_prefs == null) await init();
    return await _prefs!.setString(_languageKey, code);
  }

  /// Return the previously saved language code, or null if not set.
  /// Callers must ensure [init] has been awaited first.
  static String? getLanguage() {
    return _prefs?.getString(_languageKey);
  }

  static Future<bool> saveDefaultCourseDifficulty(String value) async {
    if (_prefs == null) await init();
    return _prefs!.setString(_settingsDifficultyKey, value);
  }

  static String getDefaultCourseDifficulty() {
    return _prefs?.getString(_settingsDifficultyKey) ?? 'beginner';
  }

  static Future<bool> saveDefaultCoursePriceTier(String value) async {
    if (_prefs == null) await init();
    return _prefs!.setString(_settingsPriceTierKey, value);
  }

  static String getDefaultCoursePriceTier() {
    return _prefs?.getString(_settingsPriceTierKey) ?? 'free';
  }

  static Future<bool> savePublishChecklistEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsPublishChecklistKey, enabled);
  }

  static bool getPublishChecklistEnabled() {
    return _prefs?.getBool(_settingsPublishChecklistKey) ?? true;
  }

  static Future<bool> savePublishConfirmEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsPublishConfirmKey, enabled);
  }

  static bool getPublishConfirmEnabled() {
    return _prefs?.getBool(_settingsPublishConfirmKey) ?? true;
  }

  static Future<bool> saveAiQualityGuardEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsAiQualityGuardKey, enabled);
  }

  static bool getAiQualityGuardEnabled() {
    return _prefs?.getBool(_settingsAiQualityGuardKey) ?? true;
  }

  static Future<bool> saveAiAutoQuizEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsAiAutoQuizKey, enabled);
  }

  static bool getAiAutoQuizEnabled() {
    return _prefs?.getBool(_settingsAiAutoQuizKey) ?? false;
  }

  static Future<bool> saveAiStrictSchemaEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsAiStrictSchemaKey, enabled);
  }

  static bool getAiStrictSchemaEnabled() {
    return _prefs?.getBool(_settingsAiStrictSchemaKey) ?? true;
  }

  static Future<bool> saveEmailNotificationsEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsEmailNotifyKey, enabled);
  }

  static bool getEmailNotificationsEnabled() {
    return _prefs?.getBool(_settingsEmailNotifyKey) ?? true;
  }

  static Future<bool> saveCommentAlertEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsCommentAlertKey, enabled);
  }

  static bool getCommentAlertEnabled() {
    return _prefs?.getBool(_settingsCommentAlertKey) ?? true;
  }

  static Future<bool> saveFanAlertEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsFanAlertKey, enabled);
  }

  static bool getFanAlertEnabled() {
    return _prefs?.getBool(_settingsFanAlertKey) ?? true;
  }

  static Future<bool> saveWeeklyDigestEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsWeeklyDigestKey, enabled);
  }

  static bool getWeeklyDigestEnabled() {
    return _prefs?.getBool(_settingsWeeklyDigestKey) ?? true;
  }

  static Future<bool> saveWebhookUrl(String value) async {
    if (_prefs == null) await init();
    return _prefs!.setString(_settingsWebhookUrlKey, value);
  }

  static String getWebhookUrl() {
    return _prefs?.getString(_settingsWebhookUrlKey) ?? '';
  }

  static Future<bool> saveCustomDomain(String value) async {
    if (_prefs == null) await init();
    return _prefs!.setString(_settingsCustomDomainKey, value);
  }

  static String getCustomDomain() {
    return _prefs?.getString(_settingsCustomDomainKey) ?? '';
  }

  static Future<bool> savePublicProfileEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsPublicProfileKey, enabled);
  }

  static bool getPublicProfileEnabled() {
    return _prefs?.getBool(_settingsPublicProfileKey) ?? true;
  }

  static Future<bool> saveUsageTelemetryEnabled(bool enabled) async {
    if (_prefs == null) await init();
    return _prefs!.setBool(_settingsUsageTelemetryKey, enabled);
  }

  static bool getUsageTelemetryEnabled() {
    return _prefs?.getBool(_settingsUsageTelemetryKey) ?? true;
  }

  /// Persist Gemini API key used for animation/visual generation.
  static Future<bool> saveAnimationApiKey(String key) async {
    if (_prefs == null) await init();
    return _prefs!.setString(_animationApiKeyKey, key);
  }

  /// Return the previously saved Gemini API key, or null.
  static Future<String?> getAnimationApiKey() async {
    if (_prefs == null) await init();
    final val = _prefs!.getString(_animationApiKeyKey);
    return val?.isEmpty == true ? null : val;
  }

  static Future<int> clearAllCourseDrafts() async {
    if (_prefs == null) await init();
    final keys = _prefs!.getKeys();
    final draftKeys = keys.where((k) => k.startsWith(_courseDraftPrefix));
    var removed = 0;
    for (final key in draftKeys) {
      if (await _prefs!.remove(key)) removed++;
    }
    return removed;
  }
}

/// Remote API service (placeholder)
class ApiService {
  static const String _baseUrl = 'https://api.primoria.com';

  /// Save course to server (placeholder)
  static Future<ApiResponse> saveCourseToServer(Course course) async {
    // TODO: implement real API call
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(success: true, message: 'Saved (mock)');
  }

  /// Load course from server (placeholder)
  static Future<ApiResponse<Course>> loadCourseFromServer(
    String courseId,
  ) async {
    // TODO: implement real API call
    await Future.delayed(const Duration(milliseconds: 500));

    return const ApiResponse(success: false, message: 'Coming soon');
  }
}

/// API response
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;

  const ApiResponse({required this.success, required this.message, this.data});
}
