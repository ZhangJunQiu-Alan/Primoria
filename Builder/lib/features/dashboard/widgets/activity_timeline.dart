import 'package:flutter/material.dart';

class ActivityTimelineItem {
  const ActivityTimelineItem({
    required this.title,
    required this.description,
    required this.timeLabel,
    required this.icon,
    required this.iconColor,
  });

  final String title;
  final String description;
  final String timeLabel;
  final IconData icon;
  final Color iconColor;
}

class ActivityTimeline extends StatelessWidget {
  const ActivityTimeline({
    super.key,
    required this.items,
    this.emptyText,
    this.trailing,
  });

  final List<ActivityTimelineItem> items;
  final String? emptyText;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: const Color(0xFFF6FAFF),
          border: Border.all(color: const Color(0x243E5A74)),
        ),
        child: Text(
          emptyText ?? 'No activity',
          style: const TextStyle(fontSize: 13, color: Color(0xFF7E8FA0)),
        ),
      );
    }

    return Column(
      children: [
        for (var index = 0; index < items.length; index++)
          _TimelineRow(item: items[index], isLast: index == items.length - 1),
        if (trailing != null) ...[const SizedBox(height: 8), trailing!],
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.item, required this.isLast});

  final ActivityTimelineItem item;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: item.iconColor.withValues(alpha: 0.16),
                shape: BoxShape.circle,
              ),
              child: Icon(item.icon, size: 14, color: item.iconColor),
            ),
            if (!isLast)
              Container(width: 2, height: 40, color: const Color(0x243E5A74)),
          ],
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF213245),
                        ),
                      ),
                    ),
                    Text(
                      item.timeLabel,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF8090A2),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF5C7087),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
