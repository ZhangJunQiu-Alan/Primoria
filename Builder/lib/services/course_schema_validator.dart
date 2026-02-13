import '../models/models.dart';

/// Validation gate determines which checks are blocking.
enum CourseSchemaValidationMode { import, save, publish, export }

enum CourseSchemaFindingSeverity { warning, error }

class CourseSchemaFinding {
  final CourseSchemaFindingSeverity severity;
  final String path;
  final String message;

  const CourseSchemaFinding({
    required this.severity,
    required this.path,
    required this.message,
  });

  String toDisplayMessage() => '$path: $message';
}

class CourseSchemaValidationResult {
  final List<CourseSchemaFinding> findings;

  const CourseSchemaValidationResult({required this.findings});

  List<CourseSchemaFinding> get warnings => findings
      .where((f) => f.severity == CourseSchemaFindingSeverity.warning)
      .toList();

  List<CourseSchemaFinding> get errors => findings
      .where((f) => f.severity == CourseSchemaFindingSeverity.error)
      .toList();

  bool get hasBlockingErrors => errors.isNotEmpty;
  bool get isValid => !hasBlockingErrors;

  List<String> get warningMessages =>
      warnings.map((f) => f.toDisplayMessage()).toList();

  List<String> get errorMessages =>
      errors.map((f) => f.toDisplayMessage()).toList();
}

/// Centralized schema validation for import/save/publish/export.
class CourseSchemaValidator {
  CourseSchemaValidator._();

  static const String _rootPath = r'$';
  static const String _schemaUrl = Course.schemaUrl;
  static const String _schemaVersion = Course.schemaVersion;

  static final Map<String, BlockType> _blockTypesByValue = {
    for (final type in BlockType.values) type.value: type,
  };

  static CourseSchemaValidationResult validateCourse(
    Course course, {
    CourseSchemaValidationMode mode = CourseSchemaValidationMode.save,
  }) {
    return validateJsonMap(course.toJson(), mode: mode);
  }

  static CourseSchemaValidationResult validateJsonMap(
    Map<String, dynamic> json, {
    CourseSchemaValidationMode mode = CourseSchemaValidationMode.import,
  }) {
    final findings = <CourseSchemaFinding>[];
    final isStrict = _isStrictMode(mode);

    _validateSchemaMetadata(json, findings);
    _validateCourseId(json, findings);
    _validateMetadata(json, findings, isStrict: isStrict);
    _validatePages(json, findings, isStrict: isStrict);

    return CourseSchemaValidationResult(findings: findings);
  }

  static bool _isStrictMode(CourseSchemaValidationMode mode) {
    return mode == CourseSchemaValidationMode.publish ||
        mode == CourseSchemaValidationMode.export;
  }

  static void _validateSchemaMetadata(
    Map<String, dynamic> json,
    List<CourseSchemaFinding> findings,
  ) {
    final schemaPath = '$_rootPath.\$schema';
    if (!json.containsKey(r'$schema')) {
      _addWarning(findings, schemaPath, 'Missing schema URL');
    } else {
      final value = json[r'$schema'];
      if (value is! String) {
        _addWarning(findings, schemaPath, 'Expected a string');
      } else if (value != _schemaUrl) {
        _addWarning(
          findings,
          schemaPath,
          'Unexpected schema URL "$value" (expected "$_schemaUrl")',
        );
      }
    }

    final versionPath = '$_rootPath.schemaVersion';
    if (!json.containsKey('schemaVersion')) {
      _addWarning(findings, versionPath, 'Missing schemaVersion');
    } else {
      final value = json['schemaVersion'];
      if (value is! String) {
        _addWarning(findings, versionPath, 'Expected a string');
      } else if (value != _schemaVersion) {
        _addWarning(
          findings,
          versionPath,
          'Unsupported schemaVersion "$value" (expected "$_schemaVersion")',
        );
      }
    }
  }

  static void _validateCourseId(
    Map<String, dynamic> json,
    List<CourseSchemaFinding> findings,
  ) {
    final courseId = json['courseId'];
    if (courseId is! String) {
      _addError(findings, '$_rootPath.courseId', 'Missing or invalid string');
      return;
    }
    if (courseId.trim().isEmpty) {
      _addError(findings, '$_rootPath.courseId', 'Cannot be empty');
    }
  }

  static void _validateMetadata(
    Map<String, dynamic> json,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final metadataPath = '$_rootPath.metadata';
    final metadata = json['metadata'];
    if (metadata is! Map) {
      _addError(findings, metadataPath, 'Missing or invalid object');
      return;
    }

    final metadataMap = Map<String, dynamic>.from(metadata);

    final titlePath = '$metadataPath.title';
    final title = metadataMap['title'];
    if (title is! String) {
      _addError(findings, titlePath, 'Missing or invalid string');
    } else if (title.trim().isEmpty) {
      if (isStrict) {
        _addError(findings, titlePath, 'Cannot be empty');
      } else {
        _addWarning(findings, titlePath, 'Empty title');
      }
    }

    final difficultyPath = '$metadataPath.difficulty';
    final difficulty = metadataMap['difficulty'];
    if (difficulty != null && difficulty is! String) {
      _addError(findings, difficultyPath, 'Expected a string');
    } else if (difficulty is String &&
        difficulty.isNotEmpty &&
        !_isSupportedDifficulty(difficulty)) {
      _addWarning(findings, difficultyPath, 'Unknown difficulty "$difficulty"');
    }

    final minutesPath = '$metadataPath.estimatedMinutes';
    final estimatedMinutes = metadataMap['estimatedMinutes'];
    if (estimatedMinutes != null && estimatedMinutes is! int) {
      _addError(findings, minutesPath, 'Expected an integer');
    } else if (estimatedMinutes is int && estimatedMinutes < 0) {
      _addWarning(findings, minutesPath, 'Should be >= 0');
    }

    final createdAt = _parseDate(
      metadataMap['createdAt'],
      '$metadataPath.createdAt',
      findings,
    );
    final updatedAt = _parseDate(
      metadataMap['updatedAt'],
      '$metadataPath.updatedAt',
      findings,
    );

    if (createdAt != null &&
        updatedAt != null &&
        updatedAt.isBefore(createdAt)) {
      _addWarning(
        findings,
        '$metadataPath.updatedAt',
        'Should not be earlier than createdAt',
      );
    }
  }

  static DateTime? _parseDate(
    dynamic value,
    String path,
    List<CourseSchemaFinding> findings,
  ) {
    if (value == null) return null;
    if (value is! String) {
      _addWarning(findings, path, 'Expected ISO-8601 string');
      return null;
    }
    try {
      return DateTime.parse(value);
    } catch (_) {
      _addWarning(findings, path, 'Invalid ISO-8601 date');
      return null;
    }
  }

  static void _validatePages(
    Map<String, dynamic> json,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final pagesPath = '$_rootPath.pages';
    final pages = json['pages'];
    if (pages is! List) {
      _addError(findings, pagesPath, 'Missing or invalid list');
      return;
    }
    if (pages.isEmpty) {
      _addError(findings, pagesPath, 'Must contain at least one page');
      return;
    }

    final pageIds = <String>{};
    final blockIds = <String>{};

    for (int pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      final pagePath = '$pagesPath[$pageIndex]';
      final pageValue = pages[pageIndex];
      if (pageValue is! Map) {
        _addError(findings, pagePath, 'Expected object');
        continue;
      }

      final page = Map<String, dynamic>.from(pageValue);

      final pageIdPath = '$pagePath.pageId';
      final pageId = page['pageId'];
      if (pageId is! String || pageId.trim().isEmpty) {
        _addError(findings, pageIdPath, 'Missing or empty string');
      } else if (!pageIds.add(pageId)) {
        _addError(findings, pageIdPath, 'Duplicate pageId "$pageId"');
      }

      final pageTitlePath = '$pagePath.title';
      final pageTitle = page['title'];
      if (pageTitle is! String) {
        _addError(findings, pageTitlePath, 'Missing or invalid string');
      } else if (pageTitle.trim().isEmpty) {
        if (isStrict) {
          _addError(findings, pageTitlePath, 'Cannot be empty');
        } else {
          _addWarning(findings, pageTitlePath, 'Empty page title');
        }
      }

      final blocksPath = '$pagePath.blocks';
      final blocks = page['blocks'];
      if (blocks == null) {
        _addWarning(findings, blocksPath, 'Missing list; defaulting to empty');
        continue;
      }
      if (blocks is! List) {
        _addError(findings, blocksPath, 'Expected list');
        continue;
      }

      for (int blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        final blockPath = '$blocksPath[$blockIndex]';
        final blockValue = blocks[blockIndex];
        if (blockValue is! Map) {
          _addError(findings, blockPath, 'Expected object');
          continue;
        }

        final block = Map<String, dynamic>.from(blockValue);
        _validateBlock(
          block,
          blockPath,
          findings,
          blockIds: blockIds,
          blockIndex: blockIndex,
          isStrict: isStrict,
        );
      }
    }
  }

  static void _validateBlock(
    Map<String, dynamic> block,
    String blockPath,
    List<CourseSchemaFinding> findings, {
    required Set<String> blockIds,
    required int blockIndex,
    required bool isStrict,
  }) {
    final blockIdPath = '$blockPath.id';
    final blockId = block['id'];
    if (blockId is! String || blockId.trim().isEmpty) {
      _addError(findings, blockIdPath, 'Missing or empty string');
    } else if (!blockIds.add(blockId)) {
      _addError(findings, blockIdPath, 'Duplicate block id "$blockId"');
    }

    final typePath = '$blockPath.type';
    final typeValue = block['type'];
    if (typeValue is! String) {
      _addError(findings, typePath, 'Missing or invalid string');
      return;
    }

    final type = _blockTypesByValue[typeValue];
    if (type == null) {
      _addError(findings, typePath, 'Unknown block type "$typeValue"');
      return;
    }

    final positionPath = '$blockPath.position';
    final position = block['position'];
    if (position != null && position is! Map) {
      _addWarning(findings, positionPath, 'Expected object');
    } else if (position is Map) {
      final orderPath = '$positionPath.order';
      final order = position['order'];
      if (order != null && order is! int) {
        _addWarning(findings, orderPath, 'Expected integer');
      } else if (order is int && order < 0) {
        _addWarning(findings, orderPath, 'Should be >= 0');
      }
    }

    final style = block['style'];
    if (style != null && style is! Map) {
      _addWarning(findings, '$blockPath.style', 'Expected object');
    }

    final visibilityRulePath = '$blockPath.visibilityRule';
    final visibilityRule = block['visibilityRule'];
    if (visibilityRule != null && visibilityRule is! String) {
      _addWarning(findings, visibilityRulePath, 'Expected string');
    } else if (visibilityRule is String &&
        visibilityRule != 'always' &&
        visibilityRule != 'afterPreviousCorrect') {
      _addWarning(
        findings,
        visibilityRulePath,
        'Unknown rule "$visibilityRule"; expected "always" or "afterPreviousCorrect"',
      );
    } else if (visibilityRule == 'afterPreviousCorrect' && blockIndex == 0) {
      _addWarning(
        findings,
        visibilityRulePath,
        'First block cannot depend on a previous answer',
      );
    }

    final contentPath = '$blockPath.content';
    final contentValue = block['content'];
    if (contentValue is! Map) {
      _addError(findings, contentPath, 'Missing or invalid object');
      return;
    }

    final content = Map<String, dynamic>.from(contentValue);
    switch (type) {
      case BlockType.text:
        _validateTextContent(content, contentPath, findings);
      case BlockType.image:
        _validateImageContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.codeBlock:
        _validateCodeBlockContent(content, contentPath, findings);
      case BlockType.codePlayground:
        _validateCodePlaygroundContent(content, contentPath, findings);
      case BlockType.multipleChoice:
        _validateMultipleChoiceContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.fillBlank:
        _validateFillBlankContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.trueFalse:
        _validateTrueFalseContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.matching:
        _validateMatchingContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.video:
        _validateVideoContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
    }
  }

  static void _validateTextContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings,
  ) {
    final format = content['format'];
    if (format != null && format is! String) {
      _addWarning(findings, '$contentPath.format', 'Expected string');
    } else if (format is String &&
        format.isNotEmpty &&
        format != 'markdown' &&
        format != 'plain') {
      _addWarning(
        findings,
        '$contentPath.format',
        'Unknown format "$format"; expected "markdown" or "plain"',
      );
    }

    final value = content['value'];
    if (value != null && value is! String) {
      _addError(findings, '$contentPath.value', 'Expected string');
    }
  }

  static void _validateImageContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final url = content['url'];
    if (url == null) {
      if (isStrict) {
        _addError(findings, '$contentPath.url', 'Missing image URL');
      } else {
        _addWarning(findings, '$contentPath.url', 'Missing image URL');
      }
      return;
    }
    if (url is! String) {
      _addError(findings, '$contentPath.url', 'Expected string');
      return;
    }
    if (url.trim().isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.url', 'Image URL cannot be empty');
      } else {
        _addWarning(findings, '$contentPath.url', 'Empty image URL');
      }
    }

    final alt = content['alt'];
    if (alt != null && alt is! String) {
      _addWarning(findings, '$contentPath.alt', 'Expected string');
    }

    final caption = content['caption'];
    if (caption != null && caption is! String) {
      _addWarning(findings, '$contentPath.caption', 'Expected string');
    }
  }

  static void _validateCodeBlockContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings,
  ) {
    final language = content['language'];
    if (language != null && language is! String) {
      _addError(findings, '$contentPath.language', 'Expected string');
    }

    final code = content['code'];
    if (code != null && code is! String) {
      _addError(findings, '$contentPath.code', 'Expected string');
    }
  }

  static void _validateCodePlaygroundContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings,
  ) {
    final language = content['language'];
    if (language != null && language is! String) {
      _addError(findings, '$contentPath.language', 'Expected string');
    }

    final initialCode = content['initialCode'];
    if (initialCode != null && initialCode is! String) {
      _addError(findings, '$contentPath.initialCode', 'Expected string');
    }

    final expectedOutput = content['expectedOutput'];
    if (expectedOutput != null && expectedOutput is! String) {
      _addWarning(findings, '$contentPath.expectedOutput', 'Expected string');
    }

    final hints = content['hints'];
    if (hints != null) {
      if (hints is! List) {
        _addWarning(findings, '$contentPath.hints', 'Expected list of strings');
      } else {
        for (int i = 0; i < hints.length; i++) {
          if (hints[i] is! String) {
            _addWarning(findings, '$contentPath.hints[$i]', 'Expected string');
          }
        }
      }
    }

    final runnable = content['runnable'];
    if (runnable != null && runnable is! bool) {
      _addWarning(findings, '$contentPath.runnable', 'Expected boolean');
    }
  }

  static void _validateMultipleChoiceContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final question = content['question'];
    if (question is! String) {
      _addError(findings, '$contentPath.question', 'Missing or invalid string');
    } else if (question.trim().isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.question',
          'question cannot be empty',
        );
      } else {
        _addWarning(findings, '$contentPath.question', 'Empty question');
      }
    }

    final options = content['options'];
    if (options is! List) {
      _addError(findings, '$contentPath.options', 'Missing or invalid list');
      return;
    }

    if (options.length < 2) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.options',
          'Must contain at least 2 options',
        );
      } else {
        _addWarning(
          findings,
          '$contentPath.options',
          'Recommended to provide at least 2 options',
        );
      }
    }

    final optionIds = <String>{};
    for (int i = 0; i < options.length; i++) {
      final optionPath = '$contentPath.options[$i]';
      final optionValue = options[i];
      if (optionValue is! Map) {
        _addError(findings, optionPath, 'Expected object');
        continue;
      }

      final option = Map<String, dynamic>.from(optionValue);
      final optionId = option['id'];
      if (optionId is! String || optionId.trim().isEmpty) {
        _addError(findings, '$optionPath.id', 'Missing or empty string');
      } else if (!optionIds.add(optionId.trim())) {
        _addError(
          findings,
          '$optionPath.id',
          'Duplicate option id "$optionId"',
        );
      }

      final optionText = option['text'];
      if (optionText is! String) {
        _addError(findings, '$optionPath.text', 'Missing or invalid string');
      } else if (optionText.trim().isEmpty) {
        if (isStrict) {
          _addError(
            findings,
            '$optionPath.text',
            'option text cannot be empty',
          );
        } else {
          _addWarning(findings, '$optionPath.text', 'Empty option text');
        }
      }
    }

    final multiSelectPath = '$contentPath.multiSelect';
    final multiSelectRaw = content['multiSelect'];
    if (multiSelectRaw != null && multiSelectRaw is! bool) {
      _addError(findings, multiSelectPath, 'Expected boolean');
    }
    final multiSelect = multiSelectRaw is bool ? multiSelectRaw : false;

    final correctAnswerPath = '$contentPath.correctAnswer';
    final correctAnswerRaw = content['correctAnswer'];
    if (correctAnswerRaw != null && correctAnswerRaw is! String) {
      _addError(findings, correctAnswerPath, 'Expected string');
    }

    final correctAnswersPath = '$contentPath.correctAnswers';
    final correctAnswersRaw = content['correctAnswers'];
    if (correctAnswersRaw != null && correctAnswersRaw is! List) {
      _addError(findings, correctAnswersPath, 'Expected list of strings');
    }

    final normalizedCorrectAnswers = <String>[];
    final seenAnswerIds = <String>{};

    if (correctAnswersRaw is List) {
      for (int i = 0; i < correctAnswersRaw.length; i++) {
        final raw = correctAnswersRaw[i];
        if (raw is! String) {
          _addError(
            findings,
            '$correctAnswersPath[$i]',
            'Expected string answer id',
          );
          continue;
        }
        final answerId = raw.trim();
        if (answerId.isEmpty) continue;
        if (seenAnswerIds.add(answerId)) {
          normalizedCorrectAnswers.add(answerId);
        }
      }
    }

    if (correctAnswerRaw is String) {
      final answerId = correctAnswerRaw.trim();
      if (answerId.isNotEmpty && seenAnswerIds.add(answerId)) {
        normalizedCorrectAnswers.add(answerId);
      }
    }

    if (normalizedCorrectAnswers.isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          correctAnswersPath,
          'Must contain at least one correct answer',
        );
      } else {
        _addWarning(
          findings,
          correctAnswersPath,
          'No correct answer configured',
        );
      }
    }

    for (int i = 0; i < normalizedCorrectAnswers.length; i++) {
      final answerId = normalizedCorrectAnswers[i];
      if (!optionIds.contains(answerId)) {
        _addError(
          findings,
          '$correctAnswersPath[$i]',
          'Correct answer "$answerId" is not present in options',
        );
      }
    }

    if (!multiSelect && normalizedCorrectAnswers.length != 1) {
      _addError(
        findings,
        correctAnswersPath,
        'single-select mode must have exactly one correct answer',
      );
    }
  }

  static void _validateFillBlankContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final question = content['question'];
    if (question is! String) {
      _addError(findings, '$contentPath.question', 'Missing or invalid string');
    } else if (question.trim().isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.question',
          'question cannot be empty',
        );
      } else {
        _addWarning(findings, '$contentPath.question', 'Empty question');
      }
    }

    final correctAnswer = content['correctAnswer'];
    if (correctAnswer is! String) {
      _addError(
        findings,
        '$contentPath.correctAnswer',
        'Missing or invalid string',
      );
    } else if (correctAnswer.trim().isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.correctAnswer',
          'correct answer cannot be empty',
        );
      } else {
        _addWarning(findings, '$contentPath.correctAnswer', 'Empty answer');
      }
    }

    final hint = content['hint'];
    if (hint != null && hint is! String) {
      _addWarning(findings, '$contentPath.hint', 'Expected string');
    }
  }

  static void _validateTrueFalseContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final question = content['question'];
    if (question is! String) {
      _addError(findings, '$contentPath.question', 'Missing or invalid string');
    } else if (question.trim().isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.question',
          'question cannot be empty',
        );
      } else {
        _addWarning(findings, '$contentPath.question', 'Empty question');
      }
    }

    final correctAnswer = content['correctAnswer'];
    if (correctAnswer != null && correctAnswer is! bool) {
      _addError(findings, '$contentPath.correctAnswer', 'Expected boolean');
    }

    final explanation = content['explanation'];
    if (explanation != null && explanation is! String) {
      _addWarning(findings, '$contentPath.explanation', 'Expected string');
    }
  }

  static void _validateMatchingContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final question = content['question'];
    if (question is! String) {
      _addError(findings, '$contentPath.question', 'Missing or invalid string');
    } else if (question.trim().isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.question',
          'question cannot be empty',
        );
      } else {
        _addWarning(findings, '$contentPath.question', 'Empty question');
      }
    }

    final leftItems = content['leftItems'];
    final rightItems = content['rightItems'];
    if (leftItems is! List) {
      _addError(findings, '$contentPath.leftItems', 'Missing or invalid list');
      return;
    }
    if (rightItems is! List) {
      _addError(findings, '$contentPath.rightItems', 'Missing or invalid list');
      return;
    }

    if (leftItems.length < 2) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.leftItems',
          'must contain at least 2 left items',
        );
      } else {
        _addWarning(
          findings,
          '$contentPath.leftItems',
          'Recommended to provide at least 2 items',
        );
      }
    }

    if (rightItems.length < 2) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.rightItems',
          'must contain at least 2 right items',
        );
      } else {
        _addWarning(
          findings,
          '$contentPath.rightItems',
          'Recommended to provide at least 2 items',
        );
      }
    }

    final leftIds = _validateMatchingItems(
      leftItems,
      '$contentPath.leftItems',
      findings,
      isStrict: isStrict,
    );
    final rightIds = _validateMatchingItems(
      rightItems,
      '$contentPath.rightItems',
      findings,
      isStrict: isStrict,
    );

    final pairs = content['correctPairs'];
    if (pairs != null && pairs is! List) {
      _addError(findings, '$contentPath.correctPairs', 'Expected list');
      return;
    }

    if (pairs is! List) return;

    for (int i = 0; i < pairs.length; i++) {
      final pairPath = '$contentPath.correctPairs[$i]';
      final pairValue = pairs[i];
      if (pairValue is! Map) {
        _addError(findings, pairPath, 'Expected object');
        continue;
      }

      final pair = Map<String, dynamic>.from(pairValue);
      final leftId = pair['leftId'];
      final rightId = pair['rightId'];

      if (leftId is! String || leftId.trim().isEmpty) {
        _addError(findings, '$pairPath.leftId', 'Missing or empty string');
      } else if (!leftIds.contains(leftId)) {
        _addError(findings, '$pairPath.leftId', 'unknown left id "$leftId"');
      }

      if (rightId is! String || rightId.trim().isEmpty) {
        _addError(findings, '$pairPath.rightId', 'Missing or empty string');
      } else if (!rightIds.contains(rightId)) {
        _addError(findings, '$pairPath.rightId', 'unknown right id "$rightId"');
      }
    }
  }

  static Set<String> _validateMatchingItems(
    List<dynamic> items,
    String itemsPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final ids = <String>{};

    for (int i = 0; i < items.length; i++) {
      final itemPath = '$itemsPath[$i]';
      final itemValue = items[i];
      if (itemValue is! Map) {
        _addError(findings, itemPath, 'Expected object');
        continue;
      }

      final item = Map<String, dynamic>.from(itemValue);
      final id = item['id'];
      if (id is! String || id.trim().isEmpty) {
        _addError(findings, '$itemPath.id', 'Missing or empty string');
      } else if (!ids.add(id.trim())) {
        _addError(findings, '$itemPath.id', 'Duplicate item id "$id"');
      }

      final text = item['text'];
      if (text is! String) {
        _addError(findings, '$itemPath.text', 'Missing or invalid string');
      } else if (text.trim().isEmpty) {
        if (isStrict) {
          _addError(findings, '$itemPath.text', 'Item text cannot be empty');
        } else {
          _addWarning(findings, '$itemPath.text', 'Empty item text');
        }
      }
    }

    return ids;
  }

  static void _validateVideoContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final url = content['url'];
    if (url is! String) {
      _addError(findings, '$contentPath.url', 'Missing or invalid string');
      return;
    }
    if (url.trim().isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.url', 'Video URL cannot be empty');
      } else {
        _addWarning(findings, '$contentPath.url', 'Empty video URL');
      }
    }

    final title = content['title'];
    if (title != null && title is! String) {
      _addWarning(findings, '$contentPath.title', 'Expected string');
    }
  }

  static bool _isSupportedDifficulty(String difficulty) {
    return difficulty == 'beginner' ||
        difficulty == 'intermediate' ||
        difficulty == 'advanced';
  }

  static void _addWarning(
    List<CourseSchemaFinding> findings,
    String path,
    String message,
  ) {
    findings.add(
      CourseSchemaFinding(
        severity: CourseSchemaFindingSeverity.warning,
        path: path,
        message: message,
      ),
    );
  }

  static void _addError(
    List<CourseSchemaFinding> findings,
    String path,
    String message,
  ) {
    findings.add(
      CourseSchemaFinding(
        severity: CourseSchemaFindingSeverity.error,
        path: path,
        message: message,
      ),
    );
  }
}
