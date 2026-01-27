import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/interactions/slider_interaction.dart' show InteractiveSlider;
import '../components/feedback/feedback_dialog.dart';
import '../models/unit_model.dart';
import '../providers/user_provider.dart';
import '../services/audio_service.dart';

/// 课时/互动学习页 - Brilliant 风格
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

  // 彩带控制器
  late ConfettiController _confettiController;

  // 音效服务
  final _audioService = AudioService.getInstance();

  // 开始时间（用于计算学习时长）
  final DateTime _startTime = DateTime.now();

  // 获取默认渐变色
  LinearGradient get _gradient =>
      widget.gradient ?? AppColors.mathGradient;

  // 获取标题
  String get _title => widget.lessonTitle ?? '互动学习';

  // 示例题目数据
  final _questions = [
    _QuestionData(
      type: QuestionType.info,
      title: '欢迎来到本课时',
      content: '在这个课时中，你将学习如何通过互动方式理解和掌握知识。\n\n准备好了吗？让我们开始吧！',
    ),
    _QuestionData(
      type: QuestionType.slider,
      title: '调整温度',
      content: '请将水温调整到适合泡绿茶的温度',
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
      successMsg: '太棒了！85°C 左右是泡绿茶的最佳温度。',
      failMsgHigh: '温度太高了，会破坏茶叶中的营养成分。',
      failMsgLow: '温度太低了，无法充分释放茶叶的香味。',
    ),
    _QuestionData(
      type: QuestionType.choice,
      title: '选择正确答案',
      content: '下列哪个选项是正确的逻辑推理？',
      options: [
        '如果下雨，地面会湿。地面湿了，所以下雨了。',
        '如果下雨，地面会湿。下雨了，所以地面会湿。',
        '如果地面湿了，就会下雨。地面湿了，所以下雨了。',
        '如果不下雨，地面不会湿。地面不湿，所以没下雨。',
      ],
      correctIndex: 1,
      successMsg: '正确！这是一个有效的肯定前件推理。',
      failMsg: '这个推理存在逻辑谬误，请再想想。',
    ),
    _QuestionData(
      type: QuestionType.sorting,
      title: '排序题',
      content: '请按照从小到大的顺序排列以下数字：',
      sortingItems: ['42', '15', '8', '23', '31'],
      correctOrder: ['8', '15', '23', '31', '42'],
      successMsg: '排序正确！',
      failMsg: '顺序不对，请再试试。',
    ),
    _QuestionData(
      type: QuestionType.input,
      title: '计算题',
      content: '如果一个正方形的边长是 5，那么它的面积是多少？',
      correctAnswer: '25',
      successMsg: '完全正确！正方形面积 = 边长 × 边长 = 5 × 5 = 25',
      failMsg: '答案不对，记住正方形面积 = 边长 × 边长',
    ),
    _QuestionData(
      type: QuestionType.info,
      title: '恭喜完成！',
      content: '你已经完成了本课时的学习。\n\n继续保持，每天学习一点点，你会越来越棒！',
      isLast: true,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));

    // 初始化排序题的顺序
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

      // 记录完成题目
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

        // 重置排序题顺序
        final nextQuestion = _questions[_currentIndex];
        if (nextQuestion.type == QuestionType.sorting &&
            nextQuestion.sortingItems != null) {
          _sortingOrder = List.from(nextQuestion.sortingItems!);
        }
      });
    } else {
      // 完成课时 - 播放彩带和完成音效
      _confettiController.play();
      await _audioService.playComplete();

      // 记录学习时长
      final studyMinutes = DateTime.now().difference(_startTime).inMinutes;
      if (mounted && studyMinutes > 0) {
        await context.read<UserProvider>().recordStudy(studyMinutes);
      }

      // 延迟一下让用户看到彩带效果
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
                // 顶部栏
                _buildHeader(isDark),

                // 进度条
                _buildProgressBar(),

                // 内容区域
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: _buildQuestionContent(question, isDark),
                  ),
                ),

                // 底部按钮
                _buildBottomBar(question, isDark),
              ],
            ),
          ),

          // 彩带效果
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                AppColors.primary,
                AppColors.success,
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
              color: _gradient.colors.first.withValues(alpha: 0.1),
              borderRadius: AppRadius.borderRadiusFull,
            ),
            child: Text(
              '${_currentIndex + 1}/${_questions.length}',
              style: AppTypography.label.copyWith(
                color: _gradient.colors.first,
                fontWeight: FontWeight.w600,
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
      height: 4,
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
            gradient: _gradient,
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
        // 标题
        Text(
          question.title,
          style: AppTypography.headline2.copyWith(
            color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // 内容/题目
        Text(
          question.content,
          style: AppTypography.body1.copyWith(
            height: 1.6,
            color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // 互动组件
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
                        ? _gradient.colors.first.withValues(alpha: 0.1)
                        : isDark
                            ? AppColors.cardDark
                            : AppColors.surface,
                    borderRadius: AppRadius.borderRadiusLg,
                    border: Border.all(
                      color: isSelected
                          ? _gradient.colors.first
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
                              ? _gradient.colors.first
                              : Colors.transparent,
                          border: Border.all(
                            color: isSelected
                                ? _gradient.colors.first
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
                borderRadius: AppRadius.borderRadiusMd,
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
            hintText: '输入答案',
            hintStyle: AppTypography.headline2.copyWith(
              color: isDark
                  ? AppColors.textSecondaryOnDark
                  : AppColors.textDisabled,
            ),
            filled: true,
            fillColor: isDark ? AppColors.cardDark : AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: AppRadius.borderRadiusLg,
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.border,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.borderRadiusLg,
              borderSide: BorderSide(
                color: _gradient.colors.first,
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
        child: ElevatedButton(
          onPressed: canSubmit ? (isInfoPage ? _nextQuestion : _checkAnswer) : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: _gradient.colors.first,
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            disabledBackgroundColor: isDark ? AppColors.borderDark : AppColors.border,
          ),
          child: Text(
            isInfoPage
                ? (question.isLast ? '完成课时' : '继续')
                : '提交答案',
          ),
        ),
      ),
    );
  }

  void _showExitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确定退出？'),
        content: const Text('退出后当前进度将不会保存。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: Text(
              '退出',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
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
