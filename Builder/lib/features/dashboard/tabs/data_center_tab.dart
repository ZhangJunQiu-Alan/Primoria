import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../dashboard_localizations.dart';
import '../providers/analytics_provider.dart';
import '../widgets/kpi_card.dart';
import '../widgets/trend_chart.dart';

class DashboardDataCenterTab extends ConsumerWidget {
  const DashboardDataCenterTab({super.key, required this.t});

  final BuilderLocalizations t;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(builderDataCenterProvider);

    return dataAsync.when(
      loading: () => const _DataCenterSkeleton(),
      error: (_, __) => _ErrorCard(message: t.errorLoading),
      data: (data) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, data),
            const SizedBox(height: 14),
            _buildKpiGrid(data),
            const SizedBox(height: 16),
            _buildResponsivePair(
              left: _buildCourseVolumeCard(data),
              right: _buildCourseTypeCard(data),
            ),
            const SizedBox(height: 16),
            _buildResponsivePair(
              left: _buildIncomeOverviewCard(data),
              right: _buildLearningProgressCard(data),
            ),
            const SizedBox(height: 16),
            _buildPublishedViewersCard(data),
            const SizedBox(height: 16),
            _buildPublishedCourseTable(data),
            const SizedBox(height: 16),
            _buildBuilderInsightsCard(data),
          ],
        );
      },
    );
  }

  String _tr(String zh, String en) => t.isZh ? zh : en;

  Widget _buildHeader(BuildContext context, BuilderDataCenterData data) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _tr('数据中心总览', 'Data Center Overview'),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E2D3B),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _tr(
                  '追踪课程创建、发布、收入和学习效果',
                  'Track course creation, publishing, income, and learning outcomes.',
                ),
                style: const TextStyle(fontSize: 13, color: Color(0xFF63778C)),
              ),
            ],
          ),
        ),
        OutlinedButton.icon(
          onPressed: () => _exportCsv(context, data),
          icon: const Icon(Icons.download_rounded),
          label: Text(t.dashExportReport),
        ),
      ],
    );
  }

  Widget _buildKpiGrid(BuilderDataCenterData data) {
    final cards = <Widget>[
      KpiCard(
        title: _tr('课程总数', 'Total Courses'),
        value: '${data.totalCourses}',
        icon: Icons.library_books_outlined,
        subtitle: _tr(
          '草稿 ${data.draftCourses} · 已归档 ${data.archivedCourses}',
          'Draft ${data.draftCourses} · Archived ${data.archivedCourses}',
        ),
        accentColor: const Color(0xFF4D7CFF),
      ),
      KpiCard(
        title: _tr('已发布课程', 'Published Courses'),
        value: '${data.publishedCourses}',
        icon: Icons.public_outlined,
        delta: _publishRateLabel(data),
        accentColor: const Color(0xFF58CC02),
      ),
      KpiCard(
        title: _tr('已发布课程观看人数', 'Published Course Viewers'),
        value: _formatNumber(data.estimatedPublishedViewers),
        icon: Icons.visibility_outlined,
        accentColor: const Color(0xFFFF9800),
      ),
      KpiCard(
        title: _tr('平均学习完成率', 'Average Learning Completion'),
        value: '${(data.averageCompletionRate * 100).toStringAsFixed(1)}%',
        icon: Icons.trending_up_rounded,
        accentColor: const Color(0xFF00A6C8),
      ),
      KpiCard(
        title: _tr('预计月收入', 'Estimated Monthly Income'),
        value: _currency(data.estimatedMonthlyIncome),
        icon: Icons.payments_outlined,
        subtitle: _tr(
          '基于发布课程观看与价格估算',
          'Estimated from published audience and pricing',
        ),
        accentColor: const Color(0xFF7D5FFF),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 1260
            ? 5
            : constraints.maxWidth >= 980
            ? 3
            : constraints.maxWidth >= 620
            ? 2
            : 1;
        final spacing = 12.0;
        final itemWidth =
            (constraints.maxWidth - (columns - 1) * spacing) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final card in cards) SizedBox(width: itemWidth, child: card),
          ],
        );
      },
    );
  }

  Widget _buildResponsivePair({required Widget left, required Widget right}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final twoColumns = constraints.maxWidth >= 980;
        if (twoColumns) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: left),
              const SizedBox(width: 16),
              Expanded(child: right),
            ],
          );
        }
        return Column(children: [left, const SizedBox(height: 16), right]);
      },
    );
  }

  Widget _buildCourseVolumeCard(BuilderDataCenterData data) {
    final points = data.courseVolume;
    final maxY = points.fold<int>(
      1,
      (m, point) =>
          math.max(m, math.max(point.createdCourses, point.publishedCourses)),
    );

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('课程新增趋势', 'Courses Added Over Time'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _tr('每月新建与发布课程数量', 'Monthly created and published course counts'),
            style: const TextStyle(fontSize: 12, color: Color(0xFF6F859A)),
          ),
          const SizedBox(height: 12),
          _legendRow(
            items: const [
              (_ChartPalette.blue, 'Created'),
              (_ChartPalette.green, 'Published'),
            ],
          ),
          const SizedBox(height: 8),
          if (points.isEmpty)
            _emptyState()
          else
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  maxY: (maxY * 1.4).toDouble(),
                  alignment: BarChartAlignment.spaceAround,
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: math.max(1, maxY / 4),
                    getDrawingHorizontalLine: (_) =>
                        const FlLine(color: Color(0x1A4A6581), strokeWidth: 1),
                  ),
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
                        interval: math.max(1, maxY / 4).toDouble(),
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
                          final index = value.toInt();
                          if (index < 0 || index >= points.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _monthLabel(points[index].month),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF72869B),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barGroups: [
                    for (var i = 0; i < points.length; i++)
                      BarChartGroupData(
                        x: i,
                        barsSpace: 4,
                        barRods: [
                          BarChartRodData(
                            toY: points[i].createdCourses.toDouble(),
                            width: 10,
                            color: _ChartPalette.blue,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          BarChartRodData(
                            toY: points[i].publishedCourses.toDouble(),
                            width: 10,
                            color: _ChartPalette.green,
                            borderRadius: BorderRadius.circular(4),
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

  Widget _buildCourseTypeCard(BuilderDataCenterData data) {
    final total = data.courseTypes.fold<int>(
      0,
      (sum, point) => sum + point.count,
    );
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('课程类型分布', 'Course Type Distribution'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _tr('按学科/标签统计课程占比', 'Share of courses by subject/tag'),
            style: const TextStyle(fontSize: 12, color: Color(0xFF6F859A)),
          ),
          const SizedBox(height: 12),
          if (data.courseTypes.isEmpty)
            _emptyState()
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SizedBox(
                    height: 230,
                    child: PieChart(
                      PieChartData(
                        centerSpaceRadius: 44,
                        sectionsSpace: 2,
                        sections: [
                          for (var i = 0; i < data.courseTypes.length; i++)
                            PieChartSectionData(
                              value: data.courseTypes[i].count.toDouble(),
                              color: _pieColors[i % _pieColors.length],
                              title: total == 0
                                  ? '0%'
                                  : '${((data.courseTypes[i].count / total) * 100).toStringAsFixed(0)}%',
                              titleStyle: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                              radius: 64,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    children: [
                      for (var i = 0; i < data.courseTypes.length; i++)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
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
                                  data.courseTypes[i].type,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF4F667C),
                                  ),
                                ),
                              ),
                              Text(
                                '${data.courseTypes[i].count}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF22384D),
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
        ],
      ),
    );
  }

  Widget _buildIncomeOverviewCard(BuilderDataCenterData data) {
    final points = data.incomeOverview;
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('收入概览趋势', 'Income Overview Trend'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _tr(
              '基于课程价格与观看数据的估算收入',
              'Estimated income from pricing and published audience',
            ),
            style: const TextStyle(fontSize: 12, color: Color(0xFF6F859A)),
          ),
          const SizedBox(height: 12),
          if (points.isEmpty)
            _emptyState()
          else
            TrendChart(
              height: 250,
              labels: [for (final point in points) _monthLabel(point.month)],
              series: [
                TrendLineSeries(
                  name: t.dashRevenueLegend,
                  color: _ChartPalette.orange,
                  values: points.map((point) => point.amount).toList(),
                  showArea: true,
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildLearningProgressCard(BuilderDataCenterData data) {
    final points = data.learningProgression;
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('学习进度追踪', 'Learning Progression Tracking'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _tr(
              '显示整体完成率与学习活跃度变化',
              'Shows overall completion and learner engagement trends',
            ),
            style: const TextStyle(fontSize: 12, color: Color(0xFF6F859A)),
          ),
          const SizedBox(height: 12),
          _legendRow(
            items: [
              (_ChartPalette.cyan, _tr('完成率', 'Completion')),
              (_ChartPalette.purple, _tr('学习活跃度', 'Engagement')),
            ],
          ),
          const SizedBox(height: 8),
          if (points.isEmpty)
            _emptyState()
          else
            TrendChart(
              height: 250,
              labels: [for (final point in points) _monthLabel(point.month)],
              series: [
                TrendLineSeries(
                  name: t.dashCompletionLegend,
                  color: _ChartPalette.cyan,
                  values: points.map((point) => point.completionRate).toList(),
                  showArea: true,
                ),
                TrendLineSeries(
                  name: _tr('学习活跃度', 'Engagement'),
                  color: _ChartPalette.purple,
                  values: points.map((point) => point.engagementRate).toList(),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildPublishedViewersCard(BuilderDataCenterData data) {
    final rows = data.publishedAudience.take(8).toList();
    final maxViewers = rows.fold<int>(1, (m, row) => math.max(m, row.viewers));

    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('已发布课程观看人数', 'Published Course Viewers'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _tr(
              '按课程对比观看人数（已发布课程）',
              'Viewer comparison across published courses',
            ),
            style: const TextStyle(fontSize: 12, color: Color(0xFF6F859A)),
          ),
          const SizedBox(height: 12),
          if (rows.isEmpty)
            _emptyState()
          else
            SizedBox(
              height: 280,
              child: BarChart(
                BarChartData(
                  maxY: (maxViewers * 1.2).toDouble(),
                  alignment: BarChartAlignment.spaceAround,
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: math.max(1, maxViewers / 4),
                    getDrawingHorizontalLine: (_) =>
                        const FlLine(color: Color(0x1A4A6581), strokeWidth: 1),
                  ),
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
                        reservedSize: 36,
                        interval: math.max(1, maxViewers / 4).toDouble(),
                        getTitlesWidget: (value, _) => Text(
                          _compact(value.toInt()),
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
                          final index = value.toInt();
                          if (index < 0 || index >= rows.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _shortTitle(rows[index].title),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF72869B),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barGroups: [
                    for (var i = 0; i < rows.length; i++)
                      BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: rows[i].viewers.toDouble(),
                            width: 18,
                            borderRadius: BorderRadius.circular(6),
                            gradient: const LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Color(0xFF4D7CFF), Color(0xFF00A6C8)],
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

  Widget _buildPublishedCourseTable(BuilderDataCenterData data) {
    final rows = data.publishedAudience;
    return DashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('发布课程明细', 'Published Course Breakdown'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          if (rows.isEmpty)
            _emptyState()
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  DataColumn(label: Text(t.dashTableCourseName)),
                  DataColumn(label: Text(t.dashTableViews)),
                  DataColumn(label: Text(_tr('反馈数', 'Feedback'))),
                  DataColumn(label: Text(t.dashTableCompletion)),
                  DataColumn(label: Text(_tr('预计收入', 'Estimated Income'))),
                  DataColumn(label: Text(t.dashTableUpdated)),
                ],
                rows: [
                  for (final row in rows)
                    DataRow(
                      cells: [
                        DataCell(
                          SizedBox(
                            width: 200,
                            child: Text(
                              row.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        DataCell(Text(_formatNumber(row.viewers))),
                        DataCell(Text('${row.feedbackCount}')),
                        DataCell(
                          Text(
                            '${(row.completionRate * 100).toStringAsFixed(1)}%',
                          ),
                        ),
                        DataCell(Text(_currency(row.estimatedIncome))),
                        DataCell(Text(_dateLabel(row.updatedAt))),
                      ],
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBuilderInsightsCard(BuilderDataCenterData data) {
    final topType = data.courseTypes.isEmpty
        ? '-'
        : data.courseTypes.first.type;
    final topCourse = data.publishedAudience.isEmpty
        ? '-'
        : data.publishedAudience.first.title;
    final publishRatio = data.totalCourses == 0
        ? 0.0
        : (data.publishedCourses / data.totalCourses) * 100;
    final avgViewers = data.publishedAudience.isEmpty
        ? 0
        : (data.estimatedPublishedViewers / data.publishedAudience.length)
              .round();

    return DashboardCard(
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF6FBFF), Color(0xFFF4FFF6)],
      ),
      borderColor: const Color(0x2D4D7CFF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _tr('Builder 智能洞察', 'Builder Insights'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _insightPill(
                label: _tr('主力课程类型', 'Top Course Type'),
                value: topType,
                color: _ChartPalette.blue,
              ),
              _insightPill(
                label: _tr('发布率', 'Publish Rate'),
                value: '${publishRatio.toStringAsFixed(1)}%',
                color: _ChartPalette.green,
              ),
              _insightPill(
                label: _tr('平均观看人数', 'Avg Viewers/Course'),
                value: _formatNumber(avgViewers),
                color: _ChartPalette.cyan,
              ),
              _insightPill(
                label: _tr('最高观看课程', 'Top Viewed Course'),
                value: _shortTitle(topCourse, maxChars: 20),
                color: _ChartPalette.orange,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _insightPill({
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      width: 210,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.26)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF5F7488)),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1F3347),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Text(
        t.dashNoData,
        style: const TextStyle(fontSize: 13, color: Color(0xFF73869D)),
      ),
    );
  }

  Widget _legendRow({required List<(Color, String)> items}) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        for (final item in items)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: item.$1,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                item.$2,
                style: const TextStyle(fontSize: 11, color: Color(0xFF64798E)),
              ),
            ],
          ),
      ],
    );
  }

  Future<void> _exportCsv(
    BuildContext context,
    BuilderDataCenterData data,
  ) async {
    final csv = StringBuffer()
      ..writeln(
        'course,viewers,feedback_count,completion_percent,estimated_income,updated_at',
      );

    for (final row in data.publishedAudience) {
      csv.writeln(
        '"${row.title.replaceAll('"', '""')}",${row.viewers},${row.feedbackCount},'
        '${(row.completionRate * 100).toStringAsFixed(2)},'
        '${row.estimatedIncome.toStringAsFixed(2)},${row.updatedAt.toIso8601String()}',
      );
    }

    await Clipboard.setData(ClipboardData(text: csv.toString()));
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          t.isZh
              ? '${t.dashExportDone} · 已复制到剪贴板'
              : '${t.dashExportDone} · Copied to clipboard',
        ),
      ),
    );
  }

  String _publishRateLabel(BuilderDataCenterData data) {
    if (data.totalCourses == 0) return '0%';
    final ratio = (data.publishedCourses / data.totalCourses) * 100;
    return '${ratio.toStringAsFixed(1)}%';
  }

  String _shortTitle(String title, {int maxChars = 10}) {
    final cleaned = title.trim();
    if (cleaned.length <= maxChars) return cleaned;
    return '${cleaned.substring(0, maxChars)}…';
  }

  String _monthLabel(DateTime date) => '${date.month}/${date.year % 100}';

  String _dateLabel(DateTime date) => '${date.month}/${date.day}';

  String _currency(double value) => '\$${value.toStringAsFixed(0)}';

  String _formatNumber(int value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}K';
    return '$value';
  }

  String _compact(int value) {
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}k';
    return '$value';
  }
}

class _DataCenterSkeleton extends StatelessWidget {
  const _DataCenterSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _Sk(height: 86),
        SizedBox(height: 12),
        _Sk(height: 150),
        SizedBox(height: 12),
        _Sk(height: 280),
        SizedBox(height: 12),
        _Sk(height: 280),
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

class _ChartPalette {
  static const blue = Color(0xFF4D7CFF);
  static const green = Color(0xFF58CC02);
  static const orange = Color(0xFFFF9800);
  static const cyan = Color(0xFF00A6C8);
  static const purple = Color(0xFF7D5FFF);
}

const _pieColors = [
  _ChartPalette.blue,
  _ChartPalette.green,
  _ChartPalette.orange,
  _ChartPalette.purple,
  _ChartPalette.cyan,
];
