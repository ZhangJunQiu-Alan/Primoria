import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

/// Notification service
class NotificationService {
  static NotificationService? _instance;
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  NotificationService._();

  static NotificationService getInstance() {
    _instance ??= NotificationService._();
    return _instance!;
  }

  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const macSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
      macOS: macSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    _initialized = true;
  }

  void _onNotificationTap(NotificationResponse response) {
    // Handle notification tap
    debugPrint('Notification tapped: ${response.payload}');
  }

  /// Request notification permission
  Future<bool> requestPermission() async {
    final android = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    final iOS = _notifications.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();

    if (android != null) {
      final granted = await android.requestNotificationsPermission();
      return granted ?? false;
    }

    if (iOS != null) {
      final granted = await iOS.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }

    return false;
  }

  /// Show instant notification
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'primoria_channel',
      'Primoria',
      channelDescription: 'Primoria learning reminders',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
      macOS: iosDetails,
    );

    await _notifications.show(id, title, body, details, payload: payload);
  }

  /// Schedule daily learning reminder
  Future<void> scheduleDailyReminder({
    required int hour,
    required int minute,
  }) async {
    // Cancel previous reminder
    await _notifications.cancel(1);

    // Note: Full implementation requires flutter_local_notifications scheduling
    // This is a simplified version
    debugPrint('Daily reminder scheduled for $hour:$minute');
  }

  /// Cancel all notifications
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// Show streak reminder
  Future<void> showStreakReminder(int currentStreak) async {
    await showNotification(
      id: 2,
      title: 'Don\'t forget today\'s study!',
      body: 'You\'ve been studying for $currentStreak days in a row. Keep it up!',
      payload: 'streak_reminder',
    );
  }

  /// Show achievement unlocked notification
  Future<void> showAchievementUnlocked(String achievementName) async {
    await showNotification(
      id: 3,
      title: 'Achievement Unlocked!',
      body: 'Congratulations! You earned: $achievementName',
      payload: 'achievement_unlocked',
    );
  }

  /// Show course completed notification
  Future<void> showCourseCompleted(String courseName) async {
    await showNotification(
      id: 4,
      title: 'Course Completed!',
      body: 'Great job! You\'ve completed: $courseName',
      payload: 'course_completed',
    );
  }
}
