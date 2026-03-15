import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:confetti/confetti.dart';
import 'package:provider/provider.dart';
import '../theme/theme.dart';
import '../components/interactions/slider_interaction.dart'
    show InteractiveSlider;
import '../components/feedback/feedback_dialog.dart';
import '../models/unit_model.dart';
import '../providers/user_provider.dart';
import '../providers/language_provider.dart';
import '../l10n/app_localizations.dart';
import '../services/audio_service.dart';
import '../services/supabase_service.dart';
import 'lesson_result_screen.dart';

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
  // ── Loading state ─────────────────────────────────────────────
  bool _loadingLesson = true;
  bool _contentUnavailable = false;
  String? _resolvedLessonTitle;

  // ── Question state ────────────────────────────────────────────
  List<_QuestionData> _questions = [];
  int _currentIndex = 0;
  double _sliderValue = 50;
  String? _selectedOption;
  final _inputController = TextEditingController();
  List<String> _sortingOrder = [];

  // ── Matching state ────────────────────────────────────────────
  String? _selectedLeftItem;
  Map<String, String> _matchingState = {}; // left item → right item

  // ── Hint state ────────────────────────────────────────────────
  int _hintsUsed = 0;
  bool _hintVisible = false;

  // ── Transition key (AnimatedSwitcher) ─────────────────────────
  int _questionAnimKey = 0;

  // ── Answer tracking ───────────────────────────────────────────
  int _correctCount = 0;
  int _totalCount = 0;

  // ── Supporting services ───────────────────────────────────────
  late ConfettiController _confettiController;
  final _audioService = AudioService.getInstance();
  final DateTime _startTime = DateTime.now();

  String _title(AppLocalizations t) {
    final title = _firstNonEmptyString([
      _resolvedLessonTitle,
      widget.lessonTitle,
    ]);
    return title.isNotEmpty ? title : t.lessonDefaultTitle;
  }

  AppLocalizations get _t => context.read<LanguageProvider>().t;

  String _i18n({required String en, required String zh}) {
    return _t.isZh ? zh : en;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 3),
    );
    _initLesson();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _initLesson() async {
    final lessonId = widget.lessonId;
    List<_QuestionData> questions = [];
    String resolvedLessonTitle = '';

    try {
      if (lessonId != null && lessonId != 'daily') {
        final content = await SupabaseService.getLessonContent(lessonId);
        if (content != null) {
          resolvedLessonTitle = _firstNonEmptyString([content['title']]);
          questions = _parseContentJson(content);
        }
        if (questions.isEmpty) {
          _contentUnavailable = true;
          questions = _contentUnavailableQuestions();
        }
      } else {
        questions = _demoQuestions();
      }
    } catch (_) {
      if (lessonId != null && lessonId != 'daily') {
        _contentUnavailable = true;
        questions = _contentUnavailableQuestions();
      } else {
        questions = _demoQuestions();
      }
    }

    if (!mounted) return;
    setState(() {
      _resolvedLessonTitle = _firstNonEmptyString([
        _resolvedLessonTitle,
        resolvedLessonTitle,
      ]);
      _questions = questions;
      _loadingLesson = false;
      // Init slider value from first question if it's a slider
      if (questions.isNotEmpty &&
          questions[0].type == QuestionType.slider &&
          questions[0].sliderConfig != null) {
        _sliderValue = questions[0].sliderConfig!.defaultValue;
      }
      // Init sorting order from first sorting question
      for (final q in questions) {
        if (q.type == QuestionType.sorting && q.sortingItems != null) {
          _sortingOrder = List.from(q.sortingItems!);
          break;
        }
      }
    });
  }

  // ── Content JSON parser ───────────────────────────────────────

  /// Detects content_json format and delegates to the appropriate parser.
  /// Handles two formats:
  ///   1. DB list format: [{block_id, type, content, config, sort_key}]
  ///   2. Builder JSON map format: {pages|lessons|blocks: ...}
  List<_QuestionData> _parseContentJson(Map<String, dynamic> lesson) {
    dynamic raw = lesson['content_json'];
    if (raw == null) return [];

    List<_QuestionData> questions;
    try {
      if (raw is String && raw.trim().isNotEmpty) {
        raw = jsonDecode(raw);
      }

      if (raw is List) {
        questions = _parseDbBlocks(
          raw.whereType<Map>().cast<Map<String, dynamic>>().toList(),
        );
      } else if (raw is Map) {
        final map = Map<String, dynamic>.from(raw);
        final lessons = map['lessons'];
        final pages = map['pages'];

        if (lessons is List && lessons.isNotEmpty) {
          questions = _parseBuilderLessons(
            lessons.whereType<Map>().cast<Map<String, dynamic>>().toList(),
            currentLessonId: lesson['id']?.toString(),
            currentLessonTitle: lesson['title']?.toString(),
          );
        } else if (pages is List && pages.isNotEmpty) {
          questions = _parseBuilderPages(
            pages.whereType<Map>().cast<Map<String, dynamic>>().toList(),
          );
        } else if (map['blocks'] is List) {
          questions = _parseBuilderPages([
            {
              'title': lesson['title'] ?? _i18n(en: 'Lesson', zh: '课程'),
              'blocks': map['blocks'],
            },
          ]);
        } else {
          questions = [];
        }
      } else {
        questions = [];
      }
    } catch (_) {
      questions = [];
    }

    if (questions.isEmpty) return [];

    // Always append a completion card
    questions.add(
      _QuestionData(
        type: QuestionType.info,
        title: _i18n(en: 'Lesson Complete!', zh: '课程完成！'),
        content: _i18n(
          en: 'Great job! You\'ve finished this lesson.\n\nKeep learning every day!',
          zh: '做得很棒！你已完成本节课程。\n\n坚持每天学习，进步会更快！',
        ),
        isLast: true,
      ),
    );

    return questions;
  }

  /// Parse full course snapshot format:
  /// {lessons: [{lessonId|pageId|id, title, blocks: [...]}, ...]}
  /// and pick the lesson that matches the current lesson row.
  List<_QuestionData> _parseBuilderLessons(
    List<Map<String, dynamic>> lessons, {
    String? currentLessonId,
    String? currentLessonTitle,
  }) {
    if (lessons.isEmpty) return const [];

    int targetIndex = -1;
    final normalizedCurrentId = (currentLessonId ?? '').trim().toLowerCase();
    final normalizedCurrentTitle = (currentLessonTitle ?? '')
        .trim()
        .toLowerCase();

    if (normalizedCurrentId.isNotEmpty) {
      targetIndex = lessons.indexWhere((lesson) {
        final lessonId = _firstNonEmptyString([
          lesson['lessonId'],
          lesson['pageId'],
          lesson['id'],
        ]).toLowerCase();
        return lessonId.isNotEmpty && lessonId == normalizedCurrentId;
      });
    }

    if (targetIndex < 0 && normalizedCurrentTitle.isNotEmpty) {
      targetIndex = lessons.indexWhere((lesson) {
        final title = _firstNonEmptyString([lesson['title']]).toLowerCase();
        return title.isNotEmpty && title == normalizedCurrentTitle;
      });
    }

    final selected = lessons[targetIndex >= 0 ? targetIndex : 0];
    final selectedTitle = _firstNonEmptyString([
      selected['title'],
      currentLessonTitle,
      _i18n(en: 'Lesson', zh: '课程'),
    ]);

    final blocks = (selected['blocks'] as List? ?? [])
        .whereType<Map>()
        .map((b) => Map<String, dynamic>.from(b))
        .toList();
    if (blocks.isEmpty) return const [];

    return _parseBuilderPages([
      {'title': selectedTitle, 'blocks': blocks},
    ]);
  }

  /// Parse DB list format: [{block_id, type, content, config, sort_key}]
  List<_QuestionData> _parseDbBlocks(List<Map<String, dynamic>> blocks) {
    blocks.sort(
      (a, b) => ((a['sort_key'] as int?) ?? 0).compareTo(
        (b['sort_key'] as int?) ?? 0,
      ),
    );

    final questions = <_QuestionData>[];
    for (final block in blocks) {
      final type = block['type'] as String? ?? '';
      final content = _toMap(block['content']);
      final config = _toMap(block['config']);
      final parsed = _parseBlock(
        type: type,
        content: content,
        config: config,
        pageTitle: '',
      );
      if (parsed != null) questions.add(parsed);
    }
    return questions;
  }

  /// Parse Builder JSON map format: {pages: [{title, blocks: [{type, content}]}]}
  List<_QuestionData> _parseBuilderPages(List<Map<String, dynamic>> pages) {
    final questions = <_QuestionData>[];

    for (final page in pages) {
      final pageTitle = page['title'] as String? ?? '';
      final blocks = (page['blocks'] as List? ?? [])
          .whereType<Map>()
          .map((b) => Map<String, dynamic>.from(b))
          .toList();

      for (final block in blocks) {
        final type = block['type'] as String? ?? '';
        final content = _toMap(block['content']);
        final parsed = _parseBlock(
          type: type,
          content: content,
          config: const {},
          pageTitle: pageTitle,
        );
        if (parsed != null) questions.add(parsed);
      }
    }

    return questions;
  }

  _QuestionData? _parseBlock({
    required String type,
    required Map<String, dynamic> content,
    required Map<String, dynamic> config,
    required String pageTitle,
  }) {
    final normalizedType = type.trim().toLowerCase().replaceAll('_', '-');

    switch (normalizedType) {
      case 'info-card':
      case 'text':
        final body = _firstNonEmptyString([
          content['value'],
          content['text'],
          content['body'],
          content['description'],
          config['text'],
          config['body'],
        ]);
        final title = _firstNonEmptyString([content['title']]);
        if (body.isEmpty) return null;
        return _QuestionData(
          type: QuestionType.info,
          title: title,
          content: body,
        );

      case 'multiple-choice':
        final promptTitle = _firstNonEmptyString([
          content['question'],
          content['title'],
          pageTitle,
          _i18n(en: 'Question', zh: '问题'),
        ]);
        final promptBody = _firstNonEmptyString([
          content['body'],
          content['description'],
          config['body'],
        ]);

        final rawOptions = content['options'] ?? config['options'];
        final options = <String>[];
        final optionIds = <String?>[];
        int? inferredCorrectIndex;

        if (rawOptions is List) {
          for (final option in rawOptions) {
            if (option is String && option.trim().isNotEmpty) {
              options.add(option.trim());
              optionIds.add(null);
              continue;
            }
            if (option is Map) {
              final map = Map<String, dynamic>.from(option);
              final text = _firstNonEmptyString([
                map['text'],
                map['label'],
                map['value'],
              ]);
              if (text.isEmpty) continue;
              options.add(text);
              optionIds.add((map['id'] as String?)?.trim());
              if (map['isCorrect'] == true && inferredCorrectIndex == null) {
                inferredCorrectIndex = options.length - 1;
              }
            }
          }
        }

        if (options.isEmpty) return null;

        final correctIndexRaw =
            config['correct_index'] ??
            config['correctIndex'] ??
            content['correct_index'] ??
            content['correctIndex'];
        int? correctIndex = _toInt(correctIndexRaw);

        if (correctIndex == null ||
            correctIndex < 0 ||
            correctIndex >= options.length) {
          correctIndex = inferredCorrectIndex;
        }

        if (correctIndex == null) {
          final candidateAnswers = <String>[
            _firstNonEmptyString([
              content['correctAnswer'],
              content['correct_answer'],
              config['correctAnswer'],
              config['correct_answer'],
            ]),
            ..._toStringList(content['correctAnswers']),
            ..._toStringList(config['correctAnswers']),
          ].where((e) => e.isNotEmpty).toList();

          for (final candidate in candidateAnswers) {
            final lower = candidate.toLowerCase();
            final byId = optionIds.indexWhere(
              (id) => id != null && id.toLowerCase() == lower,
            );
            if (byId >= 0) {
              correctIndex = byId;
              break;
            }
            final byText = options.indexWhere(
              (text) => text.toLowerCase() == lower,
            );
            if (byText >= 0) {
              correctIndex = byText;
              break;
            }
          }
        }
        correctIndex ??= 0;

        return _QuestionData(
          type: QuestionType.choice,
          title: promptTitle,
          content: promptBody,
          options: options,
          correctIndex: correctIndex,
          successMsg: _firstNonEmptyString([
            config['success_msg'],
            config['successMsg'],
            content['success_msg'],
            content['explanation'],
            _i18n(en: 'Correct!', zh: '回答正确！'),
          ]),
          failMsg: _firstNonEmptyString([
            config['fail_msg'],
            config['failMsg'],
            content['fail_msg'],
            _i18n(en: "That's not right. Try again!", zh: '不太对，再试一次！'),
          ]),
        );

      case 'slider':
        final min = _toDouble(config['min'] ?? content['min'], 0);
        final max = _toDouble(config['max'] ?? content['max'], 100);
        final step = _toDouble(config['step'] ?? content['step'], 1);
        final defaultValue = _toDouble(
          config['default'] ??
              config['defaultValue'] ??
              config['default_value'] ??
              content['default'] ??
              content['defaultValue'] ??
              content['default_value'],
          50,
        );
        final targetValue = _toDouble(
          config['target'] ??
              config['targetValue'] ??
              content['target'] ??
              content['targetValue'],
          defaultValue,
        );
        final tolerance = _toDouble(
          config['tolerance'] ?? content['tolerance'],
          5,
        );
        final unit = _firstNonEmptyString([config['unit'], content['unit']]);

        return _QuestionData(
          type: QuestionType.slider,
          title: _firstNonEmptyString([
            content['title'],
            content['question'],
            pageTitle,
            _i18n(en: 'Adjust Value', zh: '调整数值'),
          ]),
          content: _firstNonEmptyString([
            content['body'],
            content['description'],
            config['description'],
          ]),
          sliderConfig: SliderConfig(
            min: min,
            max: max,
            step: step,
            defaultValue: defaultValue,
            unit: unit,
            showValue: true,
          ),
          targetValue: targetValue,
          tolerance: tolerance,
          successMsg: _firstNonEmptyString([
            config['success_msg'],
            config['successMsg'],
            content['success_msg'],
            _i18n(en: 'Great!', zh: '很好！'),
          ]),
          failMsgHigh: _firstNonEmptyString([
            config['fail_msg_high'],
            content['fail_msg_high'],
            _i18n(en: 'Too high!', zh: '太高了！'),
          ]),
          failMsgLow: _firstNonEmptyString([
            config['fail_msg_low'],
            content['fail_msg_low'],
            _i18n(en: 'Too low!', zh: '太低了！'),
          ]),
        );

      case 'fill-blank':
        final question = _firstNonEmptyString([
          content['question'],
          '${_firstNonEmptyString([content['before']])} ____ ${_firstNonEmptyString([content['after']])}'
              .trim(),
        ]);
        final answer = _firstNonEmptyString([
          content['correctAnswer'],
          content['answer'],
          config['correctAnswer'],
          config['answer'],
        ]);
        if (question.isEmpty || answer.isEmpty) return null;
        final hint = _firstNonEmptyString([content['hint'], config['hint']]);
        return _QuestionData(
          type: QuestionType.input,
          title: _firstNonEmptyString([
            pageTitle,
            _i18n(en: 'Fill in the Blank', zh: '填空题'),
          ]),
          content: hint.isNotEmpty
              ? '$question\n\n${_i18n(en: 'Hint', zh: '提示')}: $hint'
              : question,
          correctAnswer: answer,
          successMsg: _firstNonEmptyString([
            content['success_msg'],
            config['success_msg'],
            _i18n(en: 'Correct!', zh: '回答正确！'),
          ]),
          failMsg: _firstNonEmptyString([
            content['fail_msg'],
            config['fail_msg'],
            _i18n(en: 'Not quite. Try again!', zh: '还不完全正确，再试一次！'),
          ]),
        );

      case 'true-false':
        final statement = _firstNonEmptyString([
          content['question'],
          content['statement'],
        ]);
        if (statement.isEmpty) return null;
        final isTrue = _toBool(
          content['correctAnswer'] ?? content['isTrue'],
          true,
        );
        final explanation = _firstNonEmptyString([
          content['explanation'],
          config['explanation'],
        ]);
        return _QuestionData(
          type: QuestionType.choice,
          title: _i18n(en: 'True or False?', zh: '判断正误'),
          content: statement,
          options: [
            _i18n(en: 'True', zh: '正确'),
            _i18n(en: 'False', zh: '错误'),
          ],
          correctIndex: isTrue ? 0 : 1,
          successMsg: explanation.isNotEmpty
              ? explanation
              : _i18n(en: 'Correct!', zh: '回答正确！'),
          failMsg: explanation.isNotEmpty
              ? explanation
              : _i18n(en: "That's not right. Try again!", zh: '不太对，再试一次！'),
        );

      case 'code-block':
        final code = _firstNonEmptyString([content['code']]);
        if (code.isEmpty) return null;
        final language = _firstNonEmptyString([content['language']]);
        return _QuestionData(
          type: QuestionType.info,
          title: pageTitle.isNotEmpty
              ? pageTitle
              : (language.isNotEmpty
                    ? '${language.toUpperCase()} ${_i18n(en: 'Code', zh: '代码')}'
                    : _i18n(en: 'Code', zh: '代码')),
          content: '```${language.isNotEmpty ? language : ''}\n$code\n```',
        );

      case 'code-playground':
        final expectedOutput = _firstNonEmptyString([
          content['expectedOutput'],
          content['expected_output'],
        ]);
        final starterCode = _firstNonEmptyString([
          content['initialCode'],
          content['starterCode'],
        ]);
        if (expectedOutput.isNotEmpty) {
          return _QuestionData(
            type: QuestionType.input,
            title: _firstNonEmptyString([
              pageTitle,
              _i18n(en: 'Code Challenge', zh: '代码挑战'),
            ]),
            content: starterCode.isNotEmpty
                ? '${_i18n(en: 'Starting code', zh: '初始代码')}:\n$starterCode\n\n${_i18n(en: 'Expected output', zh: '期望输出')}: $expectedOutput'
                : '${_i18n(en: 'Expected output', zh: '期望输出')}: $expectedOutput',
            correctAnswer: expectedOutput,
            successMsg: _i18n(en: 'Correct output!', zh: '输出正确！'),
            failMsg: _i18n(
              en: "Output doesn't match. Try again!",
              zh: '输出不匹配，再试一次！',
            ),
          );
        }
        if (starterCode.isNotEmpty) {
          return _QuestionData(
            type: QuestionType.info,
            title: _firstNonEmptyString([
              pageTitle,
              _i18n(en: 'Code Example', zh: '代码示例'),
            ]),
            content: starterCode,
          );
        }
        return null;

      case 'image':
        final caption = _firstNonEmptyString([content['caption']]);
        final alt = _firstNonEmptyString([content['alt']]);
        final url = _firstNonEmptyString([content['url']]);
        if (url.isEmpty && caption.isEmpty && alt.isEmpty) return null;
        return _QuestionData(
          type: QuestionType.info,
          title: _firstNonEmptyString([
            pageTitle,
            _i18n(en: 'Visual', zh: '可视内容'),
          ]),
          content: _firstNonEmptyString([caption, alt]),
          imageUrl: url.isNotEmpty ? url : null,
        );

      case 'matching':
        final question = _firstNonEmptyString([
          content['question'],
          pageTitle,
          _i18n(en: 'Matching', zh: '配对题'),
        ]);
        final leftItems = _extractItemTexts(content['leftItems']);
        final rightItems = _extractItemTexts(content['rightItems']);
        if (leftItems.isEmpty || rightItems.isEmpty) return null;
        // Build correct pairs map: left text → right text
        final Map<String, String> correctPairs = {};
        final rawPairs = content['pairs'];
        if (rawPairs is List) {
          for (final pair in rawPairs) {
            if (pair is Map) {
              final left = _firstNonEmptyString([pair['left'], pair['leftId']]);
              final right =
                  _firstNonEmptyString([pair['right'], pair['rightId']]);
              if (left.isNotEmpty && right.isNotEmpty) {
                correctPairs[left] = right;
              }
            }
          }
        }
        // If no explicit pairs, assume positional matching
        if (correctPairs.isEmpty) {
          final len = leftItems.length < rightItems.length
              ? leftItems.length
              : rightItems.length;
          for (int i = 0; i < len; i++) {
            correctPairs[leftItems[i]] = rightItems[i];
          }
        }
        return _QuestionData(
          type: QuestionType.matching,
          title: question,
          content: '',
          matchingLeftItems: leftItems,
          matchingRightItems: List.from(rightItems)..shuffle(),
          matchingCorrectPairs: correctPairs,
          successMsg: _i18n(en: 'All pairs matched!', zh: '所有配对都正确！'),
          failMsg: _i18n(
            en: 'Some pairs are incorrect. Try again!',
            zh: '有些配对不正确，再试一次！',
          ),
          hints: leftItems
              .where((l) => correctPairs.containsKey(l))
              .take(3)
              .map((l) => '"$l" → "${correctPairs[l]}"')
              .toList(),
        );

      case 'animation':
      case 'video':
        return _QuestionData(
          type: QuestionType.info,
          title: _firstNonEmptyString([
            pageTitle,
            _i18n(en: 'Interactive Content', zh: '互动内容'),
          ]),
          content: _i18n(
            en: 'This block type is not interactive in Viewer yet.',
            zh: '该内容类型在 Viewer 中暂不支持交互。',
          ),
        );
    }
    return null;
  }

  Map<String, dynamic> _toMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  String _firstNonEmptyString(List<dynamic> values) {
    for (final value in values) {
      if (value is String) {
        final trimmed = value.trim();
        if (trimmed.isNotEmpty) return trimmed;
      }
    }
    return '';
  }

  List<String> _toStringList(dynamic value) {
    if (value is! List) return const [];
    return value
        .whereType<String>()
        .map((v) => v.trim())
        .where((v) => v.isNotEmpty)
        .toList();
  }

  int? _toInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  double _toDouble(dynamic value, double fallback) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? fallback;
    return fallback;
  }

  bool _toBool(dynamic value, bool fallback) {
    if (value is bool) return value;
    if (value is String) {
      final lowered = value.toLowerCase();
      if (lowered == 'true') return true;
      if (lowered == 'false') return false;
    }
    return fallback;
  }

  List<String> _extractItemTexts(dynamic value) {
    if (value is! List) return const [];
    final out = <String>[];
    for (final item in value) {
      if (item is String && item.trim().isNotEmpty) {
        out.add(item.trim());
        continue;
      }
      if (item is Map) {
        final text = _firstNonEmptyString([
          item['text'],
          item['label'],
          item['value'],
        ]);
        if (text.isNotEmpty) out.add(text);
      }
    }
    return out;
  }

  List<_QuestionData> _contentUnavailableQuestions() {
    return [
      _QuestionData(
        type: QuestionType.info,
        title: _i18n(en: 'Content unavailable', zh: '内容暂不可用'),
        content: _i18n(
          en: 'This lesson has no readable content in database yet.\n\nPlease open Builder and republish this course, then try again.',
          zh: '该课程在数据库中暂时没有可读取内容。\n\n请在 Builder 中重新发布课程后再试。',
        ),
        isLast: true,
      ),
    ];
  }

  // ── Demo questions (fallback) ─────────────────────────────────

  List<_QuestionData> _demoQuestions() {
    return [
      _QuestionData(
        type: QuestionType.info,
        title: _i18n(en: 'Welcome to This Lesson', zh: '欢迎来到本节课程'),
        content: _i18n(
          en: 'In this lesson, you will learn how to understand and master knowledge through interactive methods.\n\nAre you ready? Let\'s begin!',
          zh: '在本节课程中，你将通过互动方式理解并掌握知识。\n\n准备好了吗？让我们开始吧！',
        ),
      ),
      _QuestionData(
        type: QuestionType.slider,
        title: _i18n(en: 'Adjust Temperature', zh: '调整温度'),
        content: _i18n(
          en: 'Please adjust the water temperature to the ideal temperature for brewing green tea',
          zh: '请将水温调整到冲泡绿茶的理想温度',
        ),
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
        successMsg: _i18n(
          en: 'Great! Around 85°C is the ideal temperature for brewing green tea.',
          zh: '很好！约 85°C 是冲泡绿茶的理想温度。',
        ),
        failMsgHigh: _i18n(
          en: 'The temperature is too high, it will damage the nutrients in the tea leaves.',
          zh: '温度太高，会破坏茶叶中的营养成分。',
        ),
        failMsgLow: _i18n(
          en: 'The temperature is too low, it cannot fully release the aroma of the tea.',
          zh: '温度太低，无法充分释放茶香。',
        ),
      ),
      _QuestionData(
        type: QuestionType.choice,
        title: _i18n(en: 'Choose the Correct Answer', zh: '选择正确答案'),
        content: _i18n(
          en: 'Which of the following is a valid logical reasoning?',
          zh: '以下哪一项是有效的逻辑推理？',
        ),
        options: [
          _i18n(
            en: 'If it rains, the ground gets wet. The ground is wet, so it rained.',
            zh: '如果下雨，地面会湿。地面湿了，所以一定下过雨。',
          ),
          _i18n(
            en: 'If it rains, the ground gets wet. It rained, so the ground is wet.',
            zh: '如果下雨，地面会湿。下雨了，所以地面是湿的。',
          ),
          _i18n(
            en: 'If the ground is wet, it will rain. The ground is wet, so it rained.',
            zh: '如果地面湿，就会下雨。地面湿了，所以一定下过雨。',
          ),
          _i18n(
            en: 'If it doesn\'t rain, the ground won\'t be wet. The ground is not wet, so it didn\'t rain.',
            zh: '如果不下雨，地面不会湿。地面不湿，所以没有下雨。',
          ),
        ],
        correctIndex: 1,
        successMsg: _i18n(
          en: 'Correct! This is a valid modus ponens reasoning.',
          zh: '回答正确！这是一个有效的肯定前件推理。',
        ),
        failMsg: _i18n(
          en: 'This reasoning contains a logical fallacy, please think again.',
          zh: '该推理存在逻辑谬误，请再思考一下。',
        ),
      ),
      _QuestionData(
        type: QuestionType.sorting,
        title: _i18n(en: 'Sorting Question', zh: '排序题'),
        content: _i18n(
          en: 'Please arrange the following numbers in ascending order:',
          zh: '请将下列数字按升序排列：',
        ),
        sortingItems: ['42', '15', '8', '23', '31'],
        correctOrder: ['8', '15', '23', '31', '42'],
        successMsg: _i18n(en: 'Sorting correct!', zh: '排序正确！'),
        failMsg: _i18n(
          en: 'The order is incorrect, please try again.',
          zh: '顺序不正确，请重试。',
        ),
      ),
      _QuestionData(
        type: QuestionType.input,
        title: _i18n(en: 'Calculation', zh: '计算题'),
        content: _i18n(
          en: 'If a square has a side length of 5, what is its area?',
          zh: '如果正方形边长为 5，它的面积是多少？',
        ),
        correctAnswer: '25',
        successMsg: _i18n(
          en: 'Absolutely correct! Square area = side × side = 5 × 5 = 25',
          zh: '完全正确！正方形面积 = 边长 × 边长 = 5 × 5 = 25。',
        ),
        failMsg: _i18n(
          en: 'Incorrect answer, remember: square area = side × side',
          zh: '答案不正确，记住：正方形面积 = 边长 × 边长。',
        ),
      ),
      _QuestionData(
        type: QuestionType.info,
        title: _i18n(en: 'Congratulations!', zh: '恭喜你！'),
        content: _i18n(
          en: 'You have completed this lesson.\n\nKeep going, learn a little every day, and you\'ll get better and better!',
          zh: '你已经完成本节课程。\n\n继续加油，每天学一点，你会越来越好！',
        ),
        isLast: true,
      ),
    ];
  }

  // ── Answer logic ──────────────────────────────────────────────

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

      case QuestionType.choice:
        isCorrect =
            _selectedOption == question.options![question.correctIndex!];
        feedbackMsg = question.failMsg!;

      case QuestionType.input:
        isCorrect = _inputController.text.trim() == question.correctAnswer;
        feedbackMsg = question.failMsg!;

      case QuestionType.sorting:
        isCorrect = _listEquals(_sortingOrder, question.correctOrder!);
        feedbackMsg = question.failMsg!;

      case QuestionType.matching:
        final pairs = question.matchingCorrectPairs ?? {};
        isCorrect = pairs.isNotEmpty &&
            pairs.entries.every((e) => _matchingState[e.key] == e.value);
        feedbackMsg =
            question.failMsg ?? _i18n(en: 'Not quite right!', zh: '还有些不对！');

      case QuestionType.info:
        _nextQuestion();
        return;
    }

    // Track answer stats (skip info blocks)
    if (question.type != QuestionType.info) {
      _totalCount++;
      if (isCorrect) _correctCount++;
    }

    if (isCorrect) {
      await _audioService.playCorrect();
      if (!mounted) return;
      context.read<UserProvider>().completeQuestion();
      context.showSuccessFeedback(
        message: question.successMsg!,
        onContinue: _nextQuestion,
      );
    } else {
      await _audioService.playWrong();
      if (!mounted) return;
      context.showFailureFeedback(message: feedbackMsg, onRetry: () {});
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
        final nextQ = _questions[_currentIndex];
        _sliderValue = nextQ.sliderConfig?.defaultValue ?? 50;
        _selectedOption = null;
        _inputController.clear();
        if (nextQ.type == QuestionType.sorting && nextQ.sortingItems != null) {
          _sortingOrder = List.from(nextQ.sortingItems!);
        }
        _selectedLeftItem = null;
        _matchingState = {};
        _hintsUsed = 0;
        _hintVisible = false;
        _questionAnimKey++;
      });
    } else {
      // Lesson complete
      _confettiController.play();
      await _audioService.playComplete();

      final userProvider = mounted ? context.read<UserProvider>() : null;
      final lessonId = widget.lessonId;
      final elapsed = DateTime.now().difference(_startTime).inSeconds;
      final studyMinutes = DateTime.now().difference(_startTime).inMinutes;

      Map<String, dynamic> rpcResult = {};
      if (lessonId != null && lessonId != 'daily') {
        final result = await SupabaseService.completeLessonAndAwardXp(
          lessonId: lessonId,
          score: _totalCount > 0
              ? ((_correctCount / _totalCount) * 100).round()
              : 100,
          timeSpentSeconds: elapsed,
          correctCount: _correctCount,
          totalCount: _totalCount,
        );
        rpcResult = result ?? {};
        await userProvider?.refreshStats();
      }

      if (studyMinutes > 0) {
        await userProvider?.recordStudy(studyMinutes);
      }

      // Short confetti burst then go to result screen
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;

      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => LessonResultScreen(
            lessonId: lessonId ?? '',
            lessonTitle: _firstNonEmptyString([
              _resolvedLessonTitle,
              widget.lessonTitle,
            ]),
            rpcResult: rpcResult,
            correctCount: _correctCount,
            totalCount: _totalCount,
            timeSpentSeconds: elapsed,
            currentStreak: userProvider?.streak ?? 0,
          ),
        ),
      );
    }
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;

    if (_loadingLesson) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final question = _questions[_currentIndex];
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                _buildHeader(isDark, t),
                _buildProgressBar(),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 320),
                    transitionBuilder: (child, animation) {
                      final slide = Tween<Offset>(
                        begin: const Offset(0.06, 0),
                        end: Offset.zero,
                      ).animate(
                        CurvedAnimation(
                          parent: animation,
                          curve: Curves.easeOutCubic,
                        ),
                      );
                      return SlideTransition(
                        position: slide,
                        child: FadeTransition(
                          opacity: animation,
                          child: child,
                        ),
                      );
                    },
                    child: SingleChildScrollView(
                      key: ValueKey(_questionAnimKey),
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: _buildQuestionContent(question, isDark, t),
                    ),
                  ),
                ),
                _buildBottomBar(question, isDark, t),
              ],
            ),
          ),
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

  Widget _buildHeader(bool isDark, AppLocalizations t) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => _showExitDialog(t),
            icon: const Icon(Icons.close),
            color: isDark
                ? AppColors.textSecondaryOnDark
                : AppColors.textSecondary,
          ),
          Expanded(
            child: Text(
              _title(t),
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
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) => Stack(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeInOut,
              width: constraints.maxWidth * progress,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: AppRadius.borderRadiusFull,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionContent(
    _QuestionData question,
    bool isDark,
    AppLocalizations t,
  ) {
    final showQuestionTitle =
        question.title.trim().isNotEmpty &&
        !_isSameDisplayTitle(question.title, _title(t));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showQuestionTitle)
          Text(
            question.title,
            style: AppTypography.headline2.copyWith(
              color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
            ),
          ),
        if (showQuestionTitle) const SizedBox(height: AppSpacing.md),
        // Image block
        if (question.imageUrl != null) ...[
          ClipRRect(
            borderRadius: AppRadius.borderRadiusLg,
            child: Image.network(
              question.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 160,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : AppColors.surfaceVariant,
                  borderRadius: AppRadius.borderRadiusLg,
                ),
                child: Icon(
                  Icons.broken_image_outlined,
                  color: AppColors.textDisabled,
                  size: 40,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        if (question.content.isNotEmpty)
          _buildMarkdownContent(question.content, isDark),
        // Hint bubble
        if (_hintVisible &&
            question.hints != null &&
            _hintsUsed > 0 &&
            _hintsUsed <= (question.hints?.length ?? 0)) ...[
          const SizedBox(height: AppSpacing.md),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: AppRadius.borderRadiusLg,
              border: Border.all(color: const Color(0xFFF59E0B), width: 1),
            ),
            child: Row(
              children: [
                const Text('💡', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    question.hints![_hintsUsed - 1],
                    style: AppTypography.body2.copyWith(
                      color: const Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.xl),
        _buildInteractionWidget(question, isDark, t),
      ],
    );
  }

  Widget _buildMarkdownContent(String content, bool isDark) {
    final textColor = isDark ? AppColors.textOnDark : AppColors.textPrimary;
    final baseText = AppTypography.body1.copyWith(
      height: 1.6,
      color: textColor,
    );
    final codeBackground = isDark
        ? AppColors.cardDark
        : AppColors.surfaceVariant;

    return MarkdownBody(
      data: content,
      styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
        p: baseText,
        h1: AppTypography.headline1.copyWith(color: textColor),
        h2: AppTypography.headline2.copyWith(color: textColor),
        h3: AppTypography.headline3.copyWith(color: textColor),
        h4: AppTypography.title.copyWith(color: textColor),
        code: AppTypography.body2.copyWith(
          color: textColor,
          backgroundColor: codeBackground,
          fontFamily: 'monospace',
        ),
        blockquote: baseText.copyWith(fontStyle: FontStyle.italic),
        listBullet: baseText,
        codeblockPadding: const EdgeInsets.all(AppSpacing.md),
        codeblockDecoration: BoxDecoration(
          color: codeBackground,
          borderRadius: AppRadius.borderRadiusLg,
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.border,
          ),
        ),
      ),
    );
  }

  bool _isSameDisplayTitle(String left, String right) {
    String normalize(String input) =>
        input.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();

    final a = normalize(left);
    final b = normalize(right);
    return a.isNotEmpty && b.isNotEmpty && a == b;
  }

  Widget _buildInteractionWidget(
    _QuestionData question,
    bool isDark,
    AppLocalizations t,
  ) {
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
          children: question.options!.asMap().entries.map((entry) {
            final index = entry.key;
            final option = entry.value;
            final isSelected = _selectedOption == option;
            final label = String.fromCharCode(65 + index); // A, B, C, D
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: GestureDetector(
                onTap: () {
                  _audioService.playClick();
                  setState(() => _selectedOption = option);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
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
                    boxShadow: isSelected ? AppShadows.sm : null,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary
                              : isDark
                              ? AppColors.surfaceDark
                              : AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(8),
                          border: isSelected
                              ? null
                              : Border.all(
                                  color: isDark
                                      ? AppColors.borderDark
                                      : AppColors.border,
                                ),
                        ),
                        child: Center(
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? Colors.white
                                  : isDark
                                  ? AppColors.textSecondaryOnDark
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
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
              if (oldIndex < newIndex) newIndex -= 1;
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
            hintText: t.lessonEnterAnswer,
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
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
          ),
        );

      case QuestionType.matching:
        return _MatchingInteractionWidget(
          leftItems: question.matchingLeftItems!,
          rightItems: question.matchingRightItems!,
          matches: _matchingState,
          selectedLeft: _selectedLeftItem,
          isDark: isDark,
          onLeftTap: (item) {
            setState(() {
              _selectedLeftItem = _selectedLeftItem == item ? null : item;
            });
          },
          onRightTap: (item) {
            if (_selectedLeftItem == null) return;
            _audioService.playClick();
            setState(() {
              // Unlink right item if already matched
              _matchingState.removeWhere((_, v) => v == item);
              _matchingState[_selectedLeftItem!] = item;
              _selectedLeftItem = null;
            });
          },
          onClearPair: (leftItem) {
            setState(() {
              _matchingState.remove(leftItem);
            });
          },
        );

      case QuestionType.info:
        if (question.isLast) {
          return Center(
            child: Container(
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
          );
        }
        return const SizedBox.shrink();
    }
  }

  Widget _buildBottomBar(
    _QuestionData question,
    bool isDark,
    AppLocalizations t,
  ) {
    final isInfoPage = question.type == QuestionType.info;
    final canSubmit =
        isInfoPage ||
        (question.type == QuestionType.choice && _selectedOption != null) ||
        (question.type == QuestionType.input &&
            _inputController.text.isNotEmpty) ||
        question.type == QuestionType.slider ||
        question.type == QuestionType.sorting ||
        (question.type == QuestionType.matching &&
            _matchingState.length ==
                (question.matchingLeftItems?.length ?? 0));

    final label = _contentUnavailable
        ? t.lessonBack
        : isInfoPage
        ? (question.isLast ? t.lessonComplete : t.lessonContinue)
        : t.lessonSubmit;

    final hasHints =
        !isInfoPage &&
        question.hints != null &&
        question.hints!.isNotEmpty;
    final hintsExhausted = hasHints && _hintsUsed >= (question.hints?.length ?? 0);

    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.md,
      ),
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
      child: Row(
        children: [
          // Hint button
          if (hasHints) ...[
            Tooltip(
              message: hintsExhausted
                  ? (t.isZh ? '已无更多提示' : 'No more hints')
                  : (t.isZh
                        ? '显示提示 ($_hintsUsed/${question.hints!.length})'
                        : 'Show hint ($_hintsUsed/${question.hints!.length})'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: hintsExhausted
                      ? (isDark ? AppColors.cardDark : AppColors.surfaceVariant)
                      : const Color(0xFFFEF3C7),
                  borderRadius: AppRadius.borderRadiusFull,
                  border: Border.all(
                    color: hintsExhausted
                        ? AppColors.border
                        : const Color(0xFFF59E0B),
                  ),
                ),
                child: IconButton(
                  onPressed: hintsExhausted
                      ? null
                      : () {
                          setState(() {
                            _hintsUsed++;
                            _hintVisible = true;
                          });
                        },
                  icon: Text(
                    '💡',
                    style: TextStyle(
                      fontSize: 18,
                      color: hintsExhausted ? null : null,
                    ),
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 44,
                    minHeight: 44,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          // Submit / Continue button
          Expanded(
            child: _Duo3DSubmitButton(
              onPressed: canSubmit
                  ? (_contentUnavailable
                        ? () => Navigator.pop(context)
                        : (isInfoPage ? _nextQuestion : _checkAnswer))
                  : null,
              label: label,
            ),
          ),
        ],
      ),
    );
  }

  void _showExitDialog(AppLocalizations t) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.lessonExitTitle),
        content: Text(t.lessonExitBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(t.cancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: Text(t.lessonExit, style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}

// ── Duolingo-style 3D submit button ──────────────────────────────

class _Duo3DSubmitButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final String label;

  const _Duo3DSubmitButton({required this.onPressed, required this.label});

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

// ── Data models ───────────────────────────────────────────────────

enum QuestionType { info, slider, choice, input, sorting, matching }

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
  // Matching
  final List<String>? matchingLeftItems;
  final List<String>? matchingRightItems;
  final Map<String, String>? matchingCorrectPairs;
  // Hints (shown on demand, up to 3)
  final List<String>? hints;
  // Image
  final String? imageUrl;

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
    this.matchingLeftItems,
    this.matchingRightItems,
    this.matchingCorrectPairs,
    this.hints,
    this.imageUrl,
  });
}

// ── Matching interaction widget ──────────────────────────────────

class _MatchingInteractionWidget extends StatelessWidget {
  final List<String> leftItems;
  final List<String> rightItems;
  final Map<String, String> matches; // left → right
  final String? selectedLeft;
  final bool isDark;
  final ValueChanged<String> onLeftTap;
  final ValueChanged<String> onRightTap;
  final ValueChanged<String> onClearPair;

  static const _pairColors = [
    Color(0xFF6366F1),
    Color(0xFF10B981),
    Color(0xFFF59E0B),
    Color(0xFFEF4444),
    Color(0xFF8B5CF6),
    Color(0xFF06B6D4),
  ];

  const _MatchingInteractionWidget({
    required this.leftItems,
    required this.rightItems,
    required this.matches,
    required this.selectedLeft,
    required this.isDark,
    required this.onLeftTap,
    required this.onRightTap,
    required this.onClearPair,
  });

  Color? _colorForLeftItem(String item) {
    final idx = matches.keys.toList().indexOf(item);
    if (idx < 0) return null;
    return _pairColors[idx % _pairColors.length];
  }

  Color? _colorForRightItem(String item) {
    final leftKey = matches.entries
        .where((e) => e.value == item)
        .map((e) => e.key)
        .firstOrNull;
    if (leftKey == null) return null;
    return _colorForLeftItem(leftKey);
  }

  @override
  Widget build(BuildContext context) {
    final surfaceColor = isDark ? AppColors.cardDark : AppColors.surface;
    final borderColor = isDark ? AppColors.borderDark : AppColors.border;

    Widget itemChip({
      required String text,
      required bool isSelected,
      required Color? matchColor,
      required VoidCallback onTap,
      bool isLeft = true,
    }) {
      return GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.1)
                : matchColor != null
                ? matchColor.withValues(alpha: 0.08)
                : surfaceColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : matchColor ?? borderColor,
              width: (isSelected || matchColor != null) ? 2 : 1,
            ),
            boxShadow: isSelected || matchColor != null
                ? [
                    BoxShadow(
                      color: (isSelected ? AppColors.primary : matchColor!)
                          .withValues(alpha: 0.15),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              if (isLeft && matchColor != null) ...[
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: matchColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Expanded(
                child: Text(
                  text,
                  style: AppTypography.body1.copyWith(
                    color: isDark ? AppColors.textOnDark : AppColors.textPrimary,
                    fontWeight: isSelected || matchColor != null
                        ? FontWeight.w600
                        : FontWeight.normal,
                  ),
                ),
              ),
              if (!isLeft && matchColor != null) ...[
                const SizedBox(width: 6),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: matchColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Instruction
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            isDark
                ? 'Tap left item, then tap matching right item'
                : selectedLeft != null
                ? 'Now tap the matching right item →'
                : 'Tap a left item to begin matching',
            style: AppTypography.body2.copyWith(
              color: isDark
                  ? AppColors.textSecondaryOnDark
                  : AppColors.textSecondary,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
        // Two columns
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left column
            Expanded(
              child: Column(
                children: leftItems
                    .map(
                      (item) => itemChip(
                        text: item,
                        isSelected: selectedLeft == item,
                        matchColor: _colorForLeftItem(item),
                        isLeft: true,
                        onTap: () => onLeftTap(item),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(width: 12),
            // Right column
            Expanded(
              child: Column(
                children: rightItems
                    .map(
                      (item) => itemChip(
                        text: item,
                        isSelected: false,
                        matchColor: _colorForRightItem(item),
                        isLeft: false,
                        onTap: () => onRightTap(item),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
        // Current matches summary
        if (matches.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: matches.entries.map((e) {
              final color = _colorForLeftItem(e.key) ?? AppColors.primary;
              return GestureDetector(
                onTap: () => onClearPair(e.key),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: color.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${e.key} → ${e.value}',
                        style: TextStyle(
                          fontSize: 11,
                          color: color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.close, size: 12, color: color),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}
