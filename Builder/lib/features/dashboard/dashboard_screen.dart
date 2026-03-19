import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../theme/design_tokens.dart';
import '../../services/supabase_service.dart';
import '../../services/file_picker.dart';
import '../../widgets/app_dropdown.dart';
import '../../widgets/auth_dialog.dart';
import '../../widgets/builder_settings_dialog.dart';
import '../../widgets/user_avatar.dart';
import 'tabs/course_manage_tab.dart';
import 'tabs/data_center_tab.dart';
import 'tabs/fans_manage_tab.dart';
import 'tabs/home_tab.dart';

// ─── Color tokens matching base.css variables ───
class _C {
  _C._();
  static const bg = Color(0xFFF6FBFF);
  static const surface = Color(0xFFFFFFFF);
  static const text = Color(0xFF1C2B33);
  static const muted = Color(0xFF607086);
  static const accent = Color(0xFF4D7CFF);
  static const danger = Color(0xFFE53E3E);
}

/// Sidebar navigation items
enum _NavTab { homePage, courseManage, dataCenter, fansManage }

/// Dashboard screen — sidebar + content area
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  _NavTab _currentTab = _NavTab.homePage;
  bool _sidebarOpen = false;

  // Course Manage state
  List<Map<String, dynamic>> _courses = [];
  bool _coursesLoading = false;
  String? _coursesError;
  String _sortOrder = 'time'; // 'time', 'student', 'comments'

  // Cache: courseId → list of page titles (lessons)
  final Map<String, List<String>> _courseLessons = {};
  final Set<String> _courseLessonLoading = <String>{};

  @override
  void initState() {
    super.initState();
    _bootstrapProtectedScreen();
  }

  void _bootstrapProtectedScreen() {
    // Access is already guarded by BuilderAccessNotifier + GoRouter redirect.
    // Just kick off data loading.
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    if (!SupabaseService.isLoggedIn) return;
    setState(() {
      _coursesLoading = true;
      _coursesError = null;
    });
    try {
      final courses = await SupabaseService.getMyCourses();
      if (mounted) {
        setState(() {
          // Always refresh lesson-title cache after a course list reload
          // so Builder-side renames are visible when returning to Dashboard.
          _courseLessons.clear();
          _courseLessonLoading.clear();
          _courses = courses;
          _coursesLoading = false;
          _coursesError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _coursesLoading = false;
          _coursesError = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 1024;

    return Scaffold(
      backgroundColor: _C.bg,
      body: Stack(
        children: [
          Row(
            children: [
              // Sidebar — fixed on wide, hidden on compact
              if (!isCompact) _buildSidebar(context, t),
              // Main content
              Expanded(child: _buildMain(context, t)),
            ],
          ),

          // Mobile sidebar overlay
          if (isCompact && _sidebarOpen) ...[
            GestureDetector(
              onTap: () => setState(() => _sidebarOpen = false),
              child: Container(color: const Color(0x590F1E2D)),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              child: _buildSidebar(context, t),
            ),
          ],
        ],
      ),
      // Mobile menu button
      floatingActionButton: isCompact && !_sidebarOpen
          ? FloatingActionButton.small(
              onPressed: () => setState(() => _sidebarOpen = true),
              backgroundColor: _C.accent,
              child: const Icon(Icons.menu, color: Colors.white),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
    );
  }

  // ═══════════════════════════════════════════════
  //  Sidebar
  // ═══════════════════════════════════════════════
  Widget _buildSidebar(BuildContext context, BuilderLocalizations t) {
    return Container(
      width: 260,
      decoration: const BoxDecoration(
        color: _C.surface,
        border: Border(right: BorderSide(color: Color(0x1A506E96))),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Brand
              InkWell(
                onTap: () {
                  setState(() => _currentTab = _NavTab.homePage);
                  context.go('/dashboard');
                },
                borderRadius: BorderRadius.circular(10),
                child: Row(
                  children: [
                    Image.asset(
                      'assets/imgs/logo.png',
                      width: 32,
                      height: 32,
                      errorBuilder: (_, __, ___) =>
                          const Icon(Icons.school, color: _C.accent, size: 28),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Primoria',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: _C.text,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Nav items
              _NavItem(
                label: t.navHomePage,
                active: _currentTab == _NavTab.homePage,
                onTap: () => setState(() => _currentTab = _NavTab.homePage),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navCourseManage,
                active: _currentTab == _NavTab.courseManage,
                onTap: () {
                  setState(() => _currentTab = _NavTab.courseManage);
                  _loadCourses();
                },
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navDataCenter,
                active: _currentTab == _NavTab.dataCenter,
                onTap: () => setState(() => _currentTab = _NavTab.dataCenter),
              ),
              const SizedBox(height: 10),
              _NavItem(
                label: t.navFansManage,
                active: _currentTab == _NavTab.fansManage,
                onTap: () => setState(() => _currentTab = _NavTab.fansManage),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════
  //  Main content area
  // ═══════════════════════════════════════════════
  Widget _buildMain(BuildContext context, BuilderLocalizations t) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
        child: Column(
          children: [
            // Topbar
            _buildTopbar(context, t),
            const SizedBox(height: 24),
            // Page content
            Expanded(child: SingleChildScrollView(child: _buildPageContent(t))),
          ],
        ),
      ),
    );
  }

  Widget _buildTopbar(BuildContext context, BuilderLocalizations t) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        UserAvatar(
          t: t,
          size: 57,
          onSignedIn: () {
            _loadCourses();
          },
        ),
      ],
    );
  }

  void _applySortOrder() {
    setState(() {
      switch (_sortOrder) {
        case 'student':
          // No real student data yet, keep current order
          break;
        case 'comments':
          // No real comments data yet, keep current order
          break;
        default:
          _courses.sort(
            (a, b) => (b['updated_at'] as String? ?? '').compareTo(
              a['updated_at'] as String? ?? '',
            ),
          );
      }
    });
  }

  Widget _buildPageContent(BuilderLocalizations t) {
    switch (_currentTab) {
      case _NavTab.homePage:
        return _buildHomePage(t);
      case _NavTab.courseManage:
        return _buildCourseManagePage(t);
      case _NavTab.dataCenter:
        return _buildDataCenterPage(t);
      case _NavTab.fansManage:
        return _buildFansManagePage(t);
    }
  }

  // ═══════════════════════════════════════════════
  //  Home Page content (dashboard)
  // ═══════════════════════════════════════════════
  Widget _buildHomePage(BuilderLocalizations t) {
    return DashboardHomeTab(
      t: t,
      onCreateCourse: () => _showCreateCourseDialog(t),
      onContinueEditing: () {
        setState(() => _currentTab = _NavTab.courseManage);
        _loadCourses();
      },
      onViewDataCenter: () {
        setState(() => _currentTab = _NavTab.dataCenter);
      },
      onOpenCourse: (courseId) {
        if (courseId.isEmpty) return;
        context.go('/builder?courseId=$courseId');
      },
    );
  }

  Widget _buildDataCenterPage(BuilderLocalizations t) {
    return DashboardDataCenterTab(t: t);
  }

  Widget _buildFansManagePage(BuilderLocalizations t) {
    return DashboardFansManageTab(t: t);
  }

  // ═══════════════════════════════════════════════
  //  Course Manage content
  // ═══════════════════════════════════════════════
  Widget _buildCourseManagePage(BuilderLocalizations t) {
    return DashboardCourseManageTab(
      t: t,
      isLoggedIn: SupabaseService.isLoggedIn,
      isLoading: _coursesLoading,
      loadError: _coursesError,
      courses: _courses,
      courseLessons: _courseLessons,
      sortOrder: _sortOrder,
      onSortChanged: (value) {
        _sortOrder = value;
        _applySortOrder();
      },
      onRefresh: _loadCourses,
      onSignIn: () => _showProfile(context),
      onCreateCourse: () => _showCreateCourseDialog(t),
      onEnsureLessonsLoaded: _loadCourseLessons,
      onOpenCourse: _openCourseBuilder,
      onEditCourse: (course) => _showEditCourseDialog(course, t),
      onDeleteCourse: (courseId, title) =>
          _confirmDeleteCourse(courseId, title, t),
      onOpenLesson: _openLessonBuilder,
      onDeleteLesson: (courseId, lessonIndex, lessonTitle) =>
          _confirmDeleteLesson(
            courseId: courseId,
            lessonIndex: lessonIndex,
            lessonTitle: lessonTitle,
            t: t,
          ),
      onAddLesson: _openAddLessonBuilder,
      formatLessonTitle: (rawTitle, courseTitle) =>
          _formatLessonCardTitle(rawTitle, courseTitle: courseTitle),
    );
  }

  /// Load lesson titles for a single course (async, cached).
  Future<void> _loadCourseLessons(String courseId) async {
    if (_courseLessons.containsKey(courseId) ||
        _courseLessonLoading.contains(courseId)) {
      return;
    }
    _courseLessonLoading.add(courseId);
    try {
      final titles = await SupabaseService.getCourseLessonTitles(courseId);
      if (mounted) {
        setState(() {
          _courseLessons[courseId] = titles;
          _courseLessonLoading.remove(courseId);
        });
      } else {
        _courseLessonLoading.remove(courseId);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _courseLessons[courseId] = [];
          _courseLessonLoading.remove(courseId);
        });
      } else {
        _courseLessonLoading.remove(courseId);
      }
    }
  }

  void _openCourseBuilder(String courseId, String courseTitle) {
    if (courseId.trim().isEmpty) return;
    final encodedCourseTitle = Uri.encodeQueryComponent(courseTitle);
    context.go('/builder?courseId=$courseId&courseTitle=$encodedCourseTitle');
  }

  void _openLessonBuilder(
    String courseId,
    String courseTitle,
    int lessonIndex,
    String lessonTitle,
  ) {
    final encodedLessonTitle = Uri.encodeQueryComponent(lessonTitle);
    final encodedCourseTitle = Uri.encodeQueryComponent(courseTitle);
    context.go(
      '/builder?courseId=$courseId&lessonIndex=$lessonIndex&lessonTitle=$encodedLessonTitle&courseTitle=$encodedCourseTitle',
    );
  }

  void _openAddLessonBuilder(String courseId, String courseTitle) {
    final encodedCourseTitle = Uri.encodeQueryComponent(courseTitle);
    context.go(
      '/builder?courseId=$courseId&addLesson=1&courseTitle=$encodedCourseTitle',
    );
  }

  Future<void> _showCreateCourseDialog(BuilderLocalizations t) async {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    final thumbnailController = TextEditingController();
    final hoursController = TextEditingController();
    final priceController = TextEditingController();
    String? titleError;
    String? hoursError;
    String? priceError;
    String difficulty = 'beginner';
    String priceTier = 'free';
    bool isCreating = false;
    // Thumbnail upload state
    String thumbnailMode = 'url'; // 'url' | 'upload'
    Uint8List? pickedImageBytes;
    bool isUploadingImage = false;
    String? imageUploadError;

    final courseId = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final canCreate =
              nameController.text.trim().isNotEmpty &&
              !isCreating &&
              !isUploadingImage;

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Text(
              t.createCourseDialogTitle,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: _C.text,
              ),
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Title ──────────────────────────────────
                    TextField(
                      controller: nameController,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: '${t.courseName} *',
                        hintText: t.courseNameHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: titleError,
                      ),
                      onChanged: (_) => setDialogState(() => titleError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Description ────────────────────────────
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: t.courseDescription,
                        hintText: t.courseDescriptionHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // ── Cover Image ────────────────────────────
                    Row(
                      children: [
                        _ThumbnailModeChip(
                          label: t.uploadImage,
                          icon: Icons.upload_rounded,
                          active: thumbnailMode == 'upload',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'upload'),
                        ),
                        const SizedBox(width: 8),
                        _ThumbnailModeChip(
                          label: t.imageUrl,
                          icon: Icons.link_rounded,
                          active: thumbnailMode == 'url',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'url'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (thumbnailMode == 'upload') ...[
                      GestureDetector(
                        onTap: isUploadingImage
                            ? null
                            : () async {
                                // Read image bytes from browser file picker
                                final result = await pickImageFileBytes();
                                if (!result.success || result.bytes == null) {
                                  setDialogState(
                                    () => imageUploadError = result.message,
                                  );
                                  return;
                                }
                                setDialogState(() {
                                  isUploadingImage = true;
                                  imageUploadError = null;
                                });
                                final (
                                  url,
                                  uploadErr,
                                ) = await SupabaseService.uploadCourseThumbnail(
                                  bytes: result.bytes!,
                                  fileName: result.fileName ?? 'thumbnail.jpg',
                                );
                                setDialogState(() {
                                  isUploadingImage = false;
                                  if (url != null) {
                                    pickedImageBytes = result.bytes;
                                    thumbnailController.text = url;
                                  } else {
                                    imageUploadError =
                                        uploadErr ?? t.imageUploadFailed;
                                  }
                                });
                              },
                        child: _UploadPreviewBox(
                          bytes: pickedImageBytes,
                          isUploading: isUploadingImage,
                          uploadLabel: t.clickToUpload,
                          uploadingLabel: t.uploadingImage,
                          changeLabel: t.changeImage,
                        ),
                      ),
                      if (imageUploadError != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          imageUploadError!,
                          style: const TextStyle(
                            color: _C.danger,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ] else ...[
                      TextField(
                        controller: thumbnailController,
                        decoration: InputDecoration(
                          labelText: t.courseThumbnailUrl,
                          hintText: t.courseThumbnailUrlHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          prefixIcon: const Icon(
                            Icons.image_outlined,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // ── Difficulty ─────────────────────────────
                    AppDropdown<String>(
                      light: true,
                      value: difficulty,
                      labelText: '${t.courseDifficulty} *',
                      items: [
                        AppDropdownItem(
                          value: 'beginner',
                          label: t.difficultyBeginner,
                        ),
                        AppDropdownItem(
                          value: 'intermediate',
                          label: t.difficultyIntermediate,
                        ),
                        AppDropdownItem(
                          value: 'advanced',
                          label: t.difficultyAdvanced,
                        ),
                      ],
                      onChanged: (v) =>
                          setDialogState(() => difficulty = v ?? 'beginner'),
                    ),
                    const SizedBox(height: 16),
                    // ── Estimated Hours ────────────────────────
                    TextField(
                      controller: hoursController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: t.courseEstimatedHours,
                        hintText: t.courseEstimatedHoursHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: hoursError,
                      ),
                      onChanged: (_) => setDialogState(() => hoursError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Price Tier ─────────────────────────────
                    AppDropdown<String>(
                      light: true,
                      value: priceTier,
                      labelText: '${t.coursePriceTier} *',
                      items: [
                        AppDropdownItem(value: 'free', label: t.priceFree),
                        AppDropdownItem(
                          value: 'premium',
                          label: t.pricePremium,
                        ),
                      ],
                      onChanged: (v) => setDialogState(() {
                        priceTier = v ?? 'free';
                        if (priceTier == 'free') priceError = null;
                      }),
                    ),
                    // ── Price (visible only when premium) ──────
                    AnimatedSize(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeInOut,
                      alignment: Alignment.topCenter,
                      child: priceTier == 'premium'
                          ? Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: TextField(
                                controller: priceController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: '${t.coursePrice} *',
                                  hintText: t.coursePriceHint,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  prefixIcon: const Icon(
                                    Icons.attach_money,
                                    size: 20,
                                  ),
                                  errorText: priceError,
                                ),
                                onChanged: (_) =>
                                    setDialogState(() => priceError = null),
                              ),
                            )
                          : const SizedBox(width: double.infinity),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isCreating ? null : () => Navigator.pop(ctx),
                child: Text(t.cancel),
              ),
              ElevatedButton(
                onPressed: canCreate
                    ? () async {
                        // Validate hours
                        final hoursText = hoursController.text.trim();
                        int? minutes;
                        if (hoursText.isNotEmpty) {
                          final hours = double.tryParse(hoursText);
                          if (hours == null || hours < 0) {
                            setDialogState(
                              () => hoursError = t.isZh
                                  ? '请输入有效数字'
                                  : (t.isZh
                                        ? '请输入有效数字'
                                        : 'Enter a valid number'),
                            );
                            return;
                          }
                          minutes = (hours * 60).round();
                        }
                        // Validate price
                        double parsedPrice = 0;
                        if (priceTier == 'premium') {
                          final priceText = priceController.text.trim();
                          final p = double.tryParse(priceText);
                          if (p == null || p <= 0) {
                            setDialogState(
                              () => priceError = t.isZh
                                  ? '请输入有效价格'
                                  : (t.isZh
                                        ? '请输入有效价格'
                                        : 'Enter a valid price'),
                            );
                            return;
                          }
                          parsedPrice = p;
                        }
                        await _createCourse(
                          title: nameController.text.trim(),
                          description: descController.text.trim(),
                          thumbnailUrl: thumbnailController.text.trim(),
                          difficultyLevel: difficulty,
                          estimatedMinutes: minutes,
                          priceTier: priceTier,
                          price: parsedPrice,
                          ctx: ctx,
                          setDialogState: setDialogState,
                          setTitleError: (e) => titleError = e,
                          setCreating: (v) => isCreating = v,
                        );
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _C.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: isCreating
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        t.create,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
              ),
            ],
          );
        },
      ),
    );

    if (courseId != null && mounted) {
      _loadCourses();
    }
  }

  Future<void> _createCourse({
    required String title,
    required String description,
    required String thumbnailUrl,
    required String difficultyLevel,
    required int? estimatedMinutes,
    required String priceTier,
    required double price,
    required BuildContext ctx,
    required void Function(void Function()) setDialogState,
    required void Function(String?) setTitleError,
    required void Function(bool) setCreating,
  }) async {
    setDialogState(() {
      setCreating(true);
      setTitleError(null);
    });

    final result = await SupabaseService.createCourseRow(
      title: title,
      description: description.isNotEmpty ? description : null,
      thumbnailUrl: thumbnailUrl.isNotEmpty ? thumbnailUrl : null,
      difficultyLevel: difficultyLevel,
      estimatedMinutes: estimatedMinutes,
      priceTier: priceTier,
      price: price,
    );

    if (!ctx.mounted) return;

    if (result.success) {
      Navigator.pop(ctx, result.courseId);
    } else {
      setDialogState(() {
        setCreating(false);
        setTitleError(result.message);
      });
    }
  }

  Future<void> _confirmDeleteCourse(
    String courseId,
    String title,
    BuilderLocalizations t,
  ) async {
    // Capture messenger before any async gap so it remains safe to use
    // even if this widget is deactivated while the dialog / network call runs.
    final messenger = ScaffoldMessenger.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(t.deleteCourseTitle),
        content: Text(t.deleteConfirm(title)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.danger,
              foregroundColor: Colors.white,
            ),
            child: Text(t.delete),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final result = await SupabaseService.deleteCourse(courseId);
      if (!messenger.mounted) return;
      if (result.success) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(t.courseDeleted),
            backgroundColor: AppColors.success,
          ),
        );
        if (mounted) _loadCourses(); // refresh list
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _confirmDeleteLesson({
    required String courseId,
    required int lessonIndex,
    required String lessonTitle,
    required BuilderLocalizations t,
  }) async {
    // Guard: prevent deleting last lesson
    final currentLessons = _courseLessons[courseId] ?? [];
    if (currentLessons.length <= 1) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t.cannotDeleteLastLesson)));
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(t.deleteLessonTitle),
        content: Text(t.deleteLessonConfirm(lessonIndex + 1, lessonTitle)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t.cancel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _C.danger,
              foregroundColor: Colors.white,
            ),
            child: Text(t.delete),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    // Load full course, remove the page, save back
    final course = await SupabaseService.getCourseContent(courseId);
    if (!mounted) return;
    if (course == null || lessonIndex >= course.lessons.length) {
      messenger.showSnackBar(SnackBar(content: Text(t.errorLoading)));
      return;
    }

    final lessonId = course.lessons[lessonIndex].lessonId;
    final updated = course.removeLesson(lessonId);
    final result = await SupabaseService.saveCourse(updated);
    if (!mounted) return;

    if (result.success) {
      _courseLessons.remove(courseId); // invalidate cache
      await _loadCourseLessons(courseId); // reload titles
      messenger.showSnackBar(
        SnackBar(
          content: Text(t.lessonDeleted),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  String _formatLessonCardTitle(
    String rawTitle, {
    required String courseTitle,
  }) {
    final t = BuilderLocalizations(ref.read(languageProvider));
    final cleaned = rawTitle.trim();
    if (cleaned.isEmpty) return t.isZh ? '未命名课时' : 'Untitled lesson';

    final base = courseTitle.trim();
    if (base.isEmpty) return cleaned;

    final cleanedLower = cleaned.toLowerCase();
    final baseLower = base.toLowerCase();
    if (!cleanedLower.startsWith(baseLower)) return cleaned;

    var suffix = cleaned.substring(base.length).trimLeft();
    if (suffix.startsWith(':') ||
        suffix.startsWith('-') ||
        suffix.startsWith('—')) {
      suffix = suffix.substring(1).trimLeft();
    }

    return suffix.isNotEmpty ? suffix : cleaned;
  }

  Future<void> _showEditCourseDialog(
    Map<String, dynamic> course,
    BuilderLocalizations t,
  ) async {
    final courseId = course['id'] as String;
    // Capture before async gap (showDialog completes asynchronously).
    final messenger = ScaffoldMessenger.of(context);
    final titleController = TextEditingController(
      text: course['title'] as String? ?? '',
    );
    final descController = TextEditingController(
      text: course['description'] as String? ?? '',
    );
    final thumbnailController = TextEditingController(
      text: course['thumbnail_url'] as String? ?? '',
    );
    final existingMinutes = course['estimated_minutes'] as int? ?? 0;
    final hoursController = TextEditingController(
      text: existingMinutes > 0
          ? (existingMinutes / 60.0).toStringAsFixed(
              existingMinutes % 60 == 0 ? 0 : 1,
            )
          : '',
    );
    final existingPrice = (course['price'] as num?)?.toDouble() ?? 0.0;
    final priceController = TextEditingController(
      text: existingPrice > 0 ? existingPrice.toStringAsFixed(2) : '',
    );
    String difficulty = (course['difficulty_level'] as String?) ?? 'beginner';
    String priceTier = (course['price_tier'] as String?) ?? 'free';
    String? titleError;
    String? hoursError;
    String? priceError;
    bool isSaving = false;
    // Thumbnail upload state
    String thumbnailMode = 'url';
    Uint8List? pickedImageBytes;
    bool isUploadingImage = false;
    String? imageUploadError;

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final canSave =
              titleController.text.trim().isNotEmpty &&
              !isSaving &&
              !isUploadingImage;

          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            title: Text(
              t.editCourseDialogTitle,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: _C.text,
              ),
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Title ──────────────────────────────────
                    TextField(
                      controller: titleController,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: '${t.courseName} *',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: titleError,
                      ),
                      onChanged: (_) => setDialogState(() => titleError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Description ────────────────────────────
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: t.courseDescription,
                        hintText: t.courseDescriptionHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // ── Cover Image ────────────────────────────
                    Row(
                      children: [
                        _ThumbnailModeChip(
                          label: t.uploadImage,
                          icon: Icons.upload_rounded,
                          active: thumbnailMode == 'upload',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'upload'),
                        ),
                        const SizedBox(width: 8),
                        _ThumbnailModeChip(
                          label: t.imageUrl,
                          icon: Icons.link_rounded,
                          active: thumbnailMode == 'url',
                          onTap: () =>
                              setDialogState(() => thumbnailMode = 'url'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (thumbnailMode == 'upload') ...[
                      GestureDetector(
                        onTap: isUploadingImage
                            ? null
                            : () async {
                                // Read image bytes from browser file picker
                                final result = await pickImageFileBytes();
                                if (!result.success || result.bytes == null) {
                                  setDialogState(
                                    () => imageUploadError = result.message,
                                  );
                                  return;
                                }
                                setDialogState(() {
                                  isUploadingImage = true;
                                  imageUploadError = null;
                                });
                                final (
                                  url,
                                  uploadErr,
                                ) = await SupabaseService.uploadCourseThumbnail(
                                  bytes: result.bytes!,
                                  fileName: result.fileName ?? 'thumbnail.jpg',
                                );
                                setDialogState(() {
                                  isUploadingImage = false;
                                  if (url != null) {
                                    pickedImageBytes = result.bytes;
                                    thumbnailController.text = url;
                                  } else {
                                    imageUploadError =
                                        uploadErr ?? t.imageUploadFailed;
                                  }
                                });
                              },
                        child: _UploadPreviewBox(
                          bytes: pickedImageBytes,
                          isUploading: isUploadingImage,
                          uploadLabel: t.clickToUpload,
                          uploadingLabel: t.uploadingImage,
                          changeLabel: t.changeImage,
                        ),
                      ),
                      if (imageUploadError != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          imageUploadError!,
                          style: const TextStyle(
                            color: _C.danger,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ] else ...[
                      TextField(
                        controller: thumbnailController,
                        decoration: InputDecoration(
                          labelText: t.courseThumbnailUrl,
                          hintText: t.courseThumbnailUrlHint,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          prefixIcon: const Icon(
                            Icons.image_outlined,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // ── Difficulty ─────────────────────────────
                    AppDropdown<String>(
                      light: true,
                      value: difficulty,
                      labelText: '${t.courseDifficulty} *',
                      items: [
                        AppDropdownItem(
                          value: 'beginner',
                          label: t.difficultyBeginner,
                        ),
                        AppDropdownItem(
                          value: 'intermediate',
                          label: t.difficultyIntermediate,
                        ),
                        AppDropdownItem(
                          value: 'advanced',
                          label: t.difficultyAdvanced,
                        ),
                      ],
                      onChanged: (v) =>
                          setDialogState(() => difficulty = v ?? 'beginner'),
                    ),
                    const SizedBox(height: 16),
                    // ── Estimated Hours ────────────────────────
                    TextField(
                      controller: hoursController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: t.courseEstimatedHours,
                        hintText: t.courseEstimatedHoursHint,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        errorText: hoursError,
                      ),
                      onChanged: (_) => setDialogState(() => hoursError = null),
                    ),
                    const SizedBox(height: 16),
                    // ── Price Tier ─────────────────────────────
                    AppDropdown<String>(
                      light: true,
                      value: priceTier,
                      labelText: '${t.coursePriceTier} *',
                      items: [
                        AppDropdownItem(value: 'free', label: t.priceFree),
                        AppDropdownItem(
                          value: 'premium',
                          label: t.pricePremium,
                        ),
                      ],
                      onChanged: (v) => setDialogState(() {
                        priceTier = v ?? 'free';
                        if (priceTier == 'free') priceError = null;
                      }),
                    ),
                    // ── Price (visible only when premium) ──────
                    AnimatedSize(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeInOut,
                      alignment: Alignment.topCenter,
                      child: priceTier == 'premium'
                          ? Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: TextField(
                                controller: priceController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: InputDecoration(
                                  labelText: '${t.coursePrice} *',
                                  hintText: t.coursePriceHint,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  prefixIcon: const Icon(
                                    Icons.attach_money,
                                    size: 20,
                                  ),
                                  errorText: priceError,
                                ),
                                onChanged: (_) =>
                                    setDialogState(() => priceError = null),
                              ),
                            )
                          : const SizedBox(width: double.infinity),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.pop(ctx, false),
                child: Text(t.cancel),
              ),
              ElevatedButton(
                onPressed: canSave
                    ? () async {
                        // Validate hours
                        final hoursText = hoursController.text.trim();
                        int? minutes;
                        if (hoursText.isNotEmpty) {
                          final hours = double.tryParse(hoursText);
                          if (hours == null || hours < 0) {
                            setDialogState(
                              () => hoursError = t.isZh
                                  ? '请输入有效数字'
                                  : (t.isZh
                                        ? '请输入有效数字'
                                        : 'Enter a valid number'),
                            );
                            return;
                          }
                          minutes = (hours * 60).round();
                        }
                        // Validate price
                        double parsedPrice = 0;
                        if (priceTier == 'premium') {
                          final priceText = priceController.text.trim();
                          final p = double.tryParse(priceText);
                          if (p == null || p <= 0) {
                            setDialogState(
                              () => priceError = t.isZh
                                  ? '请输入有效价格'
                                  : (t.isZh
                                        ? '请输入有效价格'
                                        : 'Enter a valid price'),
                            );
                            return;
                          }
                          parsedPrice = p;
                        }
                        setDialogState(() {
                          isSaving = true;
                          titleError = null;
                        });
                        final result = await SupabaseService.updateCourseInfo(
                          courseId: courseId,
                          title: titleController.text.trim(),
                          description: descController.text.trim(),
                          thumbnailUrl: thumbnailController.text.trim(),
                          difficultyLevel: difficulty,
                          estimatedMinutes: minutes,
                          priceTier: priceTier,
                          price: parsedPrice,
                        );
                        if (!ctx.mounted) return;
                        if (result.success) {
                          Navigator.pop(ctx, true);
                          return;
                        }
                        setDialogState(() {
                          isSaving = false;
                          titleError = result.message;
                        });
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _C.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                child: isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        t.save,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
              ),
            ],
          );
        },
      ),
    );

    if (updated == true && messenger.mounted) {
      final t2 = BuilderLocalizations(ref.read(languageProvider));
      messenger.showSnackBar(
        SnackBar(
          content: Text(t2.courseInfoUpdated),
          backgroundColor: AppColors.success,
        ),
      );
      if (mounted) _loadCourses();
    }
  }

  void _showProfile(BuildContext context) {
    if (!SupabaseService.isLoggedIn) {
      // Capture messenger before the dialog opens (async boundary).
      final messenger = ScaffoldMessenger.of(context);
      showDialog(
        context: context,
        builder: (ctx) => AuthDialog(
          onSuccess: () {
            if (messenger.mounted) {
              final t = BuilderLocalizations(ref.read(languageProvider));
              messenger.showSnackBar(
                SnackBar(
                  content: Text(t.signedIn),
                  backgroundColor: AppColors.success,
                ),
              );
              if (mounted) {
                _loadCourses();
              }
            }
          },
        ),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => const BuilderSettingsDialog(),
    );
  }
}

// ═══════════════════════════════════════════════════
//  Reusable widgets
// ═══════════════════════════════════════════════════

/// Sidebar nav item
class _NavItem extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _NavItem({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: active
              ? _C.accent.withValues(alpha: 0.12)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: active ? _C.accent : _C.muted,
          ),
        ),
      ),
    );
  }
}

// ─── Thumbnail mode toggle chip ────────────────────────────────────────────
class _ThumbnailModeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ThumbnailModeChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? _C.accent : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active ? _C.accent : _C.muted.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: active ? Colors.white : _C.muted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : _C.muted,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Upload preview box ────────────────────────────────────────────────────
class _UploadPreviewBox extends StatelessWidget {
  final Uint8List? bytes;
  final bool isUploading;
  final String uploadLabel;
  final String uploadingLabel;
  final String changeLabel;

  const _UploadPreviewBox({
    required this.bytes,
    required this.isUploading,
    required this.uploadLabel,
    required this.uploadingLabel,
    required this.changeLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF6F8FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _C.accent.withValues(alpha: 0.25),
          width: 1.5,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: isUploading
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(
                  color: _C.accent,
                  strokeWidth: 2.5,
                ),
                const SizedBox(height: 12),
                Text(
                  uploadingLabel,
                  style: const TextStyle(color: _C.muted, fontSize: 13),
                ),
              ],
            )
          : bytes != null
          ? Stack(
              fit: StackFit.expand,
              children: [
                Image.memory(bytes!, fit: BoxFit.cover),
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.swap_horiz_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          changeLabel,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.add_photo_alternate_outlined,
                  size: 36,
                  color: _C.muted.withValues(alpha: 0.7),
                ),
                const SizedBox(height: 8),
                Text(
                  uploadLabel,
                  style: const TextStyle(color: _C.muted, fontSize: 13),
                ),
              ],
            ),
    );
  }
}
