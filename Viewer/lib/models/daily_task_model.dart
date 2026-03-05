class DailyTask {
  final String id;
  final String taskType; // lesson_complete | answer_questions | study_minutes | streak_day | explore_subject
  final String displayLabel;
  final int targetValue;
  final int currentValue;
  final int rewardXp;
  final bool isCompleted;

  const DailyTask({
    required this.id,
    required this.taskType,
    required this.displayLabel,
    required this.targetValue,
    required this.currentValue,
    required this.rewardXp,
    required this.isCompleted,
  });

  double get progress =>
      targetValue > 0 ? (currentValue / targetValue).clamp(0.0, 1.0) : 0.0;

  factory DailyTask.fromMap(Map<String, dynamic> map) {
    return DailyTask(
      id: map['id']?.toString() ?? '',
      taskType: map['task_type']?.toString() ?? '',
      displayLabel: map['display_label']?.toString() ?? '',
      targetValue: (map['target_value'] as num?)?.toInt() ?? 1,
      currentValue: (map['current_value'] as num?)?.toInt() ?? 0,
      rewardXp: (map['reward_xp'] as num?)?.toInt() ?? 20,
      isCompleted: map['is_completed'] == true,
    );
  }

  DailyTask copyWith({int? currentValue, bool? isCompleted}) {
    return DailyTask(
      id: id,
      taskType: taskType,
      displayLabel: displayLabel,
      targetValue: targetValue,
      currentValue: currentValue ?? this.currentValue,
      rewardXp: rewardXp,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}
