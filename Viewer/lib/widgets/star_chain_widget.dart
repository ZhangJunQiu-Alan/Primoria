import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';

/// Weekly 7-star chain widget.
/// [activeDates] is a Set of 'yyyy-MM-dd' strings where the user completed
/// at least one lesson.
class StarChainWidget extends StatefulWidget {
  final Set<String> activeDates;
  /// If true, renders a compact single-row version (used on result screen).
  final bool compact;

  const StarChainWidget({
    super.key,
    required this.activeDates,
    this.compact = false,
  });

  @override
  State<StarChainWidget> createState() => _StarChainWidgetState();
}

class _StarChainWidgetState extends State<StarChainWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  // Returns Monday of the current ISO week.
  DateTime _weekStart() {
    final now = DateTime.now().toLocal();
    return now.subtract(Duration(days: now.weekday - 1));
  }

  String _dateKey(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  bool _isToday(DateTime dt) {
    final now = DateTime.now().toLocal();
    return dt.year == now.year &&
        dt.month == now.month &&
        dt.day == now.day;
  }

  bool _isFuture(DateTime dt) =>
      dt.isAfter(DateTime.now().toLocal());

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    final monday = _weekStart();
    final days = List.generate(7, (i) => monday.add(Duration(days: i)));
    final labels = t.weekDayLabels;
    final isAllDone = days.every(
      (d) => !_isFuture(d) && widget.activeDates.contains(_dateKey(d)),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(7, (i) {
            final day = days[i];
            final key = _dateKey(day);
            final active = widget.activeDates.contains(key);
            final today = _isToday(day);
            final future = _isFuture(day);
            return _StarDay(
              label: labels[i],
              active: active,
              isToday: today,
              isFuture: future,
              isAllDone: isAllDone,
              pulseAnim: _pulseAnim,
              compact: widget.compact,
            );
          }),
        ),
        if (isAllDone && !widget.compact) ...[
          const SizedBox(height: 8),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFF59E0B), Color(0xFF10B981)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                t.starChainComplete,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _StarDay extends StatelessWidget {
  final String label;
  final bool active;
  final bool isToday;
  final bool isFuture;
  final bool isAllDone;
  final Animation<double> pulseAnim;
  final bool compact;

  const _StarDay({
    required this.label,
    required this.active,
    required this.isToday,
    required this.isFuture,
    required this.isAllDone,
    required this.pulseAnim,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    final starSize = compact ? 22.0 : 28.0;

    Widget star;
    if (active && isAllDone) {
      // Rainbow when week is perfect
      star = ShaderMask(
        shaderCallback: (bounds) => const LinearGradient(
          colors: [
            Color(0xFFF59E0B),
            Color(0xFF10B981),
            Color(0xFF6366F1),
          ],
        ).createShader(bounds),
        child: Icon(Icons.star_rounded, size: starSize, color: Colors.white),
      );
    } else if (active) {
      star = Icon(
        Icons.star_rounded,
        size: starSize,
        color: const Color(0xFFF59E0B),
      );
    } else if (isToday && !isFuture) {
      // Today not yet lit — pulsing outline
      star = AnimatedBuilder(
        animation: pulseAnim,
        builder: (_, __) => Transform.scale(
          scale: pulseAnim.value,
          child: Icon(
            Icons.star_border_rounded,
            size: starSize,
            color: const Color(0xFFF59E0B),
          ),
        ),
      );
    } else {
      // Future or past-missed
      star = Icon(
        Icons.star_border_rounded,
        size: starSize,
        color: isFuture
            ? const Color(0xFFCBD5E1)
            : const Color(0xFFCBD5E1),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        star,
        if (!compact) ...[
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isToday ? FontWeight.w700 : FontWeight.normal,
              color: isToday
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFF94A3B8),
            ),
          ),
        ],
      ],
    );
  }
}
