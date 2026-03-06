import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class TrendLineSeries {
  const TrendLineSeries({
    required this.values,
    required this.color,
    required this.name,
    this.showArea = false,
  });

  final List<double> values;
  final Color color;
  final String name;
  final bool showArea;
}

class TrendChart extends StatelessWidget {
  const TrendChart({
    super.key,
    required this.series,
    this.height = 220,
    this.labels = const <String>[],
    this.showLeftTitles = true,
  });

  final List<TrendLineSeries> series;
  final double height;
  final List<String> labels;
  final bool showLeftTitles;

  @override
  Widget build(BuildContext context) {
    if (series.isEmpty || series.every((line) => line.values.isEmpty)) {
      return const SizedBox(height: 120);
    }

    final maxPoints = series
        .map((line) => line.values.length)
        .fold<int>(0, (acc, length) => math.max(acc, length));

    final allValues = <double>[for (final line in series) ...line.values];
    final maxY = allValues.isEmpty
        ? 1.0
        : (allValues.reduce(math.max) * 1.18).clamp(1.0, 999999.0);

    return SizedBox(
      height: height,
      child: LineChart(
        LineChartData(
          minY: 0,
          maxY: maxY,
          minX: 0,
          maxX: math.max(0, maxPoints - 1).toDouble(),
          gridData: FlGridData(
            show: true,
            horizontalInterval: maxY / 4,
            getDrawingHorizontalLine: (_) =>
                const FlLine(color: Color(0x1A4A6581), strokeWidth: 1),
            drawVerticalLine: false,
          ),
          borderData: FlBorderData(
            show: true,
            border: Border.all(color: const Color(0x1A415D77)),
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
                showTitles: showLeftTitles,
                interval: maxY / 4,
                reservedSize: 36,
                getTitlesWidget: (value, _) => Text(
                  value.round().toString(),
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF8492A0),
                  ),
                ),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: labels.isNotEmpty,
                interval: maxPoints > 8 ? (maxPoints / 4) : 1,
                getTitlesWidget: (value, _) {
                  final index = value.round();
                  if (index < 0 || index >= labels.length) {
                    return const SizedBox.shrink();
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      labels[index],
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF7A8EA4),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          lineTouchData: LineTouchData(
            handleBuiltInTouches: true,
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((spot) {
                  return LineTooltipItem(
                    spot.y.toStringAsFixed(1),
                    const TextStyle(
                      color: Color(0xFF1E2D3B),
                      fontWeight: FontWeight.w700,
                    ),
                  );
                }).toList();
              },
            ),
          ),
          lineBarsData: [
            for (final line in series)
              LineChartBarData(
                isCurved: true,
                barWidth: 2.6,
                color: line.color,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: line.showArea,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      line.color.withValues(alpha: 0.22),
                      line.color.withValues(alpha: 0.02),
                    ],
                  ),
                ),
                spots: [
                  for (var i = 0; i < line.values.length; i++)
                    FlSpot(i.toDouble(), line.values[i]),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class MiniSparkline extends StatelessWidget {
  const MiniSparkline({
    super.key,
    required this.values,
    required this.color,
    this.height = 46,
  });

  final List<double> values;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return TrendChart(
      series: [
        TrendLineSeries(
          values: values,
          color: color,
          name: 'spark',
          showArea: true,
        ),
      ],
      height: height,
      showLeftTitles: false,
    );
  }
}
