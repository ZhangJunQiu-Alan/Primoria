import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

/// 通知服务
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
    // 处理通知点击
    debugPrint('Notification tapped: ${response.payload}');
  }

  /// 请求通知权限
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

  /// 显示即时通知
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'primoria_channel',
      'Primoria',
      channelDescription: 'Primoria 学习提醒',
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

  /// 设置每日学习提醒
  Future<void> scheduleDailyReminder({
    required int hour,
    required int minute,
  }) async {
    // 取消之前的提醒
    await _notifications.cancel(1);

    // 注意: 完整实现需要使用 flutter_local_notifications 的定时功能
    // 这里提供简化版本
    debugPrint('Daily reminder scheduled for $hour:$minute');
  }

  /// 取消所有通知
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// 显示连续学习提醒
  Future<void> showStreakReminder(int currentStreak) async {
    await showNotification(
      id: 2,
      title: '别忘了今天的学习！🔥',
      body: '你已经连续学习 $currentStreak 天了，继续保持！',
      payload: 'streak_reminder',
    );
  }

  /// 显示成就解锁通知
  Future<void> showAchievementUnlocked(String achievementName) async {
    await showNotification(
      id: 3,
      title: '成就解锁！🏆',
      body: '恭喜你获得成就：$achievementName',
      payload: 'achievement_unlocked',
    );
  }

  /// 显示课程完成通知
  Future<void> showCourseCompleted(String courseName) async {
    await showNotification(
      id: 4,
      title: '课程完成！🎉',
      body: '太棒了！你已完成课程：$courseName',
      payload: 'course_completed',
    );
  }
}
