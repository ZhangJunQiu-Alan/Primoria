import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../dashboard_localizations.dart';
import '../providers/analytics_provider.dart';
import '../widgets/activity_timeline.dart';
import '../widgets/kpi_card.dart';
import '../widgets/learner_table.dart';
import '../widgets/trend_chart.dart';

class DashboardFansManageTab extends ConsumerStatefulWidget {
  const DashboardFansManageTab({super.key, required this.t});

  final BuilderLocalizations t;

  @override
  ConsumerState<DashboardFansManageTab> createState() =>
      _DashboardFansManageTabState();
}

class _DashboardFansManageTabState
    extends ConsumerState<DashboardFansManageTab> {
  final Set<String> _selectedIds = <String>{};
  final TextEditingController _tagController = TextEditingController();

  @override
  void dispose() {
    _tagController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final fansAsync = ref.watch(fansDashboardProvider);
    final filter = ref.watch(fansFilterModeProvider);
    final searchQuery = ref.watch(fansSearchQueryProvider);
    final page = ref.watch(fansPageIndexProvider);

    return fansAsync.when(
      loading: () => const _FansSkeleton(),
      error: (_, __) => _ErrorCard(message: t.errorLoading),
      data: (data) {
        final filteredFans = _applyFilter(
          fans: data.fans,
          filter: filter,
          query: searchQuery,
        );
        final pageSize = MediaQuery.of(context).size.width < 900 ? 5 : 8;
        final maxPage = filteredFans.isEmpty
            ? 0
            : (filteredFans.length - 1) ~/ pageSize;
        final safePage = page.clamp(0, maxPage);
        if (safePage != page) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ref.read(fansPageIndexProvider.notifier).state = safePage;
          });
        }

        final start = safePage * pageSize;
        final end = (start + pageSize).clamp(0, filteredFans.length);
        final pageRows = filteredFans.sublist(start, end);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  t.dashFansTitle,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E2D3B),
                  ),
                ),
                const Spacer(),
                OutlinedButton.icon(
                  onPressed: _selectedIds.isEmpty
                      ? null
                      : () => _showHint(t.dashActionInProgress),
                  icon: const Icon(Icons.notifications_active_outlined),
                  label: Text('${t.dashSendNotice} (${_selectedIds.length})'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => _showHint(t.dashActionInProgress),
                  icon: const Icon(Icons.download_rounded),
                  label: Text(t.dashExportData),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildTopStats(data),
            const SizedBox(height: 16),
            _buildFilterBar(t),
            const SizedBox(height: 16),
            if (filteredFans.isEmpty) _buildNoFansState(t),
            if (filteredFans.isNotEmpty)
              LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth >= 1100;
                  if (wide) {
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 7,
                          child: Column(
                            children: [
                              _buildFansTableCard(
                                t: t,
                                rows: pageRows,
                                total: filteredFans.length,
                                page: safePage,
                                pageSize: pageSize,
                              ),
                              const SizedBox(height: 16),
                              _buildEngagementCard(data),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 4,
                          child: Column(
                            children: [
                              _buildTagsPanel(t),
                              const SizedBox(height: 16),
                              _buildMessageCenter(data),
                            ],
                          ),
                        ),
                      ],
                    );
                  }

                  return Column(
                    children: [
                      _buildFansTableCard(
                        t: t,
                        rows: pageRows,
                        total: filteredFans.length,
                        page: safePage,
                        pageSize: pageSize,
                      ),
                      const SizedBox(height: 16),
                      _buildEngagementCard(data),
                      const SizedBox(height: 16),
                      _buildTagsPanel(t),
                      const SizedBox(height: 16),
                      _buildMessageCenter(data),
                    ],
                  );
                },
              ),
          ],
        );
      },
    );
  }

  Widget _buildTopStats(FansDashboardData data) {
    final trendDelta = data.growthTrend.isNotEmpty
        ? ((data.growthTrend.last - data.growthTrend.first) /
                  (data.growthTrend.first == 0 ? 1 : data.growthTrend.first) *
                  100)
              .toStringAsFixed(1)
        : '0.0';

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 760;
              final cards = [
                KpiCard(
                  title: widget.t.dashTotalFans,
                  value: '${data.totalFans}',
                  icon: Icons.groups_outlined,
                  accentColor: const Color(0xFF4D7CFF),
                ),
                KpiCard(
                  title: widget.t.dashNewFansWeek,
                  value: '${data.newFansThisWeek}',
                  icon: Icons.trending_up,
                  delta: '+$trendDelta%',
                  accentColor: const Color(0xFF58CC02),
                ),
              ];

              if (!compact) {
                return Row(
                  children: [
                    Expanded(child: cards[0]),
                    const SizedBox(width: 12),
                    Expanded(child: cards[1]),
                  ],
                );
              }

              return Column(
                children: [cards[0], const SizedBox(height: 10), cards[1]],
              );
            },
          ),
          const SizedBox(height: 12),
          Text(
            widget.t.dashFansGrowthTrend,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF506A85),
            ),
          ),
          const SizedBox(height: 6),
          TrendChart(
            height: 140,
            labels: const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            series: [
              TrendLineSeries(
                name: widget.t.dashFansGrowthTrend,
                color: const Color(0xFF4D7CFF),
                values: data.growthTrend,
                showArea: true,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(BuilderLocalizations t) {
    final filter = ref.watch(fansFilterModeProvider);

    return DashboardCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 260,
            child: TextField(
              decoration: InputDecoration(
                isDense: true,
                prefixIcon: const Icon(Icons.search, size: 18),
                hintText: t.dashFansSearchHint,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onChanged: (value) {
                ref.read(fansSearchQueryProvider.notifier).state = value;
                ref.read(fansPageIndexProvider.notifier).state = 0;
              },
            ),
          ),
          ChoiceChip(
            label: Text(t.dashFilterAll),
            selected: filter == FansFilterMode.all,
            onSelected: (_) {
              ref.read(fansFilterModeProvider.notifier).state =
                  FansFilterMode.all;
              ref.read(fansPageIndexProvider.notifier).state = 0;
            },
          ),
          ChoiceChip(
            label: Text(t.dashFilterActive),
            selected: filter == FansFilterMode.active,
            onSelected: (_) {
              ref.read(fansFilterModeProvider.notifier).state =
                  FansFilterMode.active;
              ref.read(fansPageIndexProvider.notifier).state = 0;
            },
          ),
          ChoiceChip(
            label: Text(t.dashFilterNeedHelp),
            selected: filter == FansFilterMode.needHelp,
            onSelected: (_) {
              ref.read(fansFilterModeProvider.notifier).state =
                  FansFilterMode.needHelp;
              ref.read(fansPageIndexProvider.notifier).state = 0;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFansTableCard({
    required BuilderLocalizations t,
    required List<FanRecord> rows,
    required int total,
    required int page,
    required int pageSize,
  }) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashFansList,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 12),
          LearnerTable(
            rows: rows.map((fan) => _toRowData(fan)).toList(),
            selectedIds: _selectedIds,
            onToggleRow: (id) {
              setState(() {
                if (_selectedIds.contains(id)) {
                  _selectedIds.remove(id);
                } else {
                  _selectedIds.add(id);
                }
              });
            },
            emptyText: t.dashNoData,
            page: page,
            total: total,
            pageSize: pageSize,
            onPageChanged: (nextPage) {
              ref.read(fansPageIndexProvider.notifier).state = nextPage;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEngagementCard(FansDashboardData data) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.t.dashEngagementHub,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          ActivityTimeline(
            items: data.engagement
                .map(
                  (record) => ActivityTimelineItem(
                    title: record.author,
                    description: record.message,
                    timeLabel: _formatRelative(record.createdAt),
                    icon: Icons.chat_bubble_outline,
                    iconColor: const Color(0xFF4D7CFF),
                  ),
                )
                .toList(),
            emptyText: widget.t.dashNoActivity,
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => _showHint(widget.t.dashActionInProgress),
                icon: const Icon(Icons.reply_rounded, size: 16),
                label: Text(widget.t.dashReply),
              ),
              OutlinedButton.icon(
                onPressed: () => _showHint(widget.t.dashActionInProgress),
                icon: const Icon(Icons.push_pin_outlined, size: 16),
                label: Text(widget.t.dashMarkImportant),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTagsPanel(BuilderLocalizations t) {
    final tags = ref.watch(fansTagsProvider);

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashTagManager,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tag in tags)
                Chip(
                  label: Text(tag),
                  backgroundColor: const Color(0x1A4D7CFF),
                  deleteIcon: const Icon(Icons.close, size: 14),
                  onDeleted: () {
                    ref.read(fansTagsProvider.notifier).state = tags
                        .where((item) => item != tag)
                        .toList();
                  },
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _tagController,
            decoration: InputDecoration(
              isDense: true,
              hintText: t.dashCreateTag,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onSubmitted: (value) {
              final text = value.trim();
              if (text.isEmpty || tags.contains(text)) return;
              ref.read(fansTagsProvider.notifier).state = [...tags, text];
              _tagController.clear();
            },
          ),
          const SizedBox(height: 10),
          FilledButton.tonalIcon(
            onPressed: _selectedIds.isEmpty
                ? null
                : () => _showHint('${t.dashApplyTag} (${_selectedIds.length})'),
            icon: const Icon(Icons.local_offer_outlined, size: 16),
            label: Text(t.dashApplyTag),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageCenter(FansDashboardData data) {
    return DashboardCard(
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFDF6FF), Color(0xFFF0F7FF)],
      ),
      borderColor: const Color(0x336B7DFF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.t.dashMessageCenter,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              KpiCard(
                title: widget.t.dashUnreadMessages,
                value: '${data.unreadMessages}',
                icon: Icons.mark_email_unread_outlined,
                accentColor: const Color(0xFF7B68EE),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNoFansState(BuilderLocalizations t) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashNoFansTitle,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF223447),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t.dashNoFansBody,
            style: const TextStyle(fontSize: 13, color: Color(0xFF667D95)),
          ),
        ],
      ),
    );
  }

  List<FanRecord> _applyFilter({
    required List<FanRecord> fans,
    required FansFilterMode filter,
    required String query,
  }) {
    final normalizedQuery = query.trim().toLowerCase();

    return fans.where((fan) {
      final matchesFilter = switch (filter) {
        FansFilterMode.all => true,
        FansFilterMode.active => fan.isActive,
        FansFilterMode.needHelp => fan.needsHelp,
      };

      final matchesSearch = normalizedQuery.isEmpty
          ? true
          : fan.username.toLowerCase().contains(normalizedQuery);

      return matchesFilter && matchesSearch;
    }).toList();
  }

  LearnerTableRow _toRowData(FanRecord fan) {
    return LearnerTableRow(
      id: fan.id,
      username: fan.username,
      avatarUrl: fan.avatarUrl,
      registeredAt: _formatDate(fan.joinedAt),
      learnedCourses: fan.coursesLearned,
      totalStudyMinutes: fan.totalStudyMinutes,
      lastActive: _formatRelative(fan.lastActiveAt),
      tags: fan.tags,
    );
  }

  String _formatDate(DateTime date) => '${date.year}/${date.month}/${date.day}';

  String _formatRelative(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return widget.t.dashJustNow;
    if (diff.inHours < 24) return widget.t.dashHoursAgo(diff.inHours);
    return widget.t.dashDaysAgo(diff.inDays);
  }

  void _showHint(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _FansSkeleton extends StatelessWidget {
  const _FansSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _Sk(height: 160),
        SizedBox(height: 12),
        _Sk(height: 80),
        SizedBox(height: 12),
        _Sk(height: 320),
      ],
    );
  }
}

class _Sk extends StatelessWidget {
  const _Sk({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFFF3F7FB), Color(0xFFE9F1F8), Color(0xFFF3F7FB)],
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
