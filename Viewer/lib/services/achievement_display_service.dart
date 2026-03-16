import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';

/// UI metadata + progress calculation for achievement presentation.
///
/// Keeps display concerns (badge image, card copy, category filter, progress
/// derivation, and curated ordering) centralized so profile and achievement
/// wall stay consistent.
class AchievementDisplayService {
  AchievementDisplayService._();

  static const String _assetRoot = 'assets/achievements';

  static const List<_AchievementPresentation> _presentations = [
    _AchievementPresentation(
      slug: 'followers_10',
      name: 'Social Butterfly',
      assetPath: '$_assetRoot/social_butterfly.png',
      description:
          'Follow a specific number of fellow learners, mentors, or mutual friends to build your network.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.following,
      target: 10,
    ),
    _AchievementPresentation(
      slug: 'xp_100',
      name: 'XP Hunter',
      assetPath: '$_assetRoot/xp_hunter.png',
      description:
          'Reach a milestone of total Experience Points (XP) earned across all your active courses.',
      category: 'learning',
      progressMetric: _AchievementProgressMetric.totalXp,
      target: 100,
    ),
    _AchievementPresentation(
      slug: 'courses_5',
      name: 'Conqueror',
      assetPath: '$_assetRoot/conqueror.png',
      description:
          'Successfully complete and master a set number of full courses.',
      category: 'learning',
      progressMetric: _AchievementProgressMetric.coursesCompleted,
      target: 5,
    ),
    _AchievementPresentation(
      slug: 'streak_7',
      name: 'Hot Streak',
      assetPath: '$_assetRoot/hot_streak.png',
      description:
          'Keep the momentum going by completing lessons for a record number of consecutive days.',
      category: 'streak',
      progressMetric: _AchievementProgressMetric.streak,
      target: 7,
    ),
    _AchievementPresentation(
      slug: 'lessons_100',
      name: 'Deep Diver',
      assetPath: '$_assetRoot/deep_diver.png',
      description:
          'Spend over 5 hours in a single sitting on a complex module.',
      category: 'learning',
      progressMetric: _AchievementProgressMetric.lessonsCompleted,
      target: 100,
    ),
    _AchievementPresentation(
      slug: 'perfect_lesson',
      name: 'Perfect Score',
      assetPath: '$_assetRoot/perfect_score.png',
      description:
          'Complete a course quiz or final assessment with 100% accuracy.',
      category: 'challenge',
      progressMetric: _AchievementProgressMetric.binary,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'multi_subject',
      name: 'Polymath',
      assetPath: '$_assetRoot/polymath.png',
      description:
          'Complete courses in three or more entirely different subject areas (e.g., Coding, Psychology, and Art).',
      category: 'learning',
      progressMetric: _AchievementProgressMetric.coursesCompleted,
      target: 3,
    ),
    _AchievementPresentation(
      slug: 'speed_lesson',
      name: 'Night Owl',
      assetPath: '$_assetRoot/night_owl.png',
      description:
          'Complete a lesson or milestone between 12:00 AM and 4:00 AM.',
      category: 'challenge',
      progressMetric: _AchievementProgressMetric.binary,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'social_follow',
      name: 'Study Buddy',
      assetPath: '$_assetRoot/study_buddy.png',
      description:
          'Join or create a study group with at least 4 other learners.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.following,
      target: 5,
    ),
    _AchievementPresentation(
      slug: 'courses_50',
      name: 'The Mentor',
      assetPath: '$_assetRoot/the_mentor.png',
      description:
          'Have your answer or explanation on a forum marked as "Helpful" by another student.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.followers,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'first_follow',
      name: 'First Handshake',
      assetPath: '$_assetRoot/first_handshake.png',
      description:
          'Connect with your first mutual friend through a shared course.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.following,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'streak_30',
      name: 'Collaborator',
      assetPath: '$_assetRoot/collaborator.png',
      description: 'Complete a group project or a "Pair Programming" session.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.coursesCompleted,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'first_lesson',
      name: 'Back on the Saddle',
      assetPath: '$_assetRoot/back_on_the_saddle.png',
      description:
          'Return to a course after a break of more than 7 days and complete a lesson.',
      category: 'streak',
      progressMetric: _AchievementProgressMetric.lessonsCompleted,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'daily_tasks_30',
      name: 'Early Bird',
      assetPath: '$_assetRoot/early_bird.png',
      description:
          'Complete a learning task before 8:00 AM for 5 days in a row.',
      category: 'streak',
      progressMetric: _AchievementProgressMetric.streak,
      target: 5,
    ),
    _AchievementPresentation(
      slug: 'first_course',
      name: 'Feedback Loop',
      assetPath: '$_assetRoot/feedback_loop.png',
      description:
          'Leave a detailed review or constructive feedback for a course you\'ve finished.',
      category: 'social',
      progressMetric: _AchievementProgressMetric.coursesCompleted,
      target: 1,
    ),
    _AchievementPresentation(
      slug: 'xp_500',
      name: 'Overachiever',
      assetPath: '$_assetRoot/overachiever.png',
      description: 'Earn double the daily XP goal in a single 24-hour period.',
      category: 'challenge',
      progressMetric: _AchievementProgressMetric.totalXp,
      target: 500,
    ),
  ];

  static final Map<String, _AchievementPresentation> _presentationBySlug = {
    for (final presentation in _presentations) presentation.slug: presentation,
  };

  static List<AchievementModel> curatedAchievements(
    Iterable<AchievementModel> achievements,
  ) {
    final bySlug = {
      for (final achievement in achievements)
        if (_presentationBySlug.containsKey(achievement.slug))
          achievement.slug: achievement,
    };
    return [
      for (final presentation in _presentations)
        if (bySlug[presentation.slug] != null) bySlug[presentation.slug]!,
    ];
  }

  static bool isSupported(AchievementModel achievement) =>
      _presentationBySlug.containsKey(achievement.slug);

  static int sortIndex(AchievementModel achievement) {
    final index = _presentations.indexWhere((p) => p.slug == achievement.slug);
    return index == -1 ? 1 << 30 : index;
  }

  static String displayName(
    AchievementModel achievement, {
    AppLocalizations? t,
  }) {
    final presentation = _presentationBySlug[achievement.slug];
    if (presentation != null) return presentation.name;
    final raw = achievement.name.trim();
    if (raw.isNotEmpty) return raw;
    return t?.isZh == true ? '未命名成就' : 'Untitled Achievement';
  }

  static String displayDescription(
    AchievementModel achievement, {
    AppLocalizations? t,
  }) {
    final presentation = _presentationBySlug[achievement.slug];
    if (presentation != null) return presentation.description;
    final raw = achievement.description.trim();
    if (raw.isNotEmpty) return raw;
    return _fallbackRequirement(
      achievement.slug,
      t ?? const AppLocalizations('en'),
    );
  }

  static String displayCategory(AchievementModel achievement) {
    final presentation = _presentationBySlug[achievement.slug];
    return presentation?.category ?? achievement.category;
  }

  static bool usesCuratedBadge(AchievementModel achievement) =>
      _presentationBySlug.containsKey(achievement.slug);

  static String badgeAssetPath(AchievementModel achievement) {
    final presentation = _presentationBySlug[achievement.slug];
    if (presentation != null) return presentation.assetPath;
    switch (achievement.category) {
      case 'streak':
        return '$_assetRoot/category_streak.png';
      case 'challenge':
        return '$_assetRoot/category_challenge.png';
      case 'social':
        return '$_assetRoot/category_social.png';
      case 'learning':
        return '$_assetRoot/category_learning.png';
      default:
        return '$_assetRoot/default.png';
    }
  }

  static AchievementProgressView buildProgress({
    required AchievementModel achievement,
    required Map<String, dynamic> userStats,
    required Map<String, dynamic> followCounts,
    required AppLocalizations t,
  }) {
    final presentation = _presentationBySlug[achievement.slug];
    final streak = _safeInt(userStats['current_streak']);
    final lessonsCompleted = _safeInt(userStats['lessons_completed']);
    final coursesCompleted = _safeInt(userStats['courses_completed']);
    final totalXp = _safeInt(userStats['total_xp']);
    final following = _safeInt(followCounts['following']);
    final followers = _safeInt(followCounts['followers']);

    if (presentation != null) {
      final target = presentation.target <= 0 ? 1 : presentation.target;
      int current;
      switch (presentation.progressMetric) {
        case _AchievementProgressMetric.streak:
          current = streak;
          break;
        case _AchievementProgressMetric.lessonsCompleted:
          current = lessonsCompleted;
          break;
        case _AchievementProgressMetric.coursesCompleted:
          current = coursesCompleted;
          break;
        case _AchievementProgressMetric.totalXp:
          current = totalXp;
          break;
        case _AchievementProgressMetric.following:
          current = following;
          break;
        case _AchievementProgressMetric.followers:
          current = followers;
          break;
        case _AchievementProgressMetric.binary:
          current = achievement.isUnlocked ? target : 0;
          break;
      }

      if (achievement.isUnlocked && current < target) {
        current = target;
      }
      if (current < 0) current = 0;
      if (current > target) current = target;

      return AchievementProgressView(
        current: current,
        target: target,
        requirement: presentation.description,
      );
    }

    var target = 1;
    var current = achievement.isUnlocked ? 1 : 0;

    switch (achievement.slug) {
      case 'streak_3':
        target = 3;
        current = streak;
        break;
      case 'streak_7':
        target = 7;
        current = streak;
        break;
      case 'streak_30':
        target = 30;
        current = streak;
        break;
      case 'streak_100':
        target = 100;
        current = streak;
        break;
      case 'first_lesson':
        target = 1;
        current = lessonsCompleted;
        break;
      case 'first_course':
        target = 1;
        current = coursesCompleted;
        break;
      case 'courses_5':
        target = 5;
        current = coursesCompleted;
        break;
      case 'courses_50':
        target = 50;
        current = coursesCompleted;
        break;
      case 'lessons_100':
        target = 100;
        current = lessonsCompleted;
        break;
      case 'multi_subject':
        target = 3;
        current = coursesCompleted;
        break;
      case 'first_follow':
      case 'social_follow':
        target = 1;
        current = following;
        break;
      case 'followers_10':
        target = 10;
        current = followers;
        break;
      case 'xp_100':
        target = 100;
        current = totalXp;
        break;
      case 'xp_500':
        target = 500;
        current = totalXp;
        break;
      default:
        current = achievement.isUnlocked ? target : 0;
        break;
    }

    if (achievement.isUnlocked && current < target) {
      current = target;
    }
    if (current < 0) current = 0;
    if (current > target) current = target;

    return AchievementProgressView(
      current: current,
      target: target,
      requirement: displayDescription(achievement, t: t),
    );
  }

  static int _safeInt(dynamic value) => (value as num?)?.toInt() ?? 0;

  static String _fallbackRequirement(String slug, AppLocalizations t) {
    final zh = t.isZh;
    switch (slug) {
      case 'streak_3':
        return zh ? '连续学习 3 天' : 'Reach a 3-day learning streak';
      case 'streak_7':
        return zh ? '连续学习 7 天' : 'Reach a 7-day learning streak';
      case 'streak_30':
        return zh ? '连续学习 30 天' : 'Reach a 30-day learning streak';
      case 'streak_100':
        return zh ? '连续学习 100 天' : 'Reach a 100-day learning streak';
      case 'first_lesson':
        return zh ? '完成 1 节课程' : 'Complete 1 lesson';
      case 'first_course':
        return zh ? '完成 1 门课程' : 'Complete 1 course';
      case 'courses_5':
        return zh ? '完成 5 门课程' : 'Complete 5 courses';
      case 'lessons_100':
        return zh ? '累计完成 100 节课' : 'Complete 100 lessons';
      case 'courses_50':
        return zh ? '完成 50 门课程' : 'Complete 50 courses';
      case 'followers_10':
        return zh ? '获得 10 个粉丝' : 'Get 10 followers';
      case 'first_follow':
      case 'social_follow':
        return zh ? '关注 1 位用户' : 'Follow 1 user';
      case 'xp_100':
        return zh ? '累计获得 100 XP' : 'Earn 100 XP';
      case 'xp_500':
        return zh ? '累计获得 500 XP' : 'Earn 500 XP';
      default:
        return zh ? '完成此成就目标' : 'Complete this achievement objective';
    }
  }
}

class AchievementProgressView {
  final int current;
  final int target;
  final String requirement;

  const AchievementProgressView({
    required this.current,
    required this.target,
    required this.requirement,
  });

  double get ratio {
    if (target <= 0) return 0;
    final value = current / target;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  String get counterLabel => '$current/$target';
}

class _AchievementPresentation {
  final String slug;
  final String name;
  final String assetPath;
  final String description;
  final String category;
  final _AchievementProgressMetric progressMetric;
  final int target;

  const _AchievementPresentation({
    required this.slug,
    required this.name,
    required this.assetPath,
    required this.description,
    required this.category,
    required this.progressMetric,
    required this.target,
  });
}

enum _AchievementProgressMetric {
  streak,
  lessonsCompleted,
  coursesCompleted,
  totalXp,
  following,
  followers,
  binary,
}
