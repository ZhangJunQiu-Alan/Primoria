import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../../../widgets/app_dropdown.dart';
import '../dashboard_localizations.dart';
import '../providers/analytics_provider.dart';
import '../widgets/kpi_card.dart';
import '../widgets/trend_chart.dart';

class DashboardDataCenterTab extends ConsumerWidget {
  const DashboardDataCenterTab({super.key, required this.t});

  final BuilderLocalizations t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(analyticsDashboardProvider);
    final range = ref.watch(analyticsRangeProvider);
    final sortMetric = ref.watch(courseSortMetricProvider);

    return analyticsAsync.when(
      loading: () => const _DataCenterSkeleton(),
      error: (_, __) => _ErrorCard(message: t.errorLoading),
      data: (data) {
        final trends = _filterTrendsByRange(data.trends, range);
        final performance = _sortPerformance(
          data.coursePerformance,
          sortMetric,
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  t.dashDataCenterTitle,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E2D3B),
                  ),
                ),
                const Spacer(),
                OutlinedButton.icon(
                  onPressed: () => _exportCsv(context, performance),
                  icon: const Icon(Icons.download_rounded),
                  label: Text(t.dashExportReport),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildKpiRow(data),
            const SizedBox(height: 16),
            DashboardCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        t.dashLearningTrends,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1E2D3B),
                        ),
                      ),
                      const Spacer(),
                      _RangeSelector(t: t, current: range),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TrendChart(
                    height: 260,
                    labels: _labelsFor(trends),
                    series: [
                      TrendLineSeries(
                        name: t.dashViewsLegend,
                        color: const Color(0xFF4D7CFF),
                        values: trends.map((point) => point.views).toList(),
                        showArea: true,
                      ),
                      TrendLineSeries(
                        name: t.dashLearnersLegend,
                        color: const Color(0xFF58CC02),
                        values: trends.map((point) => point.learners).toList(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final twoColumns = constraints.maxWidth >= 980;
                if (twoColumns) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: _buildPerformanceCard(performance, sortMetric),
                      ),
                      const SizedBox(width: 16),
                      Expanded(child: _buildGeoCard(data.geoDistribution)),
                    ],
                  );
                }

                return Column(
                  children: [
                    _buildPerformanceCard(performance, sortMetric),
                    const SizedBox(height: 16),
                    _buildGeoCard(data.geoDistribution),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            _buildHeatmapCard(data.learningHeatmap),
            const SizedBox(height: 16),
            _buildCourseTable(performance),
          ],
        );
      },
    );
  }

  Widget _buildKpiRow(AnalyticsDashboardData data) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 980;

        final cards = [
          KpiCard(
            title: t.dashTotalLearners,
            value: '${data.totalLearners}',
            icon: Icons.groups_2_outlined,
            accentColor: const Color(0xFF4D7CFF),
          ),
          KpiCard(
            title: t.dashTotalViews,
            value: '${data.totalViews}',
            icon: Icons.visibility_outlined,
            accentColor: const Color(0xFF58CC02),
          ),
          KpiCard(
            title: t.dashAverageCompletion,
            value: '${(data.averageCompletion * 100).toStringAsFixed(1)}%',
            icon: Icons.task_alt_outlined,
            accentColor: const Color(0xFFFFA000),
          ),
          KpiCard(
            title: t.dashAverageRating,
            value: data.averageRating.toStringAsFixed(1),
            icon: Icons.star_outline,
            accentColor: const Color(0xFF8E5CFF),
          ),
        ];

        if (!compact) {
          return Row(
            children: [
              for (var i = 0; i < cards.length; i++) ...[
                Expanded(child: cards[i]),
                if (i != cards.length - 1) const SizedBox(width: 12),
              ],
            ],
          );
        }

        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: cards
              .map(
                (card) =>
                    SizedBox(width: constraints.maxWidth / 2 - 6, child: card),
              )
              .toList(),
        );
      },
    );
  }

  Widget _buildPerformanceCard(
    List<CoursePerformanceMetric> performance,
    CourseSortMetric sortMetric,
  ) {
    final sortedPreview = performance.take(6).toList();
    final maxViews = sortedPreview.fold<int>(
      0,
      (m, row) => math.max(m, row.views),
    );

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                t.dashCoursePerformance,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E2D3B),
                ),
              ),
              const Spacer(),
              _SortSelector(t: t, current: sortMetric),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 240,
            child: BarChart(
              BarChartData(
                maxY: (maxViews * 1.25).clamp(10, 999999).toDouble(),
                alignment: BarChartAlignment.spaceAround,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxViews > 0 ? (maxViews / 4) : 1,
                  getDrawingHorizontalLine: (_) =>
                      const FlLine(color: Color(0x1A4A6581), strokeWidth: 1),
                ),
                borderData: FlBorderData(show: false),
                barTouchData: BarTouchData(enabled: true),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 34,
                      getTitlesWidget: (value, _) => Text(
                        value.toInt().toString(),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF7C90A5),
                        ),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, _) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= sortedPreview.length) {
                          return const SizedBox.shrink();
                        }
                        final label = sortedPreview[idx].title;
                        return Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            label.length > 8
                                ? '${label.substring(0, 8)}…'
                                : label,
                            style: const TextStyle(
                              fontSize: 10,
                              color: Color(0xFF70879D),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barGroups: [
                  for (var i = 0; i < sortedPreview.length; i++)
                    BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: sortedPreview[i].views.toDouble(),
                          width: 18,
                          borderRadius: BorderRadius.circular(5),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF4D7CFF), Color(0xFF58CC02)],
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeoCard(List<GeoDistribution> items) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashGeoDistribution,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 210,
            child: PieChart(
              PieChartData(
                centerSpaceRadius: 34,
                sectionsSpace: 2,
                sections: [
                  for (var i = 0; i < items.length; i++)
                    PieChartSectionData(
                      value: items[i].percent * 100,
                      radius: 58,
                      color: _pieColors[i % _pieColors.length],
                      title: '${(items[i].percent * 100).toStringAsFixed(0)}%',
                      titleStyle: const TextStyle(
                        fontSize: 11,
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < items.length; i++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: _pieColors[i % _pieColors.length],
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      items[i].region,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF50657A),
                      ),
                    ),
                  ),
                  Text(
                    '${(items[i].percent * 100).toStringAsFixed(1)}%',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF243649),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeatmapCard(List<List<double>> heatmap) {
    final dayLabels = t.isZh
        ? const ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        : const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const slotLabels = [
      '0-3',
      '3-6',
      '6-9',
      '9-12',
      '12-15',
      '15-18',
      '18-21',
      '21-24',
    ];

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashLearningTimeAnalysis,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          for (var day = 0; day < heatmap.length; day++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 34,
                    child: Text(
                      dayLabels[day],
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF758BA1),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Row(
                      children: [
                        for (var slot = 0; slot < heatmap[day].length; slot++)
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 2,
                              ),
                              child: Tooltip(
                                message:
                                    '${slotLabels[slot]} - ${(heatmap[day][slot] * 100).round()}%',
                                child: Container(
                                  height: 16,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(4),
                                    color: Color.lerp(
                                      const Color(0xFFE9F1FF),
                                      const Color(0xFF4D7CFF),
                                      heatmap[day][slot],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCourseTable(List<CoursePerformanceMetric> performance) {
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.dashCourseDataTable,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          if (performance.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                t.dashNoData,
                style: const TextStyle(fontSize: 13, color: Color(0xFF73869D)),
              ),
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  DataColumn(label: Text(t.dashTableCourseName)),
                  DataColumn(label: Text(t.dashTableViews)),
                  DataColumn(label: Text(t.dashTableLearners)),
                  DataColumn(label: Text(t.dashTableCompletion)),
                  DataColumn(label: Text(t.dashTableAvgStudy)),
                  DataColumn(label: Text(t.dashTableUpdated)),
                  DataColumn(label: Text(t.dashTableAction)),
                ],
                rows: [
                  for (final row in performance)
                    DataRow(
                      cells: [
                        DataCell(Text(row.title)),
                        DataCell(Text('${row.views}')),
                        DataCell(Text('${row.learners}')),
                        DataCell(
                          Text('${(row.completion * 100).toStringAsFixed(1)}%'),
                        ),
                        DataCell(
                          Text(
                            t.isZh
                                ? '${row.avgStudyMinutes} 分钟'
                                : '${row.avgStudyMinutes} min',
                          ),
                        ),
                        DataCell(Text(_formatDate(row.updatedAt))),
                        DataCell(
                          TextButton(
                            onPressed: () {},
                            child: Text(t.dashTableViewDetail),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _exportCsv(
    BuildContext context,
    List<CoursePerformanceMetric> rows,
  ) async {
    final csv = StringBuffer()
      ..writeln(
        'course,views,learners,completion,avg_study_min,rating,updated_at',
      );

    for (final row in rows) {
      csv.writeln(
        '"${row.title.replaceAll('"', '""')}",${row.views},${row.learners},'
        '${(row.completion * 100).toStringAsFixed(2)},${row.avgStudyMinutes},'
        '${row.rating.toStringAsFixed(2)},${row.updatedAt.toIso8601String()}',
      );
    }

    await Clipboard.setData(ClipboardData(text: csv.toString()));
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          t.isZh ? '${t.dashExportDone} · 已复制到剪贴板' : '${t.dashExportDone} · Copied to clipboard',
        ),
      ),
    );
  }

  List<AnalyticsPoint> _filterTrendsByRange(
    List<AnalyticsPoint> all,
    AnalyticsRange range,
  ) {
    switch (range) {
      case AnalyticsRange.last7:
        return all.takeLast(7);
      case AnalyticsRange.last30:
        return all.takeLast(30);
      case AnalyticsRange.last90:
        return all.takeLast(90);
      case AnalyticsRange.all:
        return all;
    }
  }

  List<CoursePerformanceMetric> _sortPerformance(
    List<CoursePerformanceMetric> rows,
    CourseSortMetric metric,
  ) {
    final sorted = [...rows];
    switch (metric) {
      case CourseSortMetric.views:
        sorted.sort((a, b) => b.views.compareTo(a.views));
      case CourseSortMetric.completion:
        sorted.sort((a, b) => b.completion.compareTo(a.completion));
      case CourseSortMetric.rating:
        sorted.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return sorted;
  }

  List<String> _labelsFor(List<AnalyticsPoint> points) {
    final labels = <String>[];
    final interval = points.length <= 8 ? 1 : (points.length / 5).ceil();
    for (var i = 0; i < points.length; i++) {
      if (i % interval == 0 || i == points.length - 1) {
        labels.add('${points[i].day.month}/${points[i].day.day}');
      } else {
        labels.add('');
      }
    }
    return labels;
  }

  String _formatDate(DateTime date) => '${date.month}/${date.day}';
}

class _RangeSelector extends ConsumerWidget {
  const _RangeSelector({required this.t, required this.current});

  final BuilderLocalizations t;
  final AnalyticsRange current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = <(AnalyticsRange, String)>[
      (AnalyticsRange.last7, t.dashRange7d),
      (AnalyticsRange.last30, t.dashRange30d),
      (AnalyticsRange.last90, t.dashRange90d),
      (AnalyticsRange.all, t.dashRangeAll),
    ];

    return Wrap(
      spacing: 6,
      children: [
        for (final item in items)
          ChoiceChip(
            label: Text(item.$2),
            selected: item.$1 == current,
            onSelected: (_) {
              ref.read(analyticsRangeProvider.notifier).state = item.$1;
            },
          ),
      ],
    );
  }
}

class _SortSelector extends ConsumerWidget {
  const _SortSelector({required this.t, required this.current});

  final BuilderLocalizations t;
  final CourseSortMetric current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppDropdown<CourseSortMetric>(
      value: current,
      isDense: true,
      items: [
        AppDropdownItem(value: CourseSortMetric.views, label: t.dashSortByViews),
        AppDropdownItem(
          value: CourseSortMetric.completion,
          label: t.dashSortByCompletion,
        ),
        AppDropdownItem(
          value: CourseSortMetric.rating,
          label: t.dashSortByRating,
        ),
      ],
      onChanged: (value) {
        if (value == null) return;
        ref.read(courseSortMetricProvider.notifier).state = value;
      },
    );
  }
}

class _DataCenterSkeleton extends StatelessWidget {
  const _DataCenterSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _Sk(height: 120),
        SizedBox(height: 12),
        _Sk(height: 300),
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

extension<T> on List<T> {
  List<T> takeLast(int count) {
    if (isEmpty) return <T>[];
    if (length <= count) return [...this];
    return sublist(length - count);
  }
}

const _pieColors = [
  Color(0xFF4D7CFF),
  Color(0xFF58CC02),
  Color(0xFFFF9800),
  Color(0xFF7D5FFF),
  Color(0xFF20B2AA),
];
