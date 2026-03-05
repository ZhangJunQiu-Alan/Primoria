/// Achievement definition + optional earned state.
class AchievementModel {
  final String id;
  final String slug;
  final String name;
  final String description;
  final String category; // streak | learning | challenge | social
  final String rarity;   // common | rare | epic | legendary
  final DateTime? earnedAt; // null = not yet unlocked

  const AchievementModel({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.category,
    required this.rarity,
    this.earnedAt,
  });

  bool get isUnlocked => earnedAt != null;

  factory AchievementModel.fromMap(Map<String, dynamic> map) {
    return AchievementModel(
      id: map['id']?.toString() ?? '',
      slug: map['slug']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString() ?? '',
      category: map['category']?.toString() ?? 'learning',
      rarity: map['rarity']?.toString() ?? 'common',
      earnedAt: map['earned_at'] != null
          ? DateTime.tryParse(map['earned_at'].toString())
          : null,
    );
  }
}

/// Result data passed from LessonScreen → LessonResultScreen.
class LessonResult {
  final String lessonId;
  final String lessonTitle;
  final int xpEarned;
  final int accuracyPct;       // 0-100
  final int timeSpentSeconds;
  final int currentStreak;
  final bool isFirstToday;     // whether today's star was just lit
  final List<TaskUpdate> taskUpdates;
  final List<AchievementModel> newAchievements;

  const LessonResult({
    required this.lessonId,
    required this.lessonTitle,
    required this.xpEarned,
    required this.accuracyPct,
    required this.timeSpentSeconds,
    required this.currentStreak,
    required this.isFirstToday,
    required this.taskUpdates,
    required this.newAchievements,
  });
}

class TaskUpdate {
  final String label;
  final bool completed;
  final int current;
  final int target;

  const TaskUpdate({
    required this.label,
    required this.completed,
    required this.current,
    required this.target,
  });
}
