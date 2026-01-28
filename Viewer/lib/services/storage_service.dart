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

  Future<void> saveCompletedLessons(String courseId, List<String> lessonIds) async {
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

  // Sound settings
  Future<void> saveSoundEnabled(bool enabled) async {
    await _prefs?.setBool('soundEnabled', enabled);
  }

  bool getSoundEnabled() {
    return _prefs?.getBool('soundEnabled') ?? true;
  }

  // Notification settings
  Future<void> saveNotificationsEnabled(bool enabled) async {
    await _prefs?.setBool('notificationsEnabled', enabled);
  }

  bool getNotificationsEnabled() {
    return _prefs?.getBool('notificationsEnabled') ?? true;
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

  // Clear all data
  Future<void> clearAll() async {
    await _prefs?.clear();
  }
}
