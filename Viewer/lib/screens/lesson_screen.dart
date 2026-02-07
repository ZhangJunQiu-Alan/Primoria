import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/interactions/slider_interaction.dart' show InteractiveSlider;
import '../components/feedback/feedback_dialog.dart';
import '../models/unit_model.dart';
import '../providers/user_provider.dart';
import '../services/audio_service.dart';

/// Lesson/Interactive learning page - Duolingo + Brilliant style
class LessonScreen extends StatefulWidget {
  final String? lessonId;
  final String? lessonTitle;
  final LinearGradient? gradient;

  const LessonScreen({
    super.key,
    this.lessonId,
    this.lessonTitle,
    this.gradient,
  });

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  int _currentIndex = 0;
  double _sliderValue = 50;
  String? _selectedOption;
  final _inputController = TextEditingController();
  List<String> _sortingOrder = [];

  // Confetti controller
  late ConfettiController _confettiController;

  // Audio service
  final _audioService = AudioService.getInstance();

  // Start time (for calculating study duration)
  final DateTime _startTime = DateTime.now();

  // Get title
  String get _title => widget.lessonTitle ?? 'Interactive Learning';

  // Sample question data
  final _questions = [
    _QuestionData(
      type: QuestionType.info,
      title: 'Welcome to This Lesson',
      content: 'In this lesson, you will learn how to understand and master knowledge through interactive methods.\n\nAre you ready? Let\'s begin!',
    ),
    _QuestionData(
      type: QuestionType.slider,
      title: 'Adjust Temperature',
      content: 'Please adjust the water temperature to the ideal temperature for brewing green tea',
      sliderConfig: const SliderConfig(
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
        unit: '°C',
        showValue: true,
      ),
      targetValue: 85,
      tolerance: 5,
      successMsg: 'Great! Around 85°C is the ideal temperature for brewing green tea.',
      failMsgHigh: 'The temperature is too high, it will damage the nutrients in the tea leaves.',
      failMsgLow: 'The temperature is too low, it cannot fully release the aroma of the tea.',
    ),
    _QuestionData(
      type: QuestionType.choice,
      title: 'Choose the Correct Answer',
      content: 'Which of the following is a valid logical reasoning?',
      options: [
        'If it rains, the ground gets wet. The ground is wet, so it rained.',
        'If it rains, the ground gets wet. It rained, so the ground is wet.',
        'If the ground is wet, it will rain. The ground is wet, so it rained.',
        'If it doesn\'t rain, the ground won\'t be wet. The ground is not wet, so it didn\'t rain.',
      ],
      correctIndex: 1,
      successMsg: 'Correct! This is a valid modus ponens reasoning.',
      failMsg: 'This reasoning contains a logical fallacy, please think again.',
    ),
    _QuestionData(
      type: QuestionType.sorting,
      title: 'Sorting Question',
      content: 'Please arrange the following numbers in ascending order:',
      sortingItems: ['42', '15', '8', '23', '31'],
      correctOrder: ['8', '15', '23', '31', '42'],
      successMsg: 'Sorting correct!',
      failMsg: 'The order is incorrect, please try again.',
    ),
    _QuestionData(
      type: QuestionType.input,
      title: 'Calculation',
      content: 'If a square has a side length of 5, what is its area?',
      correctAnswer: '25',
      successMsg: 'Absolutely correct! Square area = side × side = 5 × 5 = 25',
      failMsg: 'Incorrect answer, remember: square area = side × side',
    ),
    _QuestionData(
      type: QuestionType.info,
      title: 'Congratulations!',
      content: 'You have completed this lesson.\n\nKeep going, learn a little every day, and you\'ll get better and better!',
      isLast: true,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));

    // Initialize sorting question order
    final sortingQuestion = _questions.firstWhere(
      (q) => q.type == QuestionType.sorting,
      orElse: () => _questions.first,
    );
    if (sortingQuestion.sortingItems != null) {
      _sortingOrder = List.from(sortingQuestion.sortingItems!);
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _checkAnswer() async {
    final question = _questions[_currentIndex];

    bool isCorrect = false;
    String feedbackMsg = '';

    switch (question.type) {
      case QuestionType.slider:
        final diff = (_sliderValue - question.targetValue!).abs();
        isCorrect = diff <= question.tolerance!;
        if (!isCorrect) {
          feedbackMsg = _sliderValue > question.targetValue!
              ? question.failMsgHigh!
              : question.failMsgLow!;
        }
        break;

      case QuestionType.choice:
        isCorrect = _selectedOption == question.options![question.correctIndex!];
        feedbackMsg = question.failMsg!;
        break;

      case QuestionType.input:
        isCorrect = _inputController.text.trim() == question.correctAnswer;
        feedbackMsg = question.failMsg!;
        break;

      case QuestionType.sorting:
        isCorrect = _listEquals(_sortingOrder, question.correctOrder!);
        feedbackMsg = question.failMsg!;
        break;

      case QuestionType.info:
        _nextQuestion();
        return;
    }

    if (isCorrect) {
      await _audioService.playCorrect();

      // Record completed question
      if (mounted) {
        context.read<UserProvider>().completeQuestion();
      }

      context.showSuccessFeedback(
        message: question.successMsg!,
        onContinue: _nextQuestion,
      );
    } else {
      await _audioService.playWrong();
      context.showFailureFeedback(
        message: feedbackMsg,
        onRetry: () {},
      );
    }
  }

  bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  Future<void> _nextQuestion() async {
    if (_currentIndex < _questions.length - 1) {
      setState(() {
        _currentIndex++;
        _sliderValue = 50;
        _selectedOption = null;
        _inputController.clear();

        // Reset sorting question order
        final nextQuestion = _questions[_currentIndex];
        if (nextQuestion.type == QuestionType.sorting &&
            nextQuestion.sortingItems != null) {
          _sortingOrder = List.from(nextQuestion.sortingItems!);
        }
      });
    } else {
      // Lesson complete - play confetti and completion sound
      _confettiController.play();
      await _audioService.playComplete();

      // Record study duration
      final studyMinutes = DateTime.now().difference(_startTime).inMinutes;
      if (mounted && studyMinutes > 0) {
        await context.read<UserProvider>().recordStudy(studyMinutes);
      }

      // Delay to let user see confetti effect
      await Future.delayed(const Duration(milliseconds: 1500));

      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final question = _questions[_currentIndex];
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                // Top bar
                _buildHeader(isDark),

                // Progress bar - thicker, green
                _buildProgressBar(),

                // Content area
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: _buildQuestionContent(question, isDark),
                  ),
                ),

                // Bottom buttons
                _buildBottomBar(question, isDark),
              ],
            ),
          ),

          // Confetti effect - updated colors
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                AppColors.primary,
                AppColors.primaryLight,
                AppColors.accent,
                AppColors.courseMath,
                AppColors.courseCS,
              ],
              numberOfParticles: 50,
              gravity: 0.2,
              emissionFrequency: 0.05,
              maxBlastForce: 30,
              minBlastForce: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => _showExitDialog(),
            icon: const Icon(Icons.close),
            color: isDark ? AppColors.textSecondaryOnDark : AppColors.textSecondary,
          ),
          Expanded(
            child: Text(
              _title,
              style: AppTypography.title.copyWith(
                color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: AppRadius.borderRadiusFull,
            ),
            child: Text(
              '${_currentIndex + 1}/${_questions.length}',
              style: AppTypography.label.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    final progress = (_currentIndex + 1) / _questions.length;

    return Container(
      height: 6,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress,
        child: Container(
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: AppRadius.borderRadiusFull,
          ),
        ),
      ),
    );
  }

  Widget _buildQuestionContent(_QuestionData question, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title
        Text(
          question.title,
          style: AppTypography.headline2.copyWith(
            color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // Content/question
        Text(
          question.content,
          style: AppTypography.body1.copyWith(
            height: 1.6,
            color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // Interactive widget
        _buildInteractionWidget(question, isDark),
      ],
    );
  }

  Widget _buildInteractionWidget(_QuestionData question, bool isDark) {
    switch (question.type) {
      case QuestionType.slider:
        return InteractiveSlider(
          config: question.sliderConfig!,
          description: '',
          initialValue: _sliderValue,
          onChanged: (value) => setState(() => _sliderValue = value),
        );

      case QuestionType.choice:
        return Column(
          children: question.options!.map((option) {
            final isSelected = _selectedOption == option;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: GestureDetector(
                onTap: () {
                  _audioService.playClick();
                  setState(() => _selectedOption = option);
                },
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.08)
                        : isDark
                            ? AppColors.cardDark
                            : AppColors.surface,
                    borderRadius: AppRadius.borderRadiusXl,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : isDark
                              ? AppColors.borderDark
                              : AppColors.border,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected
                              ? AppColors.primary
                              : Colors.transparent,
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary
                                : isDark
                                    ? AppColors.borderDark
                                    : AppColors.border,
                            width: 2,
                          ),
                        ),
                        child: isSelected
                            ? const Icon(
                                Icons.check,
                                size: 16,
                                color: Colors.white,
                              )
                            : null,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          option,
                          style: AppTypography.body1.copyWith(
                            color: isDark
                                ? AppColors.textOnDark
                                : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );

      case QuestionType.sorting:
        return ReorderableListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _sortingOrder.length,
          onReorder: (oldIndex, newIndex) {
            _audioService.playClick();
            setState(() {
              if (oldIndex < newIndex) {
                newIndex -= 1;
              }
              final item = _sortingOrder.removeAt(oldIndex);
              _sortingOrder.insert(newIndex, item);
            });
          },
          itemBuilder: (context, index) {
            final item = _sortingOrder[index];
            return Container(
              key: ValueKey(item),
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : AppColors.surface,
                borderRadius: AppRadius.borderRadiusLg,
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.border,
                ),
                boxShadow: isDark ? null : AppShadows.sm,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.drag_handle,
                    color: isDark
                        ? AppColors.textSecondaryOnDark
                        : AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Text(
                    item,
                    style: AppTypography.headline3.copyWith(
                      color: isDark
                          ? AppColors.textOnDark
                          : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            );
          },
        );

      case QuestionType.input:
        return TextField(
          controller: _inputController,
          keyboardType: TextInputType.number,
          style: AppTypography.headline2.copyWith(
            color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
          ),
          textAlign: TextAlign.center,
          decoration: InputDecoration(
            hintText: 'Enter answer',
            hintStyle: AppTypography.headline2.copyWith(
              color: isDark
                  ? AppColors.textSecondaryOnDark
                  : AppColors.textDisabled,
            ),
            filled: true,
            fillColor: isDark ? AppColors.cardDark : AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: AppRadius.borderRadiusXl,
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.border,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderRadiusXl,
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 2,
              ),
            ),
          ),
        );

      case QuestionType.info:
        if (question.isLast) {
          return Center(
            child: Column(
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.celebration,
                    size: 48,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          );
        }
        return const SizedBox.shrink();
    }
  }

  Widget _buildBottomBar(_QuestionData question, bool isDark) {
    final isInfoPage = question.type == QuestionType.info;
    final canSubmit = isInfoPage ||
        (question.type == QuestionType.choice && _selectedOption != null) ||
        (question.type == QuestionType.input && _inputController.text.isNotEmpty) ||
        question.type == QuestionType.slider ||
        question.type == QuestionType.sorting;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        child: _Duo3DSubmitButton(
          onPressed: canSubmit ? (isInfoPage ? _nextQuestion : _checkAnswer) : null,
          label: isInfoPage
              ? (question.isLast ? 'Complete Lesson' : 'Continue')
              : 'Submit Answer',
        ),
      ),
    );
  }

  void _showExitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exit?'),
        content: const Text('Your current progress will not be saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: Text(
              'Exit',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

/// Duolingo-style 3D submit button for lesson screen
class _Duo3DSubmitButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final String label;

  const _Duo3DSubmitButton({
    required this.onPressed,
    required this.label,
  });

  @override
  State<_Duo3DSubmitButton> createState() => _Duo3DSubmitButtonState();
}

class _Duo3DSubmitButtonState extends State<_Duo3DSubmitButton> {
  bool _isPressed = false;

  bool get _isEnabled => widget.onPressed != null;

  @override
  Widget build(BuildContext context) {
    final color = _isEnabled ? AppColors.primary : AppColors.border;
    final shadowColor = _isEnabled ? AppColors.buttonShadow : AppColors.border;

    return GestureDetector(
      onTapDown: _isEnabled ? (_) => setState(() => _isPressed = true) : null,
      onTapUp: _isEnabled
          ? (_) {
              setState(() => _isPressed = false);
              widget.onPressed!();
            }
          : null,
      onTapCancel: _isEnabled ? () => setState(() => _isPressed = false) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
        margin: EdgeInsets.only(
          top: _isPressed ? 4 : 0,
          bottom: _isPressed ? 0 : 4,
        ),
        decoration: BoxDecoration(
          color: color,
          borderRadius: AppRadius.borderRadiusFull,
          border: Border(
            bottom: BorderSide(
              color: _isPressed ? color : shadowColor,
              width: _isPressed ? 0 : 4,
            ),
          ),
        ),
        child: Center(
          child: Text(
            widget.label,
            style: AppTypography.button.copyWith(
              color: _isEnabled ? Colors.white : AppColors.textDisabled,
            ),
          ),
        ),
      ),
    );
  }
}

enum QuestionType { info, slider, choice, input, sorting }

class _QuestionData {
  final QuestionType type;
  final String title;
  final String content;
  final SliderConfig? sliderConfig;
  final double? targetValue;
  final double? tolerance;
  final List<String>? options;
  final int? correctIndex;
  final String? correctAnswer;
  final List<String>? sortingItems;
  final List<String>? correctOrder;
  final String? successMsg;
  final String? failMsg;
  final String? failMsgHigh;
  final String? failMsgLow;
  final bool isLast;

  _QuestionData({
    required this.type,
    required this.title,
    required this.content,
    this.sliderConfig,
    this.targetValue,
    this.tolerance,
    this.options,
    this.correctIndex,
    this.correctAnswer,
    this.sortingItems,
    this.correctOrder,
    this.successMsg,
    this.failMsg,
    this.failMsgHigh,
    this.failMsgLow,
    this.isLast = false,
  });
}
