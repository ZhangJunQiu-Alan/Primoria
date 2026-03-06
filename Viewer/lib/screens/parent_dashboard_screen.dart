import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/supabase_service.dart';
import '../theme/theme.dart';
import '../utils/role_routes.dart';
import 'profile_settings_screen.dart';

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final _bindingCodeController = TextEditingController();
  int _reportRequestId = 0;

  List<Map<String, dynamic>> _children = const [];
  Map<String, dynamic>? _selectedChild;
  Map<String, dynamic>? _report;
  bool _loadingOverview = true;
  bool _loadingReport = false;
  bool _binding = false;
  bool _unbinding = false;
  String? _overviewError;
  String? _reportError;

  @override
  void initState() {
    super.initState();
    _loadOverview();
  }

  @override
  void dispose() {
    _bindingCodeController.dispose();
    super.dispose();
  }

  Future<void> _loadOverview({String? preferredChildId}) async {
    setState(() {
      _loadingOverview = true;
      _overviewError = null;
      _reportError = null;
    });

    final children = await SupabaseService.getParentChildrenOverview();
    if (!mounted) return;

    final resolvedChildId =
        preferredChildId ?? (_selectedChild?['child_id'] as String?);
    Map<String, dynamic>? selected;
    if (children.isNotEmpty) {
      for (final child in children) {
        if (child['child_id'] == resolvedChildId) {
          selected = child;
          break;
        }
      }
      selected ??= children.first;
    }

    setState(() {
      _children = children;
      _selectedChild = selected;
      if (selected == null) {
        _report = null;
      }
      _loadingOverview = false;
      _overviewError =
          children.isEmpty && SupabaseService.lastOperationError != null
          ? SupabaseService.lastOperationError
          : null;
    });

    if (selected != null) {
      await _loadReport(selected['child_id'] as String);
    } else {
      setState(() {
        _report = null;
        _reportError = null;
      });
    }
  }

  Future<void> _loadReport(String childId) async {
    final requestId = ++_reportRequestId;
    setState(() {
      _loadingReport = true;
      _report = null;
      _reportError = null;
    });

    final report = await SupabaseService.getParentChildReport(childId);
    if (!mounted || requestId != _reportRequestId) return;

    final stillSelected = _selectedChild?['child_id'] == childId;
    if (!stillSelected) return;

    setState(() {
      _report = report;
      _loadingReport = false;
      _reportError = report == null ? SupabaseService.lastOperationError : null;
    });
  }

  Future<void> _bindChild(AppLocalizations t) async {
    final rawCode = _bindingCodeController.text.trim();
    if (rawCode.isEmpty) {
      _showSnackBar(t.parentBindCodeHint);
      return;
    }

    setState(() => _binding = true);
    final result = await SupabaseService.bindChildWithCode(rawCode);
    if (!mounted) return;
    setState(() => _binding = false);

    if (result == null) {
      _showSnackBar(SupabaseService.lastOperationError ?? t.profileSaveFailed);
      return;
    }

    _bindingCodeController.clear();
    _showSnackBar(t.parentBindSuccess);
    await _loadOverview(preferredChildId: result['child_id'] as String?);
  }

  Future<void> _unbindSelectedChild(AppLocalizations t) async {
    final child = _selectedChild;
    if (child == null) return;

    setState(() => _unbinding = true);
    final success = await SupabaseService.unbindChild(
      child['child_id'] as String,
    );
    if (!mounted) return;
    setState(() => _unbinding = false);

    if (!success) {
      _showSnackBar(SupabaseService.lastOperationError ?? t.profileSaveFailed);
      return;
    }

    _showSnackBar(t.parentUnbindSuccess);
    await _loadOverview();
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openSettings() async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const ProfileSettingsScreen()),
    );
    if (updated == true && mounted) {
      await context.read<UserProvider>().refreshProfile();
    }
  }

  Future<void> _logout() async {
    await context.read<UserProvider>().logout();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(RoleRoutes.login, (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      appBar: AppBar(
        title: Text(t.parentDashboardTitle),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'settings') {
                _openSettings();
                return;
              }
              if (value == 'logout') {
                _logout();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'settings', child: Text(t.profileSettings)),
              PopupMenuItem(value: 'logout', child: Text(t.profileLogoutTitle)),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadOverview(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildSummary(t),
            const SizedBox(height: 16),
            _buildBindSection(t),
            const SizedBox(height: 16),
            _buildChildrenSection(t),
            const SizedBox(height: 16),
            _buildReportSection(t),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary(AppLocalizations t) {
    final totalXp = _children.fold<int>(
      0,
      (sum, child) => sum + _toInt(child['xp_points']),
    );
    final totalLessons = _children.fold<int>(
      0,
      (sum, child) => sum + _toInt(child['lessons_completed']),
    );

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF4F46E5), Color(0xFF9333EA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.parentDashboardTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t.parentChildrenCount(_children.length),
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _SummaryStat(
                  label: t.parentChildrenTitle,
                  value: '${_children.length}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryStat(label: t.parentStatXp, value: '$totalXp'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryStat(
                  label: t.parentStatLessons,
                  value: '$totalLessons',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBindSection(AppLocalizations t) {
    return _SectionCard(
      title: t.parentBindSectionTitle,
      subtitle: t.parentBindSectionBody,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _bindingCodeController,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: t.parentBindCodeLabel,
              hintText: t.parentBindCodeHint,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _binding ? null : () => _bindChild(t),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.indigo600,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _binding
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(t.parentBindSubmit),
          ),
        ],
      ),
    );
  }

  Widget _buildChildrenSection(AppLocalizations t) {
    return _SectionCard(
      title: t.parentChildrenTitle,
      subtitle: t.parentChildrenCount(_children.length),
      child: _loadingOverview
          ? const Center(child: CircularProgressIndicator())
          : _children.isEmpty
          ? Text(
              _overviewError ?? t.parentChildrenEmpty,
              style: const TextStyle(color: Color(0xFF64748B)),
            )
          : Column(
              children: _children.map((child) {
                final isSelected =
                    child['child_id'] == _selectedChild?['child_id'];
                final avatarProvider = _networkImage(
                  child['avatar_url'] as String?,
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () async {
                      setState(() => _selectedChild = child);
                      await _loadReport(child['child_id'] as String);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.indigo50
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.indigo200
                              : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: AppColors.indigo100,
                            backgroundImage: avatarProvider,
                            child: avatarProvider == null
                                ? Text(
                                    _initials(child['username'] as String?),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.indigo,
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (child['username'] as String?)
                                              ?.trim()
                                              .isNotEmpty ==
                                          true
                                      ? child['username'] as String
                                      : 'Child',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${t.parentStatXp}: ${_toInt(child['xp_points'])} · ${t.parentStatStreak}: ${_toInt(child['streak_days'])}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            IconButton(
                              onPressed: _unbinding
                                  ? null
                                  : () => _unbindSelectedChild(t),
                              icon: _unbinding
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.link_off_rounded),
                              tooltip: t.parentUnbind,
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildReportSection(AppLocalizations t) {
    final child = _selectedChild;
    final stats = _asMap(_report?['stats']);
    final trend = _asList(_report?['activity_trend']);
    final courses = _asList(_report?['courses']);
    final recentLessons = _asList(_report?['recent_lessons']);

    return _SectionCard(
      title: child == null
          ? t.parentDashboardTitle
          : t.parentReportTitle((child['username'] as String?) ?? 'Child'),
      subtitle: child == null ? t.parentReportEmpty : t.parentReportTrendTitle,
      child: _loadingReport
          ? const Center(child: CircularProgressIndicator())
          : child == null
          ? Text(
              t.parentReportEmpty,
              style: const TextStyle(color: Color(0xFF64748B)),
            )
          : _report == null
          ? Text(
              _reportError ?? t.parentReportLoading,
              style: const TextStyle(color: Color(0xFF64748B)),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.parentReportStatsTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _ReportStatChip(
                      label: t.parentStatXp,
                      value: '${_toInt(stats?['total_xp'])}',
                    ),
                    _ReportStatChip(
                      label: t.parentStatStreak,
                      value: '${_toInt(stats?['current_streak'])}',
                    ),
                    _ReportStatChip(
                      label: t.parentStatLessons,
                      value: '${_toInt(stats?['lessons_completed'])}',
                    ),
                    _ReportStatChip(
                      label: t.parentStatCourses,
                      value: '${_toInt(stats?['courses_completed'])}',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  t.parentReportTrendTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                if (trend.isEmpty)
                  Text(
                    t.parentReportNoTrend,
                    style: const TextStyle(color: Color(0xFF64748B)),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: trend.take(7).map((entry) {
                      final item = Map<String, dynamic>.from(entry as Map);
                      final date = _shortDate(item['date']?.toString());
                      return Container(
                        width: 84,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            Text(
                              date,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${_toInt(item['xp_points'])} XP',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                const SizedBox(height: 20),
                Text(
                  t.parentReportCoursesTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                if (courses.isEmpty)
                  Text(
                    t.parentReportNoCourses,
                    style: const TextStyle(color: Color(0xFF64748B)),
                  )
                else
                  ...courses.take(5).map((entry) {
                    final course = Map<String, dynamic>.from(entry as Map);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text((course['title'] as String?) ?? 'Untitled'),
                      subtitle: Text(
                        '${course['status'] ?? 'in_progress'} · ${_toInt(course['progress_percentage'])}%',
                      ),
                    );
                  }),
                const SizedBox(height: 20),
                Text(
                  t.parentReportLessonsTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                if (recentLessons.isEmpty)
                  Text(
                    t.parentReportNoLessons,
                    style: const TextStyle(color: Color(0xFF64748B)),
                  )
                else
                  ...recentLessons.take(5).map((entry) {
                    final lesson = Map<String, dynamic>.from(entry as Map);
                    final accuracy = _lessonAccuracy(lesson);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        (lesson['lesson_title'] as String?) ?? 'Lesson',
                      ),
                      subtitle: Text(
                        '${t.parentStatAccuracy} $accuracy% · Score ${_toInt(lesson['score'])} · ${_shortDateTime(lesson['completed_at']?.toString())}',
                      ),
                    );
                  }),
              ],
            ),
    );
  }

  ImageProvider<Object>? _networkImage(String? url) {
    final value = url?.trim() ?? '';
    if (value.isEmpty) return null;
    return NetworkImage(value);
  }

  String _initials(String? name) {
    final value = name?.trim() ?? '';
    if (value.isEmpty) return 'C';
    return value.substring(0, 1).toUpperCase();
  }

  String _shortDate(String? raw) {
    final value = DateTime.tryParse(raw ?? '');
    if (value == null) return '--';
    return '${value.month}/${value.day}';
  }

  String _shortDateTime(String? raw) {
    final value = DateTime.tryParse(raw ?? '');
    if (value == null) return '--';
    return '${value.month}/${value.day} ${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  int _lessonAccuracy(Map<String, dynamic> lesson) {
    final correct = _toInt(lesson['correct_count']);
    final total = _toInt(lesson['total_count']);
    if (total > 0) {
      return ((correct / total) * 100).round();
    }
    return _toInt(lesson['score']);
  }

  Map<String, dynamic>? _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  List<dynamic> _asList(dynamic value) {
    if (value is List) return value;
    return const [];
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ],
      ),
    );
  }
}

class _ReportStatChip extends StatelessWidget {
  final String label;
  final String value;

  const _ReportStatChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
