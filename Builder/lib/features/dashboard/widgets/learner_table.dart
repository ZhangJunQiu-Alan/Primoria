import 'package:flutter/material.dart';

class LearnerTableRow {
  const LearnerTableRow({
    required this.id,
    required this.username,
    required this.avatarUrl,
    required this.registeredAt,
    required this.learnedCourses,
    required this.totalStudyMinutes,
    required this.lastActive,
    required this.tags,
  });

  final String id;
  final String username;
  final String? avatarUrl;
  final String registeredAt;
  final int learnedCourses;
  final int totalStudyMinutes;
  final String lastActive;
  final List<String> tags;
}

class LearnerTable extends StatelessWidget {
  const LearnerTable({
    super.key,
    required this.rows,
    required this.selectedIds,
    required this.onToggleRow,
    required this.emptyText,
    required this.page,
    required this.total,
    required this.pageSize,
    required this.onPageChanged,
  });

  final List<LearnerTableRow> rows;
  final Set<String> selectedIds;
  final ValueChanged<String> onToggleRow;
  final String emptyText;
  final int page;
  final int total;
  final int pageSize;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.of(context).size.width < 900;
    if (rows.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: const Color(0xFFF7FBFF),
          border: Border.all(color: const Color(0x244A6581)),
        ),
        child: Text(
          emptyText,
          style: const TextStyle(color: Color(0xFF76889A), fontSize: 13),
        ),
      );
    }

    if (compact) {
      return Column(
        children: [
          for (final row in rows)
            _LearnerMobileCard(
              row: row,
              selected: selectedIds.contains(row.id),
              onToggle: () => onToggleRow(row.id),
            ),
          _TablePager(
            page: page,
            total: total,
            pageSize: pageSize,
            onPageChanged: onPageChanged,
          ),
        ],
      );
    }

    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowHeight: 42,
            columnSpacing: 24,
            horizontalMargin: 12,
            columns: const [
              DataColumn(label: SizedBox(width: 36)),
              DataColumn(label: Text('User')),
              DataColumn(label: Text('Registered')),
              DataColumn(label: Text('Courses')),
              DataColumn(label: Text('Study Time')),
              DataColumn(label: Text('Last Active')),
              DataColumn(label: Text('Tags')),
            ],
            rows: [
              for (final row in rows)
                DataRow(
                  selected: selectedIds.contains(row.id),
                  onSelectChanged: (_) => onToggleRow(row.id),
                  cells: [
                    DataCell(
                      Checkbox(
                        value: selectedIds.contains(row.id),
                        onChanged: (_) => onToggleRow(row.id),
                      ),
                    ),
                    DataCell(
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: const Color(0xFFDDE8F5),
                            backgroundImage: row.avatarUrl != null
                                ? NetworkImage(row.avatarUrl!)
                                : null,
                            child: row.avatarUrl == null
                                ? Text(
                                    row.username.isNotEmpty
                                        ? row.username
                                              .substring(0, 1)
                                              .toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF47607A),
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 10),
                          Text(row.username),
                        ],
                      ),
                    ),
                    DataCell(Text(row.registeredAt)),
                    DataCell(Text('${row.learnedCourses}')),
                    DataCell(Text('${row.totalStudyMinutes} min')),
                    DataCell(Text(row.lastActive)),
                    DataCell(
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          for (final tag in row.tags)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0x1A4D7CFF),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                tag,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF3C62B5),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
        _TablePager(
          page: page,
          total: total,
          pageSize: pageSize,
          onPageChanged: onPageChanged,
        ),
      ],
    );
  }
}

class _LearnerMobileCard extends StatelessWidget {
  const _LearnerMobileCard({
    required this.row,
    required this.selected,
    required this.onToggle,
  });

  final LearnerTableRow row;
  final bool selected;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Colors.white,
        border: Border.all(
          color: selected ? const Color(0xFF4D7CFF) : const Color(0x244A6581),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Checkbox(value: selected, onChanged: (_) => onToggle()),
              CircleAvatar(
                radius: 15,
                backgroundColor: const Color(0xFFDDE8F5),
                backgroundImage: row.avatarUrl != null
                    ? NetworkImage(row.avatarUrl!)
                    : null,
                child: row.avatarUrl == null
                    ? Text(
                        row.username.isNotEmpty
                            ? row.username.substring(0, 1).toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF47607A),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  row.username,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E2D3B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _KvLine(label: 'Registered', value: row.registeredAt),
          _KvLine(label: 'Courses', value: '${row.learnedCourses}'),
          _KvLine(label: 'Study', value: '${row.totalStudyMinutes} min'),
          _KvLine(label: 'Last Active', value: row.lastActive),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              for (final tag in row.tags)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x1A4D7CFF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    tag,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF3C62B5),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KvLine extends StatelessWidget {
  const _KvLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: const TextStyle(fontSize: 12, color: Color(0xFF7890A8)),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF34495F),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TablePager extends StatelessWidget {
  const _TablePager({
    required this.page,
    required this.total,
    required this.pageSize,
    required this.onPageChanged,
  });

  final int page;
  final int total;
  final int pageSize;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    final totalPages = (total / pageSize).ceil().clamp(1, 9999);

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        children: [
          Text(
            'Page ${page + 1} / $totalPages',
            style: const TextStyle(fontSize: 12, color: Color(0xFF73879E)),
          ),
          const Spacer(),
          IconButton(
            onPressed: page <= 0 ? null : () => onPageChanged(page - 1),
            icon: const Icon(Icons.chevron_left),
            visualDensity: VisualDensity.compact,
          ),
          IconButton(
            onPressed: page >= totalPages - 1
                ? null
                : () => onPageChanged(page + 1),
            icon: const Icon(Icons.chevron_right),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
