import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import '../models/achievement_model.dart';
import '../models/daily_task_model.dart';
import '../services/achievement_service.dart';
import '../services/daily_task_service.dart';
import '../services/supabase_service.dart';
import '../widgets/achievement_unlock_popup.dart';
import '../widgets/star_chain_widget.dart';

class LessonResultScreen extends StatefulWidget {
  final String lessonId;
  final String lessonTitle;
  final Map<String, dynamic> rpcResult;
  final int correctCount;
  final int totalCount;
  final int timeSpentSeconds;
  final int currentStreak;

  const LessonResultScreen({
    super.key,
    required this.lessonId,
    required this.lessonTitle,
    required this.rpcResult,
    required this.correctCount,
    required this.totalCount,
    required this.timeSpentSeconds,
    required this.currentStreak,
  });

  @override
  State<LessonResultScreen> createState() => _LessonResultScreenState();
}

class _LessonResultScreenState extends State<LessonResultScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  int _xpEarned = 0;
  int _accuracyPct = 100;
  bool _isFirstToday = false;
  List<DailyTask> _tasks = [];
  List<AchievementModel> _newAchievements = [];
  Set<String> _activeDates = {};
  bool _loading = true;

  AppLocalizations get _t => context.read<LanguageProvider>().t;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);

    _xpEarned = (widget.rpcResult['xp_earned'] as num?)?.toInt() ?? 0;
    _accuracyPct = widget.totalCount > 0
        ? (widget.correctCount / widget.totalCount * 100).round()
        : 100;
    _isFirstToday = widget.rpcResult['is_first_today'] == true;

    _loadData();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    // Parallel: load tasks, achievements, active dates
    final results = await Future.wait([
      DailyTaskService.loadOrCreateTodayTasks(),
      AchievementService.checkAndUnlock(
        rpcResult: widget.rpcResult,
        timeSpentSeconds: widget.timeSpentSeconds,
      ),
      SupabaseService.getActiveDates(),
    ]);

    final tasks = results[0] as List<DailyTask>;
    final achievements = results[1] as List<AchievementModel>;
    final dates = results[2] as Set<String>;

    // Update task progress based on this lesson
    final updatedTasks = await DailyTaskService.onLessonCompleted(
      tasks: tasks,
      correctAnswers: widget.correctCount,
      studyMinutes: (widget.timeSpentSeconds / 60).ceil(),
      isNewSubject: false, // TODO: detect new subject
    );

    if (!mounted) return;
    setState(() {
      _tasks = updatedTasks;
      _newAchievements = achievements;
      _activeDates = dates;
      _loading = false;
    });
    _animCtrl.forward();
  }

  String _formatTime(int seconds) {
    final t = _t;
    if (seconds < 60) return t.isZh ? '$seconds秒' : '${seconds}s';
    final m = seconds ~/ 60;
    final s = seconds % 60;
    if (t.isZh) {
      return s > 0 ? '$m分 $s秒' : '$m分';
    }
    return s > 0 ? '${m}m ${s}s' : '${m}m';
  }

  void _onContinue() async {
    if (_newAchievements.isNotEmpty) {
      final t = context.read<LanguageProvider>().t;
      await _showAchievementsQueue(t);
    }
    if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
  }

  Future<void> _showAchievementsQueue(AppLocalizations t) async {
    for (final achievement in _newAchievements) {
      if (!mounted) break;
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AchievementUnlockPopup(achievement: achievement),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : AppColors.background;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : FadeTransition(
                opacity: _fadeAnim,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),
                      _buildHeader(t, isDark),
                      const SizedBox(height: 24),
                      _buildStatsGrid(t, isDark),
                      const SizedBox(height: 20),
                      _buildStarChain(t, isDark),
                      const SizedBox(height: 20),
                      _buildTaskProgress(t, isDark),
                      const SizedBox(height: 28),
                      if (_newAchievements.isNotEmpty) ...[
                        _buildAchievementHint(t),
                        const SizedBox(height: 12),
                      ],
                      _buildContinueButton(t),
                      const SizedBox(height: 12),
                      _buildHomeButton(t),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────────

  Widget _buildHeader(AppLocalizations t, bool isDark) {
    return Column(
      children: [
        const Text('🎉', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 8),
        Text(
          t.resultTitle,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          widget.lessonTitle,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white54 : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  // ── Stats grid ───────────────────────────────────────────────

  Widget _buildStatsGrid(AppLocalizations t, bool isDark) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.7,
      children: [
        _statCard(
          top: _AnimatedCounter(
            value: _xpEarned,
            prefix: '+',
            suffix: ' XP',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppColors.indigo500,
            ),
          ),
          label: t.isZh ? '经验值' : 'XP',
          bg: AppColors.indigo50,
          isDark: isDark,
        ),
        _statCard(
          top: Text(
            '$_accuracyPct%',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: Color(0xFF10B981),
            ),
          ),
          label: t.resultAccuracy,
          bg: const Color(0xFFD1FAE5),
          isDark: isDark,
        ),
        _statCard(
          top: Text(
            _formatTime(widget.timeSpentSeconds),
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Color(0xFF6366F1),
            ),
          ),
          label: t.resultTimeSpent,
          bg: const Color(0xFFEDE9FE),
          isDark: isDark,
        ),
        _statCard(
          top: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🔥', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 4),
              Text(
                '${widget.currentStreak}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF59E0B),
                ),
              ),
            ],
          ),
          label: t.resultStreakLabel,
          bg: const Color(0xFFFEF3C7),
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _statCard({
    required Widget top,
    required String label,
    required Color bg,
    required bool isDark,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : bg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          top,
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white54 : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  // ── Star chain ───────────────────────────────────────────────

  Widget _buildStarChain(AppLocalizations t, bool isDark) {
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
          Row(
            children: [
              Text(
                t.resultTodayStar,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
              ),
              if (_isFirstToday) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    t.resultStarLit,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFFF59E0B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          StarChainWidget(activeDates: _activeDates, compact: true),
        ],
      ),
    );
  }

  // ── Task progress ────────────────────────────────────────────

  Widget _buildTaskProgress(AppLocalizations t, bool isDark) {
    if (_tasks.isEmpty) return const SizedBox.shrink();
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
          Text(
            t.resultTaskProgress,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ..._tasks.map((task) => _taskRow(task, t, isDark)),
        ],
      ),
    );
  }

  Widget _taskRow(DailyTask task, AppLocalizations t, bool isDark) {
    final label = isDark ? Colors.white70 : AppColors.textPrimary;
    final sub = isDark ? Colors.white38 : AppColors.textSecondary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            task.isCompleted
                ? Icons.check_circle
                : Icons.radio_button_unchecked,
            size: 18,
            color: task.isCompleted
                ? const Color(0xFF10B981)
                : AppColors.textSecondary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              task.displayLabel,
              style: TextStyle(fontSize: 13, color: label),
            ),
          ),
          Text(
            task.isCompleted
                ? t.resultCompleted
                : '${task.currentValue}/${task.targetValue}',
            style: TextStyle(
              fontSize: 12,
              color: task.isCompleted ? const Color(0xFF10B981) : sub,
              fontWeight: task.isCompleted
                  ? FontWeight.w600
                  : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  // ── Achievement hint ─────────────────────────────────────────

  Widget _buildAchievementHint(AppLocalizations t) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        t.resultAchievementHint,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 13,
          color: Color(0xFFF59E0B),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  // ── Buttons ──────────────────────────────────────────────────

  Widget _buildContinueButton(AppLocalizations t) {
    return ElevatedButton(
      onPressed: _onContinue,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 0,
      ),
      child: Text(
        t.resultContinue,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildHomeButton(AppLocalizations t) {
    return TextButton(
      onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
      child: Text(
        t.resultGoHome,
        style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
      ),
    );
  }
}

// ── Animated counter ─────────────────────────────────────────────

class _AnimatedCounter extends StatefulWidget {
  final int value;
  final String prefix;
  final String suffix;
  final TextStyle style;

  const _AnimatedCounter({
    required this.value,
    this.prefix = '',
    this.suffix = '',
    required this.style,
  });

  @override
  State<_AnimatedCounter> createState() => _AnimatedCounterState();
}

class _AnimatedCounterState extends State<_AnimatedCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<int> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _anim = IntTween(
      begin: 0,
      end: widget.value,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Text(
        '${widget.prefix}${_anim.value}${widget.suffix}',
        style: widget.style,
      ),
    );
  }
}
