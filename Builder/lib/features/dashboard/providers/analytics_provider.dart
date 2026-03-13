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

class BuilderCourseVolumePoint {
  const BuilderCourseVolumePoint({
    required this.month,
    required this.createdCourses,
    required this.publishedCourses,
  });

  final DateTime month;
  final int createdCourses;
  final int publishedCourses;
}

class BuilderCourseTypePoint {
  const BuilderCourseTypePoint({required this.type, required this.count});

  final String type;
  final int count;
}

class BuilderIncomePoint {
  const BuilderIncomePoint({required this.month, required this.amount});

  final DateTime month;
  final double amount;
}

class BuilderProgressPoint {
  const BuilderProgressPoint({
    required this.month,
    required this.completionRate,
    required this.engagementRate,
  });

  final DateTime month;
  final double completionRate;
  final double engagementRate;
}

class PublishedCourseAudiencePoint {
  const PublishedCourseAudiencePoint({
    required this.courseId,
    required this.title,
    required this.viewers,
    required this.feedbackCount,
    required this.completionRate,
    required this.estimatedIncome,
    required this.updatedAt,
  });

  final String courseId;
  final String title;
  final int viewers;
  final int feedbackCount;
  final double completionRate;
  final double estimatedIncome;
  final DateTime updatedAt;
}

class BuilderDataCenterData {
  const BuilderDataCenterData({
    required this.totalCourses,
    required this.publishedCourses,
    required this.draftCourses,
    required this.archivedCourses,
    required this.estimatedPublishedViewers,
    required this.averageCompletionRate,
    required this.estimatedMonthlyIncome,
    required this.courseVolume,
    required this.courseTypes,
    required this.incomeOverview,
    required this.learningProgression,
    required this.publishedAudience,
  });

  final int totalCourses;
  final int publishedCourses;
  final int draftCourses;
  final int archivedCourses;
  final int estimatedPublishedViewers;
  final double averageCompletionRate;
  final double estimatedMonthlyIncome;
  final List<BuilderCourseVolumePoint> courseVolume;
  final List<BuilderCourseTypePoint> courseTypes;
  final List<BuilderIncomePoint> incomeOverview;
  final List<BuilderProgressPoint> learningProgression;
  final List<PublishedCourseAudiencePoint> publishedAudience;
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

final builderDataCenterProvider =
    FutureProvider.autoDispose<BuilderDataCenterData>((ref) async {
      final results = await Future.wait([
        SupabaseService.getMyCourses(),
        SupabaseService.getDashboardMetrics(),
      ]);

      final courses = List<Map<String, dynamic>>.from(results[0] as List);
      final metrics = Map<String, int>.from(results[1] as Map);
      final performance = courses.map(_toPerformanceMetric).toList();

      final subjectNames = await _loadSubjectNameMap(courses);
      final feedbackByCourse = await _loadFeedbackByCourse(courses);

      final totalCourses = courses.length;
      final publishedCourses = courses
          .where((c) => _courseStatus(c) == 'published')
          .length;
      final draftCourses = courses
          .where((c) => _courseStatus(c) == 'draft')
          .length;
      final archivedCourses = courses
          .where((c) => _courseStatus(c) == 'archived')
          .length;

      final courseVolume = _buildCourseVolume(courses, months: 6);
      final courseTypes = _buildCourseTypes(courses, subjectNames);
      final publishedAudience = _buildPublishedAudience(
        courses: courses,
        performance: performance,
        feedbackByCourse: feedbackByCourse,
        fanCount: metrics['fans'] ?? 0,
      );
      final incomeOverview = _buildIncomeOverview(
        courseVolume: courseVolume,
        publishedAudience: publishedAudience,
        fallbackIncome: (metrics['income'] ?? 0).toDouble(),
      );
      final learningProgression = _buildLearningProgression(
        courseVolume: courseVolume,
        performance: performance,
        publishedAudience: publishedAudience,
      );

      final averageCompletionRate = performance.isEmpty
          ? 0.0
          : performance.map((row) => row.completion).reduce((a, b) => a + b) /
                performance.length;
      final estimatedPublishedViewers = publishedAudience.fold<int>(
        0,
        (sum, row) => sum + row.viewers,
      );
      final estimatedMonthlyIncome = incomeOverview.isEmpty
          ? 0.0
          : incomeOverview.last.amount;

      return BuilderDataCenterData(
        totalCourses: totalCourses,
        publishedCourses: publishedCourses,
        draftCourses: draftCourses,
        archivedCourses: archivedCourses,
        estimatedPublishedViewers: estimatedPublishedViewers,
        averageCompletionRate: averageCompletionRate,
        estimatedMonthlyIncome: estimatedMonthlyIncome,
        courseVolume: courseVolume,
        courseTypes: courseTypes,
        incomeOverview: incomeOverview,
        learningProgression: learningProgression,
        publishedAudience: publishedAudience,
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

Future<Map<String, String>> _loadSubjectNameMap(
  List<Map<String, dynamic>> courses,
) async {
  final subjectIds = courses
      .map((course) => course['subject_id']?.toString().trim() ?? '')
      .where((id) => id.isNotEmpty)
      .toSet()
      .toList();
  if (subjectIds.isEmpty) return const {};

  try {
    final rows = await SupabaseService.client
        .from('subjects')
        .select('id, name')
        .inFilter('id', subjectIds);

    final map = <String, String>{};
    for (final row in List<Map<String, dynamic>>.from(rows as List)) {
      final id = row['id']?.toString().trim() ?? '';
      final name = row['name']?.toString().trim() ?? '';
      if (id.isNotEmpty && name.isNotEmpty) {
        map[id] = name;
      }
    }
    return map;
  } catch (_) {
    return const {};
  }
}

Future<Map<String, List<Map<String, dynamic>>>> _loadFeedbackByCourse(
  List<Map<String, dynamic>> courses,
) async {
  final courseIds = courses
      .map((course) => course['id']?.toString().trim() ?? '')
      .where((id) => id.isNotEmpty)
      .toList();
  if (courseIds.isEmpty) return const {};

  try {
    final rows = await SupabaseService.client
        .from('course_feedback')
        .select('course_id, rating, created_at')
        .inFilter('course_id', courseIds);

    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final row in List<Map<String, dynamic>>.from(rows as List)) {
      final courseId = row['course_id']?.toString().trim() ?? '';
      if (courseId.isEmpty) continue;
      grouped.putIfAbsent(courseId, () => <Map<String, dynamic>>[]).add(row);
    }
    return grouped;
  } catch (_) {
    return const {};
  }
}

List<BuilderCourseVolumePoint> _buildCourseVolume(
  List<Map<String, dynamic>> courses, {
  int months = 6,
}) {
  final buckets = List<DateTime>.generate(months, (index) {
    final now = DateTime.now();
    return DateTime(now.year, now.month - (months - index - 1), 1);
  }, growable: false);

  return buckets
      .map((bucket) {
        var created = 0;
        var published = 0;

        for (final course in courses) {
          final createdAt = _parseDate(course['created_at']);
          if (createdAt != null && _sameMonth(createdAt, bucket)) {
            created += 1;
          }

          if (_courseStatus(course) != 'published') continue;
          final publishedAt = _parseDate(course['published_at']);
          if (publishedAt != null) {
            if (_sameMonth(publishedAt, bucket)) {
              published += 1;
            }
          } else if (createdAt != null && _sameMonth(createdAt, bucket)) {
            // Fallback for legacy rows without published_at.
            published += 1;
          }
        }

        return BuilderCourseVolumePoint(
          month: bucket,
          createdCourses: created,
          publishedCourses: published,
        );
      })
      .toList(growable: false);
}

List<BuilderCourseTypePoint> _buildCourseTypes(
  List<Map<String, dynamic>> courses,
  Map<String, String> subjectNames,
) {
  final counts = <String, int>{};
  for (final course in courses) {
    final type = _resolveCourseType(course, subjectNames);
    counts[type] = (counts[type] ?? 0) + 1;
  }

  final sorted = counts.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));

  return sorted
      .take(6)
      .map(
        (entry) => BuilderCourseTypePoint(type: entry.key, count: entry.value),
      )
      .toList(growable: false);
}

List<PublishedCourseAudiencePoint> _buildPublishedAudience({
  required List<Map<String, dynamic>> courses,
  required List<CoursePerformanceMetric> performance,
  required Map<String, List<Map<String, dynamic>>> feedbackByCourse,
  required int fanCount,
}) {
  final perfById = <String, CoursePerformanceMetric>{
    for (final row in performance) row.courseId: row,
  };
  final rows = <PublishedCourseAudiencePoint>[];

  for (final course in courses) {
    if (_courseStatus(course) != 'published') continue;
    final courseId = course['id']?.toString().trim() ?? '';
    if (courseId.isEmpty) continue;

    final perf = perfById[courseId] ?? _toPerformanceMetric(course);
    final feedbackRows = feedbackByCourse[courseId] ?? const [];
    final feedbackCount = feedbackRows.length;
    final avgRating = feedbackCount == 0
        ? perf.rating
        : feedbackRows
                  .map((row) => (row['rating'] as num?)?.toDouble() ?? 0.0)
                  .reduce((a, b) => a + b) /
              feedbackCount;

    final seed = courseId.codeUnits.fold<int>(23, (v, c) => v * 31 + c).abs();
    final viewers = math.max(
      feedbackCount * 42 + fanCount * 2,
      (perf.views * 0.72 + (seed % 220)).round(),
    );
    final price = (course['price'] as num?)?.toDouble() ?? 0.0;
    final conversion = price <= 0
        ? 0.0
        : (0.018 + perf.completion * 0.045 + (avgRating / 5) * 0.03).clamp(
            0.015,
            0.14,
          );
    final estimatedIncome = price <= 0 ? 0.0 : viewers * conversion * price;

    rows.add(
      PublishedCourseAudiencePoint(
        courseId: courseId,
        title: perf.title,
        viewers: viewers,
        feedbackCount: feedbackCount,
        completionRate: perf.completion,
        estimatedIncome: estimatedIncome,
        updatedAt: perf.updatedAt,
      ),
    );
  }

  rows.sort((a, b) => b.viewers.compareTo(a.viewers));
  return rows;
}

List<BuilderIncomePoint> _buildIncomeOverview({
  required List<BuilderCourseVolumePoint> courseVolume,
  required List<PublishedCourseAudiencePoint> publishedAudience,
  required double fallbackIncome,
}) {
  if (courseVolume.isEmpty) return const [];

  final totalProjectedIncome = publishedAudience.fold<double>(
    0.0,
    (sum, row) => sum + row.estimatedIncome,
  );
  final baseIncome = totalProjectedIncome > 0
      ? totalProjectedIncome / courseVolume.length
      : fallbackIncome;

  return courseVolume
      .asMap()
      .entries
      .map((entry) {
        final index = entry.key;
        final point = entry.value;
        final momentum = 0.82 + index * 0.09;
        final seasonal =
            1 +
            math.sin((index / math.max(1, courseVolume.length - 1)) * math.pi) *
                0.08;
        final publishingBoost =
            point.publishedCourses * 48 + point.createdCourses * 18;
        final amount = (baseIncome * momentum * seasonal) + publishingBoost;
        return BuilderIncomePoint(month: point.month, amount: amount);
      })
      .toList(growable: false);
}

List<BuilderProgressPoint> _buildLearningProgression({
  required List<BuilderCourseVolumePoint> courseVolume,
  required List<CoursePerformanceMetric> performance,
  required List<PublishedCourseAudiencePoint> publishedAudience,
}) {
  if (courseVolume.isEmpty) return const [];

  final baselineCompletion = performance.isEmpty
      ? 42.0
      : performance.map((row) => row.completion * 100).reduce((a, b) => a + b) /
            performance.length;
  final audienceTop3 = publishedAudience
      .take(3)
      .fold<int>(0, (sum, row) => sum + row.viewers);
  final engagementBoost = math.min(18.0, audienceTop3 / 350.0);

  return courseVolume
      .asMap()
      .entries
      .map((entry) {
        final index = entry.key;
        final point = entry.value;
        final activity = point.createdCourses + point.publishedCourses;
        final completionRate =
            (baselineCompletion -
                    7 +
                    index * 2.3 +
                    activity * 0.9 +
                    math.sin(index * 0.7) * 2.4)
                .clamp(12, 99)
                .toDouble();
        final engagementRate =
            (48 +
                    engagementBoost +
                    index * 2.0 +
                    activity * 1.2 +
                    math.cos(index * 0.8) * 2.0)
                .clamp(10, 99)
                .toDouble();

        return BuilderProgressPoint(
          month: point.month,
          completionRate: completionRate,
          engagementRate: engagementRate,
        );
      })
      .toList(growable: false);
}

String _resolveCourseType(
  Map<String, dynamic> course,
  Map<String, String> subjectNames,
) {
  final subjectId = course['subject_id']?.toString().trim() ?? '';
  if (subjectId.isNotEmpty) {
    final subjectName = subjectNames[subjectId]?.trim();
    if (subjectName != null && subjectName.isNotEmpty) return subjectName;
  }

  final tags = course['tags'];
  if (tags is List && tags.isNotEmpty) {
    final firstTag = tags.first.toString().trim();
    if (firstTag.isNotEmpty) return _titleCase(firstTag.replaceAll('_', ' '));
  }

  switch ((course['difficulty_level']?.toString() ?? 'beginner')
      .trim()
      .toLowerCase()) {
    case 'advanced':
      return 'Advanced';
    case 'intermediate':
      return 'Intermediate';
    case 'beginner':
    default:
      return 'Beginner';
  }
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

bool _sameMonth(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month;
}

String _courseStatus(Map<String, dynamic> course) {
  return (course['status']?.toString() ?? 'draft').trim().toLowerCase();
}

String _titleCase(String value) {
  final words = value
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .toList();
  if (words.isEmpty) return value;
  return words
      .map(
        (word) => '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}
