import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../services/supabase_service.dart';

// TODO(data): replace generated analytics values with real event-level facts.

enum AnalyticsRange { last7, last30, last90, all }

enum CourseSortMetric { views, completion, rating }

enum FansFilterMode { all, active, needHelp }

class AnalyticsPoint {
  const AnalyticsPoint({
    required this.day,
    required this.views,
    required this.learners,
  });

  final DateTime day;
  final double views;
  final double learners;
}

class CoursePerformanceMetric {
  const CoursePerformanceMetric({
    required this.courseId,
    required this.title,
    required this.views,
    required this.learners,
    required this.completion,
    required this.rating,
    required this.avgStudyMinutes,
    required this.updatedAt,
  });

  final String courseId;
  final String title;
  final int views;
  final int learners;
  final double completion;
  final double rating;
  final int avgStudyMinutes;
  final DateTime updatedAt;
}

class GeoDistribution {
  const GeoDistribution({required this.region, required this.percent});

  final String region;
  final double percent;
}

class AnalyticsDashboardData {
  const AnalyticsDashboardData({
    required this.totalLearners,
    required this.totalViews,
    required this.averageCompletion,
    required this.averageRating,
    required this.trends,
    required this.coursePerformance,
    required this.geoDistribution,
    required this.learningHeatmap,
  });

  final int totalLearners;
  final int totalViews;
  final double averageCompletion;
  final double averageRating;
  final List<AnalyticsPoint> trends;
  final List<CoursePerformanceMetric> coursePerformance;
  final List<GeoDistribution> geoDistribution;
  final List<List<double>> learningHeatmap;
}

class FanRecord {
  const FanRecord({
    required this.id,
    required this.username,
    required this.avatarUrl,
    required this.joinedAt,
    required this.coursesLearned,
    required this.totalStudyMinutes,
    required this.lastActiveAt,
    required this.activityScore,
    required this.tags,
  });

  final String id;
  final String username;
  final String? avatarUrl;
  final DateTime joinedAt;
  final int coursesLearned;
  final int totalStudyMinutes;
  final DateTime lastActiveAt;
  final double activityScore;
  final List<String> tags;

  bool get isActive => activityScore >= 0.66;
  bool get needsHelp => activityScore <= 0.34;
}

class EngagementRecord {
  const EngagementRecord({
    required this.author,
    required this.message,
    required this.createdAt,
  });

  final String author;
  final String message;
  final DateTime createdAt;
}

class FansDashboardData {
  const FansDashboardData({
    required this.totalFans,
    required this.newFansThisWeek,
    required this.growthTrend,
    required this.fans,
    required this.engagement,
    required this.unreadMessages,
  });

  final int totalFans;
  final int newFansThisWeek;
  final List<double> growthTrend;
  final List<FanRecord> fans;
  final List<EngagementRecord> engagement;
  final int unreadMessages;
}

final analyticsRangeProvider = StateProvider<AnalyticsRange>(
  (_) => AnalyticsRange.last30,
);

final courseSortMetricProvider = StateProvider<CourseSortMetric>(
  (_) => CourseSortMetric.views,
);

final fansFilterModeProvider = StateProvider<FansFilterMode>(
  (_) => FansFilterMode.all,
);

final fansSearchQueryProvider = StateProvider<String>((_) => '');

final fansPageIndexProvider = StateProvider<int>((_) => 0);

final fansTagsProvider = StateProvider<List<String>>(
  (_) => const ['活跃学员', '需要帮助', 'VIP'],
);

final analyticsDashboardProvider =
    FutureProvider.autoDispose<AnalyticsDashboardData>((ref) async {
      final results = await Future.wait([
        SupabaseService.getMyCourses(),
        SupabaseService.getDashboardMetrics(),
      ]);

      final courses = List<Map<String, dynamic>>.from(results[0] as List);
      final metrics = Map<String, int>.from(results[1] as Map);

      final performance = courses.map(_toPerformanceMetric).toList();
      final totalViews = performance.fold<int>(
        0,
        (sum, row) => sum + row.views,
      );
      final totalLearners = performance.fold<int>(
        0,
        (sum, row) => sum + row.learners,
      );
      final averageCompletion = performance.isEmpty
          ? 0.0
          : performance.map((row) => row.completion).reduce((a, b) => a + b) /
                performance.length;
      final averageRating = performance.isEmpty
          ? 0.0
          : performance.map((row) => row.rating).reduce((a, b) => a + b) /
                performance.length;

      final baseViews = math.max(
        totalViews,
        (metrics['likes'] ?? 0) * 24 + 100,
      );
      final trends = _buildTrends(baseViews, totalLearners);

      return AnalyticsDashboardData(
        totalLearners: math.max(metrics['fans'] ?? 0, totalLearners),
        totalViews: baseViews,
        averageCompletion: averageCompletion,
        averageRating: averageRating,
        trends: trends,
        coursePerformance: performance,
        geoDistribution: _buildGeoDistribution(performance.length),
        learningHeatmap: _buildLearningHeatmap(),
      );
    });

final fansDashboardProvider = FutureProvider.autoDispose<FansDashboardData>((
  ref,
) async {
  final followers = await _loadFollowers();
  final comments = await SupabaseService.getRecentComments(limit: 8);

  final fans = followers.isNotEmpty
      ? followers
      : _buildFallbackFansFromComments(comments);

  final thisWeek = fans
      .where(
        (fan) =>
            DateTime.now().difference(fan.joinedAt) <= const Duration(days: 7),
      )
      .length;

  final trend = _buildFansGrowthTrend(fans);
  final engagement = comments
      .map(
        (comment) => EngagementRecord(
          author: comment['username']?.toString() ?? 'Learner',
          message: comment['comment']?.toString().trim().isEmpty ?? true
              ? 'Left a short feedback.'
              : comment['comment'].toString(),
          createdAt:
              DateTime.tryParse(comment['created_at']?.toString() ?? '') ??
              DateTime.now(),
        ),
      )
      .toList();

  return FansDashboardData(
    totalFans: fans.length,
    newFansThisWeek: thisWeek,
    growthTrend: trend,
    fans: fans,
    engagement: engagement,
    unreadMessages: math.max(0, (fans.length / 6).round()),
  );
});

CoursePerformanceMetric _toPerformanceMetric(Map<String, dynamic> rawCourse) {
  final id = rawCourse['id']?.toString() ?? '';
  final title = rawCourse['title']?.toString().trim().isEmpty ?? true
      ? 'Untitled Course'
      : rawCourse['title'].toString();
  final updatedAt =
      DateTime.tryParse(rawCourse['updated_at']?.toString() ?? '') ??
      DateTime.now();

  final seed = id.codeUnits.fold<int>(13, (value, unit) => value * 37 + unit);

  final views = 200 + (seed.abs() % 6200);
  final learners = 24 + (seed.abs() % 540);
  final completion = (0.34 + (seed.abs() % 58) / 100).clamp(0.08, 0.98);
  final rating = (3.6 + (seed.abs() % 14) / 10).clamp(0.0, 5.0);
  final avgStudyMinutes = 18 + (seed.abs() % 85);

  return CoursePerformanceMetric(
    courseId: id,
    title: title,
    views: views,
    learners: learners,
    completion: completion,
    rating: rating,
    avgStudyMinutes: avgStudyMinutes,
    updatedAt: updatedAt,
  );
}

List<AnalyticsPoint> _buildTrends(int totalViews, int totalLearners) {
  final now = DateTime.now();
  final baseViews = math.max(80, totalViews ~/ 50);
  final baseLearners = math.max(8, totalLearners ~/ 40);

  return List<AnalyticsPoint>.generate(90, (index) {
    final ratio = index / 89;
    final wave = math.sin(ratio * math.pi * 4.2);
    final views = (baseViews + wave * 28 + index * 0.9)
        .clamp(12, 99999)
        .toDouble();
    final learners = (baseLearners + wave * 6 + index * 0.18)
        .clamp(1, 99999)
        .toDouble();
    return AnalyticsPoint(
      day: now.subtract(Duration(days: 89 - index)),
      views: views,
      learners: learners,
    );
  });
}

List<GeoDistribution> _buildGeoDistribution(int courseCount) {
  final offset = math.max(0, courseCount - 1) * 0.01;
  final raw = <GeoDistribution>[
    GeoDistribution(region: 'China', percent: 0.36 + offset),
    GeoDistribution(region: 'United States', percent: 0.24),
    GeoDistribution(region: 'Japan', percent: 0.14),
    GeoDistribution(region: 'Singapore', percent: 0.12),
    GeoDistribution(region: 'Germany', percent: 0.09),
  ];

  final total = raw.fold<double>(0, (sum, item) => sum + item.percent);
  return raw
      .map(
        (item) =>
            GeoDistribution(region: item.region, percent: item.percent / total),
      )
      .toList();
}

List<List<double>> _buildLearningHeatmap() {
  final heat = List<List<double>>.generate(7, (_) => List<double>.filled(8, 0));

  for (var day = 0; day < 7; day++) {
    for (var slot = 0; slot < 8; slot++) {
      final primeTimeBoost = slot >= 4 && slot <= 6 ? 0.25 : 0.0;
      final weekdayBoost = day >= 1 && day <= 5 ? 0.18 : 0.0;
      final wave = math.sin((slot / 7) * math.pi) * 0.35;
      heat[day][slot] = (0.08 + primeTimeBoost + weekdayBoost + wave).clamp(
        0.05,
        1.0,
      );
    }
  }

  return heat;
}

Future<List<FanRecord>> _loadFollowers() async {
  if (!SupabaseService.isLoggedIn || SupabaseService.currentUser == null) {
    return const [];
  }

  try {
    final rawFollowers = await SupabaseService.client
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', SupabaseService.currentUser!.id)
        .order('created_at', ascending: false)
        .limit(400);

    final followRows = List<Map<String, dynamic>>.from(rawFollowers as List);
    if (followRows.isEmpty) return const [];

    final followerIds = followRows
        .map((row) => row['follower_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    final rawProfiles = await SupabaseService.client
        .from('profiles')
        .select('id, username, display_name, avatar_url, created_at')
        .inFilter('id', followerIds);

    final profileMap = {
      for (final profile in List<Map<String, dynamic>>.from(
        rawProfiles as List,
      ))
        profile['id']?.toString() ?? '': profile,
    };

    return followRows.map((row) {
      final id = row['follower_id']?.toString() ?? '';
      final profile = profileMap[id] ?? const <String, dynamic>{};
      final seed = id.codeUnits.fold<int>(11, (v, code) => v * 29 + code);

      final joinedAt =
          DateTime.tryParse(row['created_at']?.toString() ?? '') ??
          DateTime.tryParse(profile['created_at']?.toString() ?? '') ??
          DateTime.now().subtract(Duration(days: seed.abs() % 30));

      final lastActive = DateTime.now().subtract(
        Duration(hours: seed.abs() % 96),
      );

      final score = (0.12 + (seed.abs() % 85) / 100).clamp(0.05, 0.99);

      final tags = <String>[
        if (score > 0.72) '活跃学员',
        if (score < 0.32) '需要帮助',
        if ((seed.abs() % 7) == 0) 'VIP',
      ];

      return FanRecord(
        id: id,
        username: profile['username']?.toString().trim().isNotEmpty == true
            ? profile['username'].toString()
            : (profile['display_name']?.toString().trim().isNotEmpty == true
                  ? profile['display_name'].toString()
                  : 'Learner ${id.isNotEmpty ? id.substring(0, math.min(6, id.length)) : ''}'),
        avatarUrl: profile['avatar_url']?.toString(),
        joinedAt: joinedAt,
        coursesLearned: 1 + (seed.abs() % 9),
        totalStudyMinutes: 45 + (seed.abs() % 2200),
        lastActiveAt: lastActive,
        activityScore: score,
        tags: tags,
      );
    }).toList();
  } catch (_) {
    return const [];
  }
}

List<FanRecord> _buildFallbackFansFromComments(
  List<Map<String, dynamic>> comments,
) {
  if (comments.isEmpty) return const [];

  return comments.asMap().entries.map((entry) {
    final index = entry.key;
    final comment = entry.value;
    final name = comment['username']?.toString() ?? 'Learner';
    final seed = name.codeUnits.fold<int>(19, (v, c) => v * 17 + c);

    return FanRecord(
      id: 'mock-$index-$seed',
      username: name,
      avatarUrl: comment['avatar_url']?.toString(),
      joinedAt: DateTime.now().subtract(Duration(days: (seed.abs() % 30) + 1)),
      coursesLearned: 1 + (seed.abs() % 4),
      totalStudyMinutes: 90 + (seed.abs() % 1200),
      lastActiveAt: DateTime.now().subtract(Duration(hours: seed.abs() % 48)),
      activityScore: (0.2 + (seed.abs() % 70) / 100).clamp(0.05, 0.95),
      tags: <String>[
        if ((seed.abs() % 3) == 0) '活跃学员',
        if ((seed.abs() % 5) == 0) '需要帮助',
      ],
    );
  }).toList();
}

List<double> _buildFansGrowthTrend(List<FanRecord> fans) {
  final now = DateTime.now();
  final points = List<double>.filled(7, 0);

  for (var i = 0; i < 7; i++) {
    final dayStart = DateTime(
      now.year,
      now.month,
      now.day,
    ).subtract(Duration(days: 6 - i));
    final dayEnd = dayStart.add(const Duration(days: 1));

    final joined = fans.where((fan) {
      return fan.joinedAt.isAfter(dayStart) && fan.joinedAt.isBefore(dayEnd);
    }).length;

    final fallback = 1 + (i % 3);
    points[i] = math.max(joined.toDouble(), fallback.toDouble());
  }

  return points;
}
