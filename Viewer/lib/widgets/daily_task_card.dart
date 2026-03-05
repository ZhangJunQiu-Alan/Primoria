import 'package:flutter/material.dart';
import '../models/daily_task_model.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';

/// Card showing today's daily quests with progress.
class DailyTaskCard extends StatelessWidget {
  final List<DailyTask> tasks;
  final AppLocalizations t;
  final bool isDark;

  const DailyTaskCard({
    super.key,
    required this.tasks,
    required this.t,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) return const SizedBox.shrink();

    final completedCount = tasks.where((task) => task.isCompleted).length;
    final allDone = completedCount == tasks.length;
    final totalRewardXp = tasks.fold(0, (sum, task) => sum + task.rewardXp);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Text(
                t.dailyTaskTitle,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              if (allDone)
                Text(
                  t.dailyTaskAllDone,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF10B981),
                  ),
                )
              else
                Text(
                  t.dailyTaskRewardHint(totalRewardXp),
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : AppColors.textSecondary,
                  ),
                ),
            ],
          ),
          // Progress summary bar
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: tasks.isNotEmpty ? completedCount / tasks.length : 0,
              minHeight: 4,
              backgroundColor: isDark
                  ? const Color(0xFF334155)
                  : const Color(0xFFF1F5F9),
              valueColor: AlwaysStoppedAnimation<Color>(
                allDone ? const Color(0xFF10B981) : AppColors.indigo500,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Task rows
          ...tasks.map((task) => _taskRow(task)),
        ],
      ),
    );
  }

  Widget _taskRow(DailyTask task) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          // Completion icon
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: task.isCompleted
                  ? const Color(0xFF10B981)
                  : Colors.transparent,
              shape: BoxShape.circle,
              border: task.isCompleted
                  ? null
                  : Border.all(
                      color: isDark
                          ? const Color(0xFF475569)
                          : const Color(0xFFCBD5E1),
                      width: 1.5,
                    ),
            ),
            child: task.isCompleted
                ? const Icon(Icons.check, size: 12, color: Colors.white)
                : null,
          ),
          const SizedBox(width: 10),
          // Label
          Expanded(
            child: Text(
              task.displayLabel,
              style: TextStyle(
                fontSize: 13,
                color: task.isCompleted
                    ? (isDark ? Colors.white38 : AppColors.textSecondary)
                    : (isDark ? Colors.white70 : AppColors.textPrimary),
                decoration: task.isCompleted
                    ? TextDecoration.lineThrough
                    : TextDecoration.none,
              ),
            ),
          ),
          // Progress / XP
          if (!task.isCompleted) ...[
            Text(
              '${task.currentValue}/${task.targetValue}',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.white38 : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: task.isCompleted
                  ? const Color(0xFFD1FAE5)
                  : (isDark
                        ? const Color(0xFF1E3A5F)
                        : AppColors.indigo50),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '+${task.rewardXp}XP',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: task.isCompleted
                    ? const Color(0xFF10B981)
                    : AppColors.indigo500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
