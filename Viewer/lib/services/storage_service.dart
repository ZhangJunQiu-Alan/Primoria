import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Local storage service
class StorageService {
  static StorageService? _instance;
  static SharedPreferences? _prefs;

  StorageService._();

  static Future<StorageService> getInstance() async {
    _instance ??= StorageService._();
    _prefs ??= await SharedPreferences.getInstance();
    return _instance!;
  }

  // User data
  Future<void> saveUser(Map<String, dynamic> user) async {
    await _prefs?.setString('user', jsonEncode(user));
  }

  Map<String, dynamic>? getUser() {
    final userStr = _prefs?.getString('user');
    if (userStr != null) {
      return jsonDecode(userStr);
    }
    return null;
  }

  Future<void> clearUser() async {
    await _prefs?.remove('user');
  }

  // Learning streak
  Future<void> saveStreak(int streak) async {
    await _prefs?.setInt('streak', streak);
    await _prefs?.setString('lastStudyDate', DateTime.now().toIso8601String());
  }

  int getStreak() {
    return _prefs?.getInt('streak') ?? 0;
  }

  String? getLastStudyDate() {
    return _prefs?.getString('lastStudyDate');
  }

  // Longest streak
  Future<void> saveLongestStreak(int streak) async {
    await _prefs?.setInt('longestStreak', streak);
  }

  int getLongestStreak() {
    return _prefs?.getInt('longestStreak') ?? 0;
  }

  // Course progress
  Future<void> saveCourseProgress(String courseId, double progress) async {
    await _prefs?.setDouble('course_$courseId', progress);
  }

  double getCourseProgress(String courseId) {
    return _prefs?.getDouble('course_$courseId') ?? 0.0;
  }

  Future<void> saveCompletedLessons(
    String courseId,
    List<String> lessonIds,
  ) async {
    await _prefs?.setStringList('completed_$courseId', lessonIds);
  }

  List<String> getCompletedLessons(String courseId) {
    return _prefs?.getStringList('completed_$courseId') ?? [];
  }

  // Achievements
  Future<void> saveUnlockedAchievements(List<String> achievements) async {
    await _prefs?.setStringList('achievements', achievements);
  }

  List<String> getUnlockedAchievements() {
    return _prefs?.getStringList('achievements') ?? [];
  }

  // Learning statistics
  Future<void> incrementCompletedCourses() async {
    final current = _prefs?.getInt('completedCourses') ?? 0;
    await _prefs?.setInt('completedCourses', current + 1);
  }

  int getCompletedCourses() {
    return _prefs?.getInt('completedCourses') ?? 0;
  }

  Future<void> addStudyTime(int minutes) async {
    final current = _prefs?.getInt('totalStudyMinutes') ?? 0;
    await _prefs?.setInt('totalStudyMinutes', current + minutes);
  }

  int getTotalStudyMinutes() {
    return _prefs?.getInt('totalStudyMinutes') ?? 0;
  }

  Future<void> incrementCompletedQuestions() async {
    final current = _prefs?.getInt('completedQuestions') ?? 0;
    await _prefs?.setInt('completedQuestions', current + 1);
  }

  int getCompletedQuestions() {
    return _prefs?.getInt('completedQuestions') ?? 0;
  }

  // Theme settings
  Future<void> saveThemeMode(String mode) async {
    await _prefs?.setString('themeMode', mode);
  }

  String getThemeMode() {
    return _prefs?.getString('themeMode') ?? 'system';
  }

  // Language settings
  Future<void> saveLanguage(String code) async {
    await _prefs?.setString('language', code);
  }

  String? getLanguage() {
    return _prefs?.getString('language');
  }

  // Sound settings
  Future<void> saveSoundEnabled(bool enabled) async {
    await _prefs?.setBool('soundEnabled', enabled);
  }

  bool getSoundEnabled() {
    return _prefs?.getBool('soundEnabled') ?? true;
  }

  // Haptics settings
  Future<void> saveHapticsEnabled(bool enabled) async {
    await _prefs?.setBool('hapticsEnabled', enabled);
  }

  bool getHapticsEnabled() {
    return _prefs?.getBool('hapticsEnabled') ?? true;
  }

  // Notification settings
  Future<void> saveNotificationsEnabled(bool enabled) async {
    await _prefs?.setBool('notificationsEnabled', enabled);
  }

  bool getNotificationsEnabled() {
    return _prefs?.getBool('notificationsEnabled') ?? true;
  }

  Future<void> saveDailyReminderEnabled(bool enabled) async {
    await _prefs?.setBool('dailyReminderEnabled', enabled);
  }

  bool getDailyReminderEnabled() {
    return _prefs?.getBool('dailyReminderEnabled') ?? false;
  }

  Future<void> saveDailyReminderTime({
    required int hour,
    required int minute,
  }) async {
    await _prefs?.setInt('dailyReminderHour', hour);
    await _prefs?.setInt('dailyReminderMinute', minute);
  }

  int getDailyReminderHour() {
    return _prefs?.getInt('dailyReminderHour') ?? 20;
  }

  int getDailyReminderMinute() {
    return _prefs?.getInt('dailyReminderMinute') ?? 0;
  }

  Future<void> saveStreakReminderEnabled(bool enabled) async {
    await _prefs?.setBool('streakReminderEnabled', enabled);
  }

  bool getStreakReminderEnabled() {
    return _prefs?.getBool('streakReminderEnabled') ?? true;
  }

  Future<void> saveAchievementReminderEnabled(bool enabled) async {
    await _prefs?.setBool('achievementReminderEnabled', enabled);
  }

  bool getAchievementReminderEnabled() {
    return _prefs?.getBool('achievementReminderEnabled') ?? true;
  }

  // Learning settings
  Future<void> saveAutoplayEnabled(bool enabled) async {
    await _prefs?.setBool('autoplayEnabled', enabled);
  }

  bool getAutoplayEnabled() {
    return _prefs?.getBool('autoplayEnabled') ?? true;
  }

  Future<void> saveLearningHintEnabled(bool enabled) async {
    await _prefs?.setBool('learningHintEnabled', enabled);
  }

  bool getLearningHintEnabled() {
    return _prefs?.getBool('learningHintEnabled') ?? true;
  }

  Future<void> saveDailyGoalMinutes(int minutes) async {
    await _prefs?.setInt('dailyGoalMinutes', minutes);
  }

  int getDailyGoalMinutes() {
    return _prefs?.getInt('dailyGoalMinutes') ?? 20;
  }

  // Privacy settings
  Future<void> savePrivateProfile(bool enabled) async {
    await _prefs?.setBool('privateProfile', enabled);
  }

  bool getPrivateProfile() {
    return _prefs?.getBool('privateProfile') ?? false;
  }

  Future<void> saveShareLearningActivity(bool enabled) async {
    await _prefs?.setBool('shareLearningActivity', enabled);
  }

  bool getShareLearningActivity() {
    return _prefs?.getBool('shareLearningActivity') ?? true;
  }

  Future<void> saveAllowFollowers(bool enabled) async {
    await _prefs?.setBool('allowFollowers', enabled);
  }

  bool getAllowFollowers() {
    return _prefs?.getBool('allowFollowers') ?? true;
  }

  Future<void> saveWifiOnlyDownloads(bool enabled) async {
    await _prefs?.setBool('wifiOnlyDownloads', enabled);
  }

  bool getWifiOnlyDownloads() {
    return _prefs?.getBool('wifiOnlyDownloads') ?? false;
  }

  // Favorite courses
  Future<void> saveFavoriteCourses(List<String> courseIds) async {
    await _prefs?.setStringList('favoriteCourses', courseIds);
  }

  List<String> getFavoriteCourses() {
    return _prefs?.getStringList('favoriteCourses') ?? [];
  }

  Future<void> toggleFavoriteCourse(String courseId) async {
    final favorites = getFavoriteCourses();
    if (favorites.contains(courseId)) {
      favorites.remove(courseId);
    } else {
      favorites.add(courseId);
    }
    await saveFavoriteCourses(favorites);
  }

  bool isCourseFavorite(String courseId) {
    return getFavoriteCourses().contains(courseId);
  }

  // Remember me (login form)
  Future<void> saveRememberMe(bool remember, String email) async {
    await _prefs?.setBool('rememberMe', remember);
    if (remember) {
      await _prefs?.setString('rememberedEmail', email);
    } else {
      await _prefs?.remove('rememberedEmail');
    }
  }

  bool getRememberMe() => _prefs?.getBool('rememberMe') ?? false;
  String getRememberedEmail() => _prefs?.getString('rememberedEmail') ?? '';

  // Clear all data
  Future<void> clearAll() async {
    await _prefs?.clear();
  }
}
