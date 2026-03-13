import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../dashboard_localizations.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/activity_timeline.dart';
import '../widgets/kpi_card.dart';
import '../widgets/trend_chart.dart';

class DashboardHomeTab extends ConsumerWidget {
  const DashboardHomeTab({
    super.key,
    required this.t,
    required this.onCreateCourse,
    required this.onContinueEditing,
    required this.onViewDataCenter,
    required this.onOpenCourse,
  });

  final BuilderLocalizations t;
  final VoidCallback onCreateCourse;
  final VoidCallback onContinueEditing;
  final VoidCallback onViewDataCenter;
  final ValueChanged<String> onOpenCourse;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeAsync = ref.watch(dashboardHomeProvider);
    final displayName = ref.watch(dashboardUserDisplayNameProvider).valueOrNull;

    return homeAsync.when(
      loading: () => const _HomeSkeleton(),
      error: (_, __) => _ErrorCard(message: t.errorLoading),
      data: (data) {
        final width = MediaQuery.of(context).size.width;
        final isDesktop = width >= 1200;
        final isTablet = width >= 760;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildWelcomeCard(context, displayName: displayName),
            const SizedBox(height: 20),
            if (isDesktop)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 7,
                    child: Column(
                      children: [
                        _buildOverviewSection(data),
                        const SizedBox(height: 18),
                        _buildTopCourseSection(data),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    flex: 5,
                    child: Column(
                      children: [
                        _buildActivitySection(context, data),
                        const SizedBox(height: 18),
                        _buildIncomeSection(data),
                      ],
                    ),
                  ),
                ],
              )
            else if (isTablet)
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  SizedBox(
                    width: (width - 260) / 2,
                    child: _buildOverviewSection(data),
                  ),
                  SizedBox(
                    width: (width - 260) / 2,
                    child: _buildActivitySection(context, data),
                  ),
                  SizedBox(
                    width: width - 240,
                    child: _buildTopCourseSection(data),
                  ),
                  SizedBox(
                    width: width - 240,
                    child: _buildIncomeSection(data),
                  ),
                ],
              )
            else
              Column(
                children: [
                  _buildOverviewSection(data),
                  const SizedBox(height: 16),
                  _buildTopCourseSection(data),
                  const SizedBox(height: 16),
                  _buildActivitySection(context, data),
                  const SizedBox(height: 16),
                  _buildIncomeSection(data),
                ],
              ),
          ],
        );
      },
    );
  }

  Widget _buildWelcomeCard(BuildContext context, {String? displayName}) {
    final greeting = _greetingText(displayName: displayName);

    return DashboardCard(
      padding: const EdgeInsets.all(24),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFEEF6FF), Color(0xFFEFFBEF)],
      ),
      borderColor: const Color(0x334D7CFF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            t.dashWelcomeBack,
            style: const TextStyle(fontSize: 14, color: Color(0xFF5C6F84)),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _quickAction(
                label: t.dashCreateNewCourse,
                icon: Icons.add_rounded,
                primary: true,
                onTap: onCreateCourse,
              ),
              _quickAction(
                label: t.dashContinueEditing,
                icon: Icons.edit_rounded,
                onTap: onContinueEditing,
              ),
              _quickAction(
                label: t.dashViewAnalytics,
                icon: Icons.insights_outlined,
                onTap: onViewDataCenter,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _quickAction({
    required String label,
    required IconData icon,
    bool primary = false,
    required VoidCallback onTap,
  }) {
    return FilledButton.tonalIcon(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        backgroundColor: primary
            ? const Color(0xFF4D7CFF)
            : const Color(0xFFE9F1FF),
        foregroundColor: primary ? Colors.white : const Color(0xFF2A4E8F),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }

  Widget _buildOverviewSection(HomeDashboardData data) {
    final completionLabel =
        '${(data.completionRate * 100).toStringAsFixed(1)}%';
    final delta = data.completionDelta >= 0
        ? '+${data.completionDelta.toStringAsFixed(1)}%'
        : '${data.completionDelta.toStringAsFixed(1)}%';

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashLearningOverview,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 540;
              if (compact) {
                return Column(
                  children: [
                    KpiCard(
                      title: t.dashWeeklyLearners,
                      value: '${data.weeklyLearners}',
                      icon: Icons.people_alt_outlined,
                      accentColor: const Color(0xFF4D7CFF),
                    ),
                    const SizedBox(height: 10),
                    KpiCard(
                      title: t.dashTotalStudyHours,
                      value: '${data.totalStudyHours}h',
                      icon: Icons.hourglass_bottom,
                      accentColor: const Color(0xFF58CC02),
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: KpiCard(
                      title: t.dashWeeklyLearners,
                      value: '${data.weeklyLearners}',
                      icon: Icons.people_alt_outlined,
                      accentColor: const Color(0xFF4D7CFF),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KpiCard(
                      title: t.dashTotalStudyHours,
                      value: '${data.totalStudyHours}h',
                      icon: Icons.hourglass_bottom,
                      accentColor: const Color(0xFF58CC02),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text(
                '${t.dashCompletionTrend}: $completionLabel',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF2B3E51),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF58CC02).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  t.dashComparedToLastWeek(delta),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2D9A00),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TrendChart(
            height: 150,
            labels: const ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            series: [
              TrendLineSeries(
                name: t.dashCompletionLegend,
                color: const Color(0xFF4D7CFF),
                showArea: true,
                values: data.completionTrend
                    .map((value) => value * 100)
                    .toList(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTopCourseSection(HomeDashboardData data) {
    if (!data.hasCourses) {
      return DashboardCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t.dashTopCourses,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1E2D3B),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: const Color(0xFFF5FAFF),
                border: Border.all(color: const Color(0x244A6581)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.dashEmptyCoursesTitle,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF243649),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t.dashEmptyCoursesBody,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF688097),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: onCreateCourse,
                    child: Text(t.dashCreateNewCourse),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashTopCourses,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 12),
          for (final course in data.topCourses)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: DashboardCard(
                padding: const EdgeInsets.all(12),
                onTap: () => onOpenCourse(course.id),
                borderColor: const Color(0x284D7CFF),
                child: Row(
                  children: [
                    _courseThumb(course.thumbnailUrl),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E2D3B),
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            '${t.dashViewsLegend}: ${course.views}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6B7E92),
                            ),
                          ),
                          const SizedBox(height: 5),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              minHeight: 6,
                              value: course.completionRate,
                              backgroundColor: const Color(0x1A4D7CFF),
                              color: const Color(0xFF58CC02),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: () => onOpenCourse(course.id),
                      child: Text(t.dashOpenCourse),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _courseThumb(String? url) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFE7F0FB),
        image: url != null && url.isNotEmpty
            ? DecorationImage(image: NetworkImage(url), fit: BoxFit.cover)
            : null,
      ),
      child: (url == null || url.isEmpty)
          ? const Icon(Icons.auto_stories_outlined, color: Color(0xFF4D7CFF))
          : null,
    );
  }

  Widget _buildActivitySection(BuildContext context, HomeDashboardData data) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                t.dashRecentActivity,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E2D3B),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: onViewDataCenter,
                child: Text(t.dashViewAll),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ActivityTimeline(
            items: data.recentActivities
                .map(
                  (item) => ActivityTimelineItem(
                    title: item.title,
                    description: item.description,
                    timeLabel: _formatRelative(item.timestamp),
                    icon: _activityIcon(item.type),
                    iconColor: _activityColor(item.type),
                  ),
                )
                .toList(),
            emptyText: t.dashNoActivity,
          ),
        ],
      ),
    );
  }

  Widget _buildIncomeSection(HomeDashboardData data) {
    return DashboardCard(
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFFFCF0), Color(0xFFF3FDE8)],
      ),
      borderColor: const Color(0x33A8CE1C),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashIncomeReserve,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: KpiCard(
                  title: t.dashMonthlyIncome,
                  value: '\$${data.monthIncome.toStringAsFixed(0)}',
                  icon: Icons.paid_outlined,
                  accentColor: const Color(0xFFFF9800),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: KpiCard(
                  title: t.dashPendingSettlement,
                  value: '\$${data.pendingSettlement.toStringAsFixed(0)}',
                  icon: Icons.account_balance_wallet_outlined,
                  accentColor: const Color(0xFF58CC02),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            t.dashIncomeTrend,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF53708C),
            ),
          ),
          const SizedBox(height: 4),
          MiniSparkline(
            values: data.incomeTrend,
            color: const Color(0xFF58CC02),
          ),
        ],
      ),
    );
  }

  String _greetingText({String? displayName}) {
    final hour = DateTime.now().hour;
    final baseGreeting = _timeOfDayGreeting(hour);
    final name = displayName?.trim();
    if (name != null && name.isNotEmpty) {
      return '$baseGreeting $name 👋';
    }
    return '$baseGreeting 👋';
  }

  String _timeOfDayGreeting(int hour) {
    if (t.isZh) {
      if (hour < 12) return t.dashGreetingMorning;
      if (hour < 18) return t.dashGreetingAfternoon;
      return t.dashGreetingEvening;
    }
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _formatRelative(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return t.dashJustNow;
    if (diff.inHours < 24) return t.dashHoursAgo(diff.inHours);
    return t.dashDaysAgo(diff.inDays);
  }

  IconData _activityIcon(DashboardActivityType type) {
    switch (type) {
      case DashboardActivityType.comment:
        return Icons.chat_bubble_outline;
      case DashboardActivityType.like:
        return Icons.thumb_up_off_alt;
      case DashboardActivityType.learnerJoin:
        return Icons.person_add_alt_1_outlined;
    }
  }

  Color _activityColor(DashboardActivityType type) {
    switch (type) {
      case DashboardActivityType.comment:
        return const Color(0xFF4D7CFF);
      case DashboardActivityType.like:
        return const Color(0xFFFF9800);
      case DashboardActivityType.learnerJoin:
        return const Color(0xFF58CC02);
    }
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _SkeletonBlock(height: 150),
        SizedBox(height: 14),
        _SkeletonBlock(height: 260),
        SizedBox(height: 14),
        _SkeletonBlock(height: 220),
      ],
    );
  }
}

class _SkeletonBlock extends StatelessWidget {
  const _SkeletonBlock({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          colors: [Color(0xFFF3F7FB), Color(0xFFEAF1F8), Color(0xFFF3F7FB)],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DashboardCard(
      child: Text(
        message,
        style: const TextStyle(
          color: Color(0xFFE53E3E),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
