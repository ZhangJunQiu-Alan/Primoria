import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import '../widgets/kpi_card.dart';

enum _CourseStatusFilter { all, draft, published }

class DashboardCourseManageTab extends StatefulWidget {
  const DashboardCourseManageTab({
    super.key,
    required this.t,
    required this.isLoggedIn,
    required this.isLoading,
    required this.loadError,
    required this.courses,
    required this.courseLessons,
    required this.sortOrder,
    required this.onSortChanged,
    required this.onRefresh,
    required this.onSignIn,
    required this.onCreateCourse,
    required this.onOpenCourse,
    required this.onEditCourse,
    required this.onDeleteCourse,
    required this.onOpenLesson,
    required this.onDeleteLesson,
    required this.onAddLesson,
    required this.onEnsureLessonsLoaded,
    required this.formatLessonTitle,
  });

  final BuilderLocalizations t;
  final bool isLoggedIn;
  final bool isLoading;
  final String? loadError;
  final List<Map<String, dynamic>> courses;
  final Map<String, List<String>> courseLessons;
  final String sortOrder;

  final ValueChanged<String> onSortChanged;
  final Future<void> Function() onRefresh;
  final VoidCallback onSignIn;
  final VoidCallback onCreateCourse;
  final void Function(String courseId, String courseTitle) onOpenCourse;
  final ValueChanged<Map<String, dynamic>> onEditCourse;
  final void Function(String courseId, String title) onDeleteCourse;
  final void Function(
    String courseId,
    String courseTitle,
    int lessonIndex,
    String lessonTitle,
  )
  onOpenLesson;
  final void Function(String courseId, int lessonIndex, String lessonTitle)
  onDeleteLesson;
  final void Function(String courseId, String courseTitle) onAddLesson;
  final Future<void> Function(String courseId) onEnsureLessonsLoaded;
  final String Function(String rawTitle, String courseTitle) formatLessonTitle;

  @override
  State<DashboardCourseManageTab> createState() =>
      _DashboardCourseManageTabState();
}

class _DashboardCourseManageTabState extends State<DashboardCourseManageTab> {
  final TextEditingController _searchController = TextEditingController();
  _CourseStatusFilter _statusFilter = _CourseStatusFilter.all;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final media = MediaQuery.of(context);
    final viewportWidth = media.size.width;
    final compact = viewportWidth < 980;

    if (!widget.isLoggedIn) {
      return _buildSignInPrompt(t);
    }

    if (widget.isLoading) {
      return const _CourseManageLoadingState();
    }

    if (widget.loadError != null && widget.courses.isEmpty) {
      return _buildErrorState(widget.loadError!, t);
    }

    if (widget.courses.isEmpty) {
      return _buildEmptyCourses(t);
    }

    final filteredCourses = _buildFilteredCourses();
    final metrics = _computeSummaryMetrics();

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1440),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(t, compact),
            const SizedBox(height: 14),
            _buildSummaryStrip(metrics, t),
            const SizedBox(height: 14),
            _buildControls(t),
            if (widget.loadError != null) ...[
              const SizedBox(height: 14),
              _buildInlineError(widget.loadError!, t),
            ],
            const SizedBox(height: 16),
            if (filteredCourses.isEmpty)
              _buildNoResultsState(t)
            else
              Column(
                children: [
                  for (int i = 0; i < filteredCourses.length; i++) ...[
                    _buildCourseCard(filteredCourses[i], t),
                    if (i != filteredCourses.length - 1)
                      const SizedBox(height: 16),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _buildFilteredCourses() {
    final query = _searchController.text.trim().toLowerCase();

    return widget.courses.where((course) {
      final status = (course['status'] as String? ?? 'draft').toLowerCase();
      final statusMatch = switch (_statusFilter) {
        _CourseStatusFilter.all => true,
        _CourseStatusFilter.draft => status == 'draft',
        _CourseStatusFilter.published => status == 'published',
      };
      if (!statusMatch) return false;

      if (query.isEmpty) return true;
      final title = (course['title'] as String? ?? '').toLowerCase();
      final description = (course['description'] as String? ?? '')
          .toLowerCase();
      final courseId = course['id'] as String? ?? '';
      final lessons = widget.courseLessons[courseId] ?? const <String>[];
      final lessonMatch = lessons.any(
        (lesson) => lesson.toLowerCase().contains(query),
      );
      return title.contains(query) ||
          description.contains(query) ||
          lessonMatch;
    }).toList();
  }

  _CourseManageSummary _computeSummaryMetrics() {
    var totalLessons = 0;
    var published = 0;
    var drafts = 0;
    var emptyCourses = 0;

    for (final course in widget.courses) {
      final courseId = course['id'] as String? ?? '';
      final lessons = widget.courseLessons[courseId];
      if (lessons != null) {
        totalLessons += lessons.length;
        if (lessons.isEmpty) emptyCourses += 1;
      }

      final status = (course['status'] as String? ?? 'draft').toLowerCase();
      if (status == 'published') {
        published += 1;
      } else {
        drafts += 1;
      }
    }

    return _CourseManageSummary(
      totalCourses: widget.courses.length,
      totalLessons: totalLessons,
      publishedCourses: published,
      draftCourses: drafts,
      emptyCourses: emptyCourses,
    );
  }

  Widget _buildHeader(BuilderLocalizations t, bool compact) {
    return DashboardCard(
      padding: const EdgeInsets.all(22),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF2F8FF), Color(0xFFEFFAF2)],
      ),
      borderColor: const Color(0x334D7CFF),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wrapActions = compact || constraints.maxWidth < 880;

          final actionButtons = Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: widget.onCreateCourse,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(t.createCourse),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4D7CFF),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              IconButton(
                tooltip: t.courseManageRefresh,
                onPressed: () => widget.onRefresh(),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          );

          if (wrapActions) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.courseManageTitle,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E2D3B),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  t.courseManageSubtitle,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF5C6F84),
                  ),
                ),
                const SizedBox(height: 14),
                actionButtons,
              ],
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.courseManageTitle,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E2D3B),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      t.courseManageSubtitle,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF5C6F84),
                      ),
                    ),
                  ],
                ),
              ),
              actionButtons,
            ],
          );
        },
      ),
    );
  }

  Widget _buildSummaryStrip(
    _CourseManageSummary summary,
    BuilderLocalizations t,
  ) {
    final cards = [
      _SummaryMetric(
        icon: Icons.menu_book_rounded,
        label: t.courseManageSummaryCourses,
        value: '${summary.totalCourses}',
        color: const Color(0xFF4D7CFF),
      ),
      _SummaryMetric(
        icon: Icons.view_list_rounded,
        label: t.courseManageSummaryLessons,
        value: '${summary.totalLessons}',
        color: const Color(0xFF58CC02),
      ),
      _SummaryMetric(
        icon: Icons.publish_rounded,
        label: t.courseManageSummaryPublished,
        value: '${summary.publishedCourses}',
        color: const Color(0xFF10B981),
      ),
      _SummaryMetric(
        icon: Icons.edit_note_rounded,
        label: t.courseManageSummaryDraft,
        value: '${summary.draftCourses}',
        color: const Color(0xFFF59E0B),
      ),
      _SummaryMetric(
        icon: Icons.warning_amber_rounded,
        label: t.courseManageSummaryNeedContent,
        value: '${summary.emptyCourses}',
        color: const Color(0xFFEF4444),
      ),
    ];

    return DashboardCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: cards.map((card) {
          return SizedBox(width: 220, child: card);
        }).toList(),
      ),
    );
  }

  Widget _buildControls(BuilderLocalizations t) {
    return DashboardCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 280,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                isDense: true,
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                hintText: t.courseManageSearchPlaceholder,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          setState(() {
                            _searchController.clear();
                          });
                        },
                        icon: const Icon(Icons.close_rounded, size: 16),
                      ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          ChoiceChip(
            label: Text(t.courseManageFilterAll),
            selected: _statusFilter == _CourseStatusFilter.all,
            onSelected: (_) =>
                setState(() => _statusFilter = _CourseStatusFilter.all),
          ),
          ChoiceChip(
            label: Text(t.courseManageFilterDraft),
            selected: _statusFilter == _CourseStatusFilter.draft,
            onSelected: (_) =>
                setState(() => _statusFilter = _CourseStatusFilter.draft),
          ),
          ChoiceChip(
            label: Text(t.courseManageFilterPublished),
            selected: _statusFilter == _CourseStatusFilter.published,
            onSelected: (_) =>
                setState(() => _statusFilter = _CourseStatusFilter.published),
          ),
          PopupMenuButton<String>(
            onSelected: widget.onSortChanged,
            itemBuilder: (_) => [
              PopupMenuItem(value: 'time', child: Text(t.sortByTime)),
              PopupMenuItem(value: 'student', child: Text(t.sortByStudent)),
              PopupMenuItem(value: 'comments', child: Text(t.sortByComments)),
            ],
            child: OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.swap_vert_rounded, size: 18),
              label: Text(_sortLabel(widget.sortOrder, t)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseCard(Map<String, dynamic> course, BuilderLocalizations t) {
    final courseId = course['id'] as String;
    final title = (course['title'] as String? ?? 'Untitled').trim();
    final description = (course['description'] as String? ?? '').trim();
    final status = (course['status'] as String? ?? 'draft').toLowerCase();
    final difficulty = (course['difficulty_level'] as String? ?? 'beginner')
        .toLowerCase();
    final estimatedMinutes = (course['estimated_minutes'] as int?) ?? 0;
    final priceTier = (course['price_tier'] as String? ?? 'free').toLowerCase();
    final price = (course['price'] as num?)?.toDouble() ?? 0;
    final updatedAgo = _formatTimeAgo(course['updated_at'] as String?, t);

    if (!widget.courseLessons.containsKey(courseId)) {
      widget.onEnsureLessonsLoaded(courseId);
    }
    final lessonTitles = widget.courseLessons[courseId];
    final loadingLessons = lessonTitles == null;
    final lessons = lessonTitles ?? const <String>[];

    return DashboardCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 960;

              final summary = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E2D3B),
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 10),
                      _StatusChip(status: status, t: t),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (updatedAgo.isNotEmpty)
                    Text(
                      updatedAgo,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF607086),
                      ),
                    ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF4B5E73),
                        height: 1.35,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _MetaChip(
                        icon: Icons.tune_rounded,
                        label: _difficultyLabel(difficulty, t),
                      ),
                      _MetaChip(
                        icon: Icons.schedule_rounded,
                        label: _durationLabel(estimatedMinutes, t),
                      ),
                      _MetaChip(
                        icon: Icons.attach_money_rounded,
                        label: _priceLabel(priceTier, price, t),
                      ),
                      _MetaChip(
                        icon: Icons.view_list_rounded,
                        label: t.lessonCount(lessons.length),
                      ),
                    ],
                  ),
                ],
              );

              final actions = Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: () => widget.onOpenCourse(courseId, title),
                    icon: const Icon(Icons.open_in_new_rounded, size: 16),
                    label: Text(t.courseManageOpenBuilder),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFEAF1FF),
                      foregroundColor: const Color(0xFF2A4E8F),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => widget.onEditCourse(course),
                    icon: const Icon(Icons.edit_rounded, size: 16),
                    label: Text(t.courseEdit),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => widget.onDeleteCourse(courseId, title),
                    icon: const Icon(Icons.delete_outline_rounded, size: 16),
                    label: Text(t.courseDelete),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFB42318),
                      side: const BorderSide(color: Color(0x33B42318)),
                    ),
                  ),
                ],
              );

              if (!compact) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: summary),
                    const SizedBox(width: 12),
                    actions,
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [summary, const SizedBox(height: 12), actions],
              );
            },
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FBFF),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x1F3A5B7D)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      t.courseManageLessonsLabel,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF2A3C4E),
                      ),
                    ),
                    const Spacer(),
                    if (loadingLessons)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final tileWidth = constraints.maxWidth >= 1200
                        ? 216.0
                        : constraints.maxWidth >= 900
                        ? 180.0
                        : constraints.maxWidth >= 680
                        ? 158.0
                        : constraints.maxWidth / 2 - 12;

                    return Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        for (int i = 0; i < lessons.length; i++)
                          SizedBox(
                            width: tileWidth,
                            child: _LessonTile(
                              title: widget.formatLessonTitle(
                                lessons[i],
                                title,
                              ),
                              lessonLabel: t.lessonN(i + 1),
                              onTap: () => widget.onOpenLesson(
                                courseId,
                                title,
                                i,
                                widget.formatLessonTitle(lessons[i], title),
                              ),
                              onDelete: () => widget.onDeleteLesson(
                                courseId,
                                i,
                                widget.formatLessonTitle(lessons[i], title),
                              ),
                            ),
                          ),
                        SizedBox(
                          width: tileWidth,
                          child: _LessonTile(
                            title: t.addLesson,
                            dashed: true,
                            onTap: () => widget.onAddLesson(courseId, title),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResultsState(BuilderLocalizations t) {
    return DashboardCard(
      padding: const EdgeInsets.all(34),
      child: Column(
        children: [
          const Icon(
            Icons.search_off_rounded,
            size: 42,
            color: Color(0xFF7A8FA6),
          ),
          const SizedBox(height: 12),
          Text(
            t.courseManageNoResultsTitle,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            t.courseManageNoResultsBody,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: Color(0xFF607086)),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () {
              setState(() {
                _statusFilter = _CourseStatusFilter.all;
                _searchController.clear();
              });
            },
            icon: const Icon(Icons.filter_alt_off_rounded),
            label: Text(t.courseManageClearFilters),
          ),
        ],
      ),
    );
  }

  Widget _buildSignInPrompt(BuilderLocalizations t) {
    return DashboardCard(
      padding: const EdgeInsets.all(46),
      child: Column(
        children: [
          const Icon(
            Icons.lock_outline_rounded,
            size: 48,
            color: Color(0xFF607086),
          ),
          const SizedBox(height: 16),
          Text(
            t.signInToManage,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1C2B33),
            ),
          ),
          const SizedBox(height: 18),
          FilledButton(onPressed: widget.onSignIn, child: Text(t.signIn)),
        ],
      ),
    );
  }

  Widget _buildEmptyCourses(BuilderLocalizations t) {
    return DashboardCard(
      padding: const EdgeInsets.all(40),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF8FBFF), Color(0xFFF0FDF4)],
      ),
      child: Column(
        children: [
          // ── Hero icon ─────────────────────────────────────────────
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF4D7CFF), Color(0xFF58CC02)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4D7CFF).withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(
              Icons.school_rounded,
              size: 36,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 20),

          // ── Heading ───────────────────────────────────────────────
          Text(
            t.noCoursesYet,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1E2D3B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t.emptyStateTagline,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF607086),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),

          // ── Action card ───────────────────────────────────────────
          _EmptyActionCard(
            icon: Icons.add_circle_outline_rounded,
            iconColor: const Color(0xFF4D7CFF),
            iconBg: const Color(0xFFEAF1FF),
            title: t.emptyStateManualTitle,
            description: t.emptyStateManualDesc,
            buttonLabel: t.createCourse,
            buttonStyle: _EmptyActionCardStyle.primary,
            onTap: widget.onCreateCourse,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message, BuilderLocalizations t) {
    return DashboardCard(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 44,
            color: Color(0xFFB42318),
          ),
          const SizedBox(height: 12),
          Text(
            t.errorLoading,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1C2B33),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: Color(0xFF607086)),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () => widget.onRefresh(),
            icon: const Icon(Icons.refresh_rounded),
            label: Text(t.courseManageRefresh),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineError(String message, BuilderLocalizations t) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x33B42318)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFB42318),
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '${t.errorLoading}: $message',
              style: const TextStyle(fontSize: 12, color: Color(0xFF7A271A)),
            ),
          ),
          TextButton(
            onPressed: () => widget.onRefresh(),
            child: Text(t.courseManageRefresh),
          ),
        ],
      ),
    );
  }

  String _sortLabel(String sortOrder, BuilderLocalizations t) {
    switch (sortOrder) {
      case 'student':
        return t.sortByStudent;
      case 'comments':
        return t.sortByComments;
      default:
        return t.sortByTime;
    }
  }

  String _difficultyLabel(String value, BuilderLocalizations t) {
    switch (value) {
      case 'intermediate':
        return t.difficultyIntermediate;
      case 'advanced':
        return t.difficultyAdvanced;
      default:
        return t.difficultyBeginner;
    }
  }

  String _durationLabel(int minutes, BuilderLocalizations t) {
    if (minutes <= 0) return t.courseEstimatedHoursHint;
    if (minutes < 60) {
      return t.isZh ? '$minutes 分钟' : '$minutes min';
    }
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return t.isZh ? '$h 小时' : '$h h';
    return t.isZh ? '$h 小时 $m 分钟' : '$h h $m min';
  }

  String _priceLabel(String tier, double price, BuilderLocalizations t) {
    if (tier == 'premium' && price > 0) {
      return '\$${price.toStringAsFixed(2)}';
    }
    return t.priceFree;
  }

  String _formatTimeAgo(String? updatedAt, BuilderLocalizations t) {
    if (updatedAt == null) return '';
    try {
      final dt = DateTime.parse(updatedAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inDays > 0) return t.updatedDaysAgo(diff.inDays);
      if (diff.inHours > 0) return t.updatedHoursAgo(diff.inHours);
      return t.updatedJustNow;
    } catch (_) {
      return t.updatedRecently;
    }
  }
}

class _CourseManageSummary {
  const _CourseManageSummary({
    required this.totalCourses,
    required this.totalLessons,
    required this.publishedCourses,
    required this.draftCourses,
    required this.emptyCourses,
  });

  final int totalCourses;
  final int totalLessons;
  final int publishedCourses;
  final int draftCourses;
  final int emptyCourses;
}

class _SummaryMetric extends StatelessWidget {
  const _SummaryMetric({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E2D3B),
                  ),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF607086),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.t});

  final String status;
  final BuilderLocalizations t;

  @override
  Widget build(BuildContext context) {
    final (text, color) = switch (status) {
      'published' => (t.courseManageStatusPublished, const Color(0xFF10B981)),
      'draft' => (t.courseManageStatusDraft, const Color(0xFFF59E0B)),
      _ => (t.courseManageStatusArchived, const Color(0xFF64748B)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF607086)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF415568),
            ),
          ),
        ],
      ),
    );
  }
}

class _LessonTile extends StatefulWidget {
  const _LessonTile({
    required this.title,
    this.lessonLabel,
    this.dashed = false,
    this.onTap,
    this.onDelete,
  });

  final String title;
  final String? lessonLabel;
  final bool dashed;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  @override
  State<_LessonTile> createState() => _LessonTileState();
}

class _LessonTileState extends State<_LessonTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      cursor: SystemMouseCursors.click,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: widget.onTap,
          child: Container(
            height: 132,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: widget.dashed
                  ? null
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0x1F4D7CFF), Color(0x1F58CC02)],
                    ),
              color: widget.dashed ? const Color(0x99FFFFFF) : null,
              border: Border.all(
                color: widget.dashed
                    ? const Color(0x66506E96)
                    : const Color(0x4D506E96),
                width: widget.dashed ? 2 : 1,
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: widget.dashed
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.add_circle_outline_rounded,
                              size: 22,
                              color: Color(0xFF607086),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              widget.title,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: Color(0xFF607086),
                              ),
                            ),
                          ],
                        )
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.lessonLabel != null) ...[
                              Text(
                                widget.lessonLabel!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 11,
                                  color: Color(0xFF607086),
                                  letterSpacing: 0.6,
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            Text(
                              widget.title,
                              textAlign: TextAlign.center,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                height: 1.35,
                                color: Color(0xFF1C2B33),
                              ),
                            ),
                          ],
                        ),
                ),
                if (widget.onDelete != null)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: AnimatedOpacity(
                      opacity: _hovered ? 1 : 0.15,
                      duration: const Duration(milliseconds: 120),
                      child: GestureDetector(
                        onTap: widget.onDelete,
                        child: Container(
                          width: 22,
                          height: 22,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black26, blurRadius: 4),
                            ],
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            size: 13,
                            color: Color(0xFFE53E3E),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Empty state action card ────────────────────────────────────────────────

enum _EmptyActionCardStyle { primary }

class _EmptyActionCard extends StatefulWidget {
  const _EmptyActionCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.description,
    required this.buttonLabel,
    required this.buttonStyle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String description;
  final String buttonLabel;
  final _EmptyActionCardStyle buttonStyle;
  final VoidCallback onTap;

  @override
  State<_EmptyActionCard> createState() => _EmptyActionCardState();
}

class _EmptyActionCardState extends State<_EmptyActionCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      cursor: SystemMouseCursors.click,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _hovered
                ? const Color(0x664D7CFF)
                : const Color(0x22000000),
            width: _hovered ? 1.5 : 1,
          ),
          boxShadow: _hovered
              ? [
                  BoxShadow(
                    color: const Color(0xFF4D7CFF).withValues(alpha: 0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [
                  const BoxShadow(
                    color: Color(0x0C000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: widget.onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: widget.iconBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(widget.icon, color: widget.iconColor, size: 22),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E2D3B),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                widget.description,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF607086),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: widget.onTap,
                  icon: const Icon(Icons.add_rounded, size: 16),
                  label: Text(widget.buttonLabel),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF4D7CFF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CourseManageLoadingState extends StatelessWidget {
  const _CourseManageLoadingState();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _LoadingCard(height: 112),
        SizedBox(height: 14),
        _LoadingCard(height: 72),
        SizedBox(height: 14),
        _LoadingCard(height: 330),
        SizedBox(height: 14),
        _LoadingCard(height: 330),
      ],
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return DashboardCard(
      padding: const EdgeInsets.all(0),
      child: Container(
        height: height,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF1F5F9), Color(0xFFE2E8F0)],
          ),
        ),
      ),
    );
  }
}
