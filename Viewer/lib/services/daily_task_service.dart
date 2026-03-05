import 'package:flutter/foundation.dart';
import '../models/daily_task_model.dart';
import 'supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Generates and manages daily quests for the current user.
class DailyTaskService {
  DailyTaskService._();

  static const int _totalRewardXp = 100;

  // ── Task templates ───────────────────────────────────────────

  /// Returns the 5 task definitions for today.
  /// Shuffles the pool so tasks feel fresh each day but are deterministic
  /// within the same day (seeded by day-of-year).
  static List<Map<String, dynamic>> _buildTodayTemplates({
    required String userId,
    required String dateStr,
  }) {
    // Pool A – always included (1 lesson task)
    const poolA = [
      {'task_type': 'lesson_complete', 'display_label': '完成 1 节课程', 'target_value': 1, 'reward_xp': 20},
    ];

    // Pool B – 2 answer tasks (pick 2)
    const poolB = [
      {'task_type': 'answer_questions', 'display_label': '答对 5 道题', 'target_value': 5, 'reward_xp': 20},
      {'task_type': 'answer_questions_hard', 'display_label': '答对 10 道题', 'target_value': 10, 'reward_xp': 25},
    ];

    // Pool C – 1 habit task
    final dayOfYear = _dayOfYear(DateTime.now());
    const poolC = [
      {'task_type': 'study_minutes', 'display_label': '学习满 15 分钟', 'target_value': 15, 'reward_xp': 20},
      {'task_type': 'study_minutes', 'display_label': '学习满 20 分钟', 'target_value': 20, 'reward_xp': 25},
    ];
    final habitTask = poolC[dayOfYear % poolC.length];

    // Pool D – 1 explore task
    const poolD = [
      {'task_type': 'explore_subject', 'display_label': '尝试一门新主题课程', 'target_value': 1, 'reward_xp': 15},
      {'task_type': 'streak_day', 'display_label': '今天坚持学习', 'target_value': 1, 'reward_xp': 15},
    ];
    final exploreTask = poolD[dayOfYear % poolD.length];

    final today = DateTime.now().toLocal();
    final tasks = <Map<String, dynamic>>[];
    void add(Map<String, dynamic> t) {
      tasks.add({
        'user_id': userId,
        'task_date': dateStr,
        'task_type': t['task_type'],
        'display_label': t['display_label'],
        'target_value': t['target_value'],
        'current_value': 0,
        'reward_xp': t['reward_xp'],
        'is_completed': false,
      });
    }

    add(poolA.first);
    add(poolB[dayOfYear % poolB.length]);
    add(habitTask);
    add(exploreTask);
    // 5th: streak_day or second answer task (alternating)
    if (today.weekday % 2 == 0) {
      add({'task_type': 'streak_day', 'display_label': '今天坚持学习', 'target_value': 1, 'reward_xp': 15});
    } else {
      add(poolB[(dayOfYear + 1) % poolB.length]);
    }

    return tasks;
  }

  static int _dayOfYear(DateTime dt) {
    return dt.difference(DateTime(dt.year)).inDays;
  }

  // ── Public API ───────────────────────────────────────────────

  /// Load today's tasks. Creates them if they don't exist yet.
  static Future<List<DailyTask>> loadOrCreateTodayTasks() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return [];
    try {
      final existing = await SupabaseService.getTodayTasks();
      if (existing.isNotEmpty) {
        return existing.map(DailyTask.fromMap).toList();
      }

      // Generate and insert
      final today = DateTime.now().toLocal();
      final dateStr =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      final templates = _buildTodayTemplates(
        userId: user.id,
        dateStr: dateStr,
      );
      await SupabaseService.insertTodayTasks(templates);
      final created = await SupabaseService.getTodayTasks();
      return created.map(DailyTask.fromMap).toList();
    } catch (e) {
      debugPrint('[DailyTaskService] loadOrCreateTodayTasks error: $e');
      return [];
    }
  }

  /// Called after a lesson is completed. Updates relevant task progress.
  /// Returns updated task list.
  static Future<List<DailyTask>> onLessonCompleted({
    required List<DailyTask> tasks,
    required int correctAnswers,
    required int studyMinutes,
    required bool isNewSubject,
  }) async {
    final updated = <DailyTask>[];
    for (final task in tasks) {
      if (task.isCompleted) {
        updated.add(task);
        continue;
      }
      int increment = 0;
      switch (task.taskType) {
        case 'lesson_complete':
          increment = 1;
        case 'answer_questions':
        case 'answer_questions_hard':
          increment = correctAnswers;
        case 'study_minutes':
          increment = studyMinutes;
        case 'explore_subject':
          increment = isNewSubject ? 1 : 0;
        case 'streak_day':
          increment = 1;
        default:
          increment = 0;
      }
      if (increment > 0) {
        final result = await SupabaseService.incrementTaskProgress(
          taskId: task.id,
          increment: increment,
          targetValue: task.targetValue,
        );
        if (result != null) {
          updated.add(DailyTask.fromMap(result));
          continue;
        }
      }
      updated.add(task);
    }
    return updated;
  }

  /// Total XP reward when all 5 tasks are completed.
  static int get totalRewardXp => _totalRewardXp;

  /// Whether all tasks are completed.
  static bool allCompleted(List<DailyTask> tasks) =>
      tasks.isNotEmpty && tasks.every((t) => t.isCompleted);
}
