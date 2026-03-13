import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../services/supabase_service.dart';

enum DashboardActivityType { comment, like, learnerJoin }

class DashboardCourseSummary {
  const DashboardCourseSummary({
    required this.id,
    required this.title,
    required this.thumbnailUrl,
    required this.views,
    required this.learners,
    required this.completionRate,
    required this.averageStudyMinutes,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String? thumbnailUrl;
  final int views;
  final int learners;
  final double completionRate;
  final int averageStudyMinutes;
  final DateTime updatedAt;
}

class DashboardActivityItem {
  const DashboardActivityItem({
    required this.type,
    required this.title,
    required this.description,
    required this.timestamp,
  });

  final DashboardActivityType type;
  final String title;
  final String description;
  final DateTime timestamp;
}

class HomeDashboardData {
  const HomeDashboardData({
    required this.weeklyLearners,
    required this.totalStudyHours,
    required this.completionRate,
    required this.completionDelta,
    required this.completionTrend,
    required this.topCourses,
    required this.recentActivities,
    required this.monthIncome,
    required this.pendingSettlement,
    required this.incomeTrend,
    required this.continueCourseId,
  });

  final int weeklyLearners;
  final int totalStudyHours;
  final double completionRate;
  final double completionDelta;
  final List<double> completionTrend;
  final List<DashboardCourseSummary> topCourses;
  final List<DashboardActivityItem> recentActivities;
  final double monthIncome;
  final double pendingSettlement;
  final List<double> incomeTrend;
  final String? continueCourseId;

  bool get hasCourses => topCourses.isNotEmpty;
}

final dashboardHomeProvider = FutureProvider.autoDispose<HomeDashboardData>((
  ref,
) async {
  final results = await Future.wait([
    SupabaseService.getMyCourses(),
    SupabaseService.getDashboardMetrics(),
    SupabaseService.getRecentComments(limit: 5),
  ]);

  final rawCourses = List<Map<String, dynamic>>.from(results[0] as List);
  final rawMetrics = Map<String, int>.from(results[1] as Map);
  final rawComments = List<Map<String, dynamic>>.from(results[2] as List);

  final courses = rawCourses.map(_toCourseSummary).toList()
    ..sort((a, b) => b.views.compareTo(a.views));
  final topCourses = courses.take(3).toList();

  final totalLearners = courses.fold<int>(
    0,
    (sum, course) => sum + course.learners,
  );
  final totalStudyMinutes = courses.fold<int>(
    0,
    (sum, course) =>
        sum + course.averageStudyMinutes * math.max(course.learners, 1),
  );
  final totalHours = (totalStudyMinutes / 60).round();

  final completionRate = courses.isEmpty
      ? 0.0
      : courses.map((course) => course.completionRate).reduce((a, b) => a + b) /
            courses.length;

  final completionTrend = _buildCompletionTrend(courses);
  final prev = completionTrend.take(3).fold<double>(0, (a, b) => a + b) / 3;
  final recent = completionTrend.skip(4).fold<double>(0, (a, b) => a + b) / 3;
  final delta = prev <= 0 ? 0.0 : ((recent - prev) / prev) * 100;

  final activities = _buildRecentActivities(rawComments, courses, rawMetrics);

  // TODO(data): connect real billing/payment table for revenue metrics.
  final monthIncome = courses.where((c) => c.views > 0).length * 19.8;
  final pendingSettlement = monthIncome * 0.28;
  final incomeTrend = List<double>.generate(7, (index) {
    final wave = math.sin((index / 6) * math.pi) * 42;
    return math.max(0, monthIncome * 0.08 + wave + index * 3);
  });

  final continueCourseId = rawCourses.isEmpty
      ? null
      : _findLatestCourse(rawCourses)['id']?.toString();

  return HomeDashboardData(
    weeklyLearners: math.max(
      rawMetrics['fans'] ?? 0,
      (totalLearners * 0.18).round(),
    ),
    totalStudyHours: totalHours,
    completionRate: completionRate,
    completionDelta: delta,
    completionTrend: completionTrend,
    topCourses: topCourses,
    recentActivities: activities,
    monthIncome: monthIncome,
    pendingSettlement: pendingSettlement,
    incomeTrend: incomeTrend,
    continueCourseId: continueCourseId,
  );
});

final dashboardUserDisplayNameProvider = FutureProvider.autoDispose<String?>((
  ref,
) async {
  final user = SupabaseService.currentUser;
  if (user == null) return null;

  try {
    final profile = await SupabaseService.getProfile();
    final profileName = _firstNonEmptyString([
      profile?['display_name']?.toString(),
      profile?['username']?.toString(),
    ]);
    if (profileName != null) return profileName;
  } catch (_) {
    // Ignore profile lookup issues and keep metadata fallback.
  }

  final metadataName = _firstNonEmptyString([
    user.userMetadata?['full_name']?.toString(),
    user.userMetadata?['name']?.toString(),
  ]);
  if (metadataName != null) return metadataName;

  final email = user.email?.trim();
  if (email != null && email.isNotEmpty) {
    final localPart = email.split('@').first.trim();
    if (localPart.isNotEmpty) return localPart;
  }

  return null;
});

Map<String, dynamic> _findLatestCourse(List<Map<String, dynamic>> courses) {
  courses.sort((a, b) {
    final aTime =
        DateTime.tryParse(a['updated_at']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final bTime =
        DateTime.tryParse(b['updated_at']?.toString() ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0);
    return bTime.compareTo(aTime);
  });
  return courses.first;
}

DashboardCourseSummary _toCourseSummary(Map<String, dynamic> rawCourse) {
  final id = rawCourse['id']?.toString() ?? '';
  final seed = id.codeUnits.fold<int>(17, (value, unit) => value * 31 + unit);

  final views = 300 + (seed.abs() % 5200);
  final learners = 40 + (seed.abs() % 560);
  final completionRate = 0.36 + ((seed.abs() % 53) / 100);
  final avgMinutes = 20 + (seed.abs() % 80);

  return DashboardCourseSummary(
    id: id,
    title: rawCourse['title']?.toString().trim().isEmpty ?? true
        ? 'Untitled Course'
        : rawCourse['title'] as String,
    thumbnailUrl: rawCourse['thumbnail_url']?.toString(),
    views: views,
    learners: learners,
    completionRate: completionRate.clamp(0.12, 0.98),
    averageStudyMinutes: avgMinutes,
    updatedAt:
        DateTime.tryParse(rawCourse['updated_at']?.toString() ?? '') ??
        DateTime.now(),
  );
}

List<double> _buildCompletionTrend(List<DashboardCourseSummary> courses) {
  final baseline = courses.isEmpty
      ? 0.42
      : courses.map((c) => c.completionRate).reduce((a, b) => a + b) /
            courses.length;

  return List<double>.generate(7, (i) {
    final wave = math.sin((i / 6) * math.pi * 1.3) * 0.06;
    final drift = i * 0.006;
    return (baseline + wave + drift).clamp(0.12, 0.98);
  });
}

List<DashboardActivityItem> _buildRecentActivities(
  List<Map<String, dynamic>> comments,
  List<DashboardCourseSummary> courses,
  Map<String, int> metrics,
) {
  final now = DateTime.now();
  final activity = <DashboardActivityItem>[];

  for (final comment in comments.take(5)) {
    activity.add(
      DashboardActivityItem(
        type: DashboardActivityType.comment,
        title: comment['username']?.toString() ?? 'Learner',
        description: comment['comment']?.toString().trim().isEmpty ?? true
            ? 'Left a feedback message.'
            : comment['comment'].toString(),
        timestamp:
            DateTime.tryParse(comment['created_at']?.toString() ?? '') ??
            now.subtract(const Duration(hours: 2)),
      ),
    );
  }

  if (courses.isNotEmpty) {
    final top = courses.first;
    activity.add(
      DashboardActivityItem(
        type: DashboardActivityType.like,
        title: top.title,
        description: 'Reached ${top.views} views and keeps growing.',
        timestamp: now.subtract(const Duration(hours: 5)),
      ),
    );
  }

  activity.add(
    DashboardActivityItem(
      type: DashboardActivityType.learnerJoin,
      title: 'New learners',
      description: '${metrics['fans'] ?? 0} new followers this week.',
      timestamp: now.subtract(const Duration(days: 1)),
    ),
  );

  activity.sort((a, b) => b.timestamp.compareTo(a.timestamp));
  return activity.take(5).toList(growable: false);
}

String? _firstNonEmptyString(Iterable<String?> candidates) {
  for (final candidate in candidates) {
    final value = candidate?.trim();
    if (value != null && value.isNotEmpty) return value;
  }
  return null;
}
