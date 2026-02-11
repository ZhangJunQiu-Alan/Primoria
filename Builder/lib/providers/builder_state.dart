import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Builder layout state
class BuilderState {
  final int currentPageIndex;
  final String? selectedBlockId;
  final bool isPreviewMode;
  final String courseTitle;
  final bool hasUnsavedChanges;

  const BuilderState({
    this.currentPageIndex = 0,
    this.selectedBlockId,
    this.isPreviewMode = false,
    this.courseTitle = 'Untitled Course',
    this.hasUnsavedChanges = false,
  });

  BuilderState copyWith({
    int? currentPageIndex,
    String? selectedBlockId,
    bool? isPreviewMode,
    String? courseTitle,
    bool? hasUnsavedChanges,
    bool clearSelectedBlock = false,
  }) {
    return BuilderState(
      currentPageIndex: currentPageIndex ?? this.currentPageIndex,
      selectedBlockId: clearSelectedBlock
          ? null
          : (selectedBlockId ?? this.selectedBlockId),
      isPreviewMode: isPreviewMode ?? this.isPreviewMode,
      courseTitle: courseTitle ?? this.courseTitle,
      hasUnsavedChanges: hasUnsavedChanges ?? this.hasUnsavedChanges,
    );
  }
}

/// Builder state notifier
class BuilderStateNotifier extends StateNotifier<BuilderState> {
  BuilderStateNotifier() : super(const BuilderState());

  void selectBlock(String? blockId) {
    state = state.copyWith(selectedBlockId: blockId);
  }

  void clearSelection() {
    state = state.copyWith(clearSelectedBlock: true);
  }

  void setCurrentPage(int index) {
    state = state.copyWith(currentPageIndex: index, clearSelectedBlock: true);
  }

  void togglePreviewMode() {
    state = state.copyWith(isPreviewMode: !state.isPreviewMode);
  }

  void setCourseTitle(String title) {
    state = state.copyWith(courseTitle: title, hasUnsavedChanges: true);
  }

  void syncCourseTitle(String title, {required bool hasUnsavedChanges}) {
    state = state.copyWith(
      courseTitle: title,
      hasUnsavedChanges: hasUnsavedChanges,
    );
  }

  void markAsSaved() {
    state = state.copyWith(hasUnsavedChanges: false);
  }

  void markAsUnsaved() {
    state = state.copyWith(hasUnsavedChanges: true);
  }
}

/// Builder state provider
final builderStateProvider =
    StateNotifierProvider<BuilderStateNotifier, BuilderState>((ref) {
      return BuilderStateNotifier();
    });
