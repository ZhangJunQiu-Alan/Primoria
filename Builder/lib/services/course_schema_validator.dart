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
    _validateLessons(json, findings, isStrict: isStrict);

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

  static void _validateLessons(
    Map<String, dynamic> json,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    // Accept both 'lessons' (new) and 'pages' (legacy) key
    final lessonsPath = '$_rootPath.lessons';
    final lessons = json['lessons'] ?? json['pages'];
    if (lessons is! List) {
      _addError(findings, lessonsPath, 'Missing or invalid list');
      return;
    }
    if (lessons.isEmpty) {
      _addError(findings, lessonsPath, 'Must contain at least one lesson');
      return;
    }

    final lessonIds = <String>{};
    final blockIds = <String>{};

    for (int lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
      final lessonPath = '$lessonsPath[$lessonIndex]';
      final lessonValue = lessons[lessonIndex];
      if (lessonValue is! Map) {
        _addError(findings, lessonPath, 'Expected object');
        continue;
      }

      final lesson = Map<String, dynamic>.from(lessonValue);

      final lessonIdPath = '$lessonPath.lessonId';
      // Accept both 'lessonId' (new) and 'pageId' (legacy)
      final lessonId = lesson['lessonId'] ?? lesson['pageId'];
      if (lessonId is! String || lessonId.trim().isEmpty) {
        _addError(findings, lessonIdPath, 'Missing or empty string');
      } else if (!lessonIds.add(lessonId)) {
        _addError(findings, lessonIdPath, 'Duplicate lessonId "$lessonId"');
      }

      final lessonTitlePath = '$lessonPath.title';
      final lessonTitle = lesson['title'];
      if (lessonTitle is! String) {
        _addError(findings, lessonTitlePath, 'Missing or invalid string');
      } else if (lessonTitle.trim().isEmpty) {
        if (isStrict) {
          _addError(findings, lessonTitlePath, 'Cannot be empty');
        } else {
          _addWarning(findings, lessonTitlePath, 'Empty lesson title');
        }
      }

      final blocksPath = '$lessonPath.blocks';
      final blocks = lesson['blocks'];
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
      case BlockType.codeExecution:
        _validateCodeExecutionContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
      case BlockType.functionFlow:
        _validateFunctionFlowContent(
          content,
          contentPath,
          findings,
          isStrict: isStrict,
        );
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
      case BlockType.animation:
        _validateAnimationContent(
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

  static void _validateCodeExecutionContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final title = content['title'];
    if (title != null && title is! String) {
      _addError(findings, '$contentPath.title', 'Expected string');
    } else if (title is String && title.trim().isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.title', 'Title cannot be empty');
      } else {
        _addWarning(findings, '$contentPath.title', 'Empty title');
      }
    }

    final language = content['language'];
    if (language != null && language is! String) {
      _addError(findings, '$contentPath.language', 'Expected string');
    }

    final sourceCode = content['sourceCode'];
    if (sourceCode is! String) {
      _addError(
        findings,
        '$contentPath.sourceCode',
        'Missing or invalid string',
      );
    }
    final sourceLineCount = sourceCode is String && sourceCode.isNotEmpty
        ? sourceCode.split('\n').length
        : 0;

    final traceSteps = content['traceSteps'];
    if (traceSteps is! List) {
      _addError(findings, '$contentPath.traceSteps', 'Missing or invalid list');
      return;
    }
    if (traceSteps.isEmpty) {
      _addError(
        findings,
        '$contentPath.traceSteps',
        'Must contain at least one execution step',
      );
    }

    for (int stepIndex = 0; stepIndex < traceSteps.length; stepIndex++) {
      final stepPath = '$contentPath.traceSteps[$stepIndex]';
      final stepValue = traceSteps[stepIndex];
      if (stepValue is! Map) {
        _addError(findings, stepPath, 'Expected object');
        continue;
      }

      final step = Map<String, dynamic>.from(stepValue);
      final linePath = '$stepPath.line';
      final lineValue = step['line'];
      if (lineValue is! int) {
        _addError(findings, linePath, 'Missing or invalid integer');
      } else if (lineValue <= 0) {
        _addError(findings, linePath, 'Must be >= 1');
      } else if (sourceLineCount > 0 && lineValue > sourceLineCount) {
        _addError(
          findings,
          linePath,
          'Out of range: source code has $sourceLineCount line(s)',
        );
      } else if (sourceLineCount == 0) {
        _addError(
          findings,
          linePath,
          'Cannot map line number because sourceCode is empty',
        );
      }

      final stdoutDelta = step['stdoutDelta'];
      if (stdoutDelta != null && stdoutDelta is! String) {
        _addError(findings, '$stepPath.stdoutDelta', 'Expected string');
      }

      final variables = step['variables'];
      if (variables is! Map) {
        _addError(
          findings,
          '$stepPath.variables',
          'Missing or invalid object snapshot',
        );
      }

      final callStack = step['callStack'];
      if (callStack != null && callStack is! List) {
        _addError(findings, '$stepPath.callStack', 'Expected list of strings');
      } else if (callStack is List) {
        for (int i = 0; i < callStack.length; i++) {
          if (callStack[i] is! String) {
            _addError(
              findings,
              '$stepPath.callStack[$i]',
              'Expected string frame',
            );
          }
        }
      }

      final note = step['note'];
      if (note != null && note is! String) {
        _addWarning(findings, '$stepPath.note', 'Expected string');
      }
    }

    final initialVariables = content['initialVariables'];
    if (initialVariables != null && initialVariables is! Map) {
      _addError(findings, '$contentPath.initialVariables', 'Expected object');
    }

    final checkpoints = content['checkpoints'];
    if (checkpoints != null && checkpoints is! List) {
      _addError(findings, '$contentPath.checkpoints', 'Expected list');
    } else if (checkpoints is List) {
      for (
        int checkpointIndex = 0;
        checkpointIndex < checkpoints.length;
        checkpointIndex++
      ) {
        final checkpointPath = '$contentPath.checkpoints[$checkpointIndex]';
        final checkpointValue = checkpoints[checkpointIndex];
        if (checkpointValue is! Map) {
          _addError(findings, checkpointPath, 'Expected object');
          continue;
        }

        final checkpoint = Map<String, dynamic>.from(checkpointValue);
        final stepIndexValue = checkpoint['stepIndex'];
        if (stepIndexValue is! int) {
          _addError(
            findings,
            '$checkpointPath.stepIndex',
            'Missing or invalid integer',
          );
        } else if (stepIndexValue < 0 || stepIndexValue >= traceSteps.length) {
          _addError(
            findings,
            '$checkpointPath.stepIndex',
            'Out of range for traceSteps',
          );
        }

        final question = checkpoint['question'];
        if (question is! String) {
          _addError(
            findings,
            '$checkpointPath.question',
            'Missing or invalid string',
          );
        } else if (question.trim().isEmpty) {
          _addWarning(findings, '$checkpointPath.question', 'Empty question');
        }

        final options = checkpoint['options'];
        if (options is! List) {
          _addError(
            findings,
            '$checkpointPath.options',
            'Missing or invalid list',
          );
          continue;
        }
        if (options.isEmpty) {
          _addError(
            findings,
            '$checkpointPath.options',
            'Must contain at least one option',
          );
        }

        for (int optionIndex = 0; optionIndex < options.length; optionIndex++) {
          if (options[optionIndex] is! String) {
            _addError(
              findings,
              '$checkpointPath.options[$optionIndex]',
              'Expected string',
            );
          }
        }

        final correctIndex = checkpoint['correctIndex'];
        if (correctIndex is! int) {
          _addError(
            findings,
            '$checkpointPath.correctIndex',
            'Missing or invalid integer',
          );
        } else if (correctIndex < 0 || correctIndex >= options.length) {
          _addError(
            findings,
            '$checkpointPath.correctIndex',
            'Out of range for checkpoint options',
          );
        }

        final explanation = checkpoint['explanation'];
        if (explanation != null && explanation is! String) {
          _addWarning(
            findings,
            '$checkpointPath.explanation',
            'Expected string',
          );
        }
      }
    }

    final controls = content['controls'];
    if (controls != null && controls is! Map) {
      _addError(findings, '$contentPath.controls', 'Expected object');
    } else if (controls is Map) {
      final controlsMap = Map<String, dynamic>.from(controls);
      final autoplay = controlsMap['autoplay'];
      if (autoplay != null && autoplay is! bool) {
        _addError(
          findings,
          '$contentPath.controls.autoplay',
          'Expected boolean',
        );
      }

      final stepDurationMs = controlsMap['stepDurationMs'];
      if (stepDurationMs != null && stepDurationMs is! int) {
        _addError(
          findings,
          '$contentPath.controls.stepDurationMs',
          'Expected integer',
        );
      } else if (stepDurationMs is int &&
          (stepDurationMs < 200 || stepDurationMs > 10000)) {
        if (isStrict) {
          _addError(
            findings,
            '$contentPath.controls.stepDurationMs',
            'Must be between 200 and 10000',
          );
        } else {
          _addWarning(
            findings,
            '$contentPath.controls.stepDurationMs',
            'Recommended range is 200-10000',
          );
        }
      }

      final allowScrub = controlsMap['allowScrub'];
      if (allowScrub != null && allowScrub is! bool) {
        _addError(
          findings,
          '$contentPath.controls.allowScrub',
          'Expected boolean',
        );
      }
    }

    final style = content['style'];
    if (style != null && style is! Map) {
      _addError(findings, '$contentPath.style', 'Expected object');
    } else if (style is Map) {
      final styleMap = Map<String, dynamic>.from(style);

      final theme = styleMap['theme'];
      if (theme != null && theme is! String) {
        _addError(findings, '$contentPath.style.theme', 'Expected string');
      } else if (theme is String &&
          !CodeExecutionStyle.supportedThemes.contains(theme)) {
        _addWarning(
          findings,
          '$contentPath.style.theme',
          'Unknown theme "$theme"',
        );
      }

      final showLineNumbers = styleMap['showLineNumbers'];
      if (showLineNumbers != null && showLineNumbers is! bool) {
        _addError(
          findings,
          '$contentPath.style.showLineNumbers',
          'Expected boolean',
        );
      }

      final showVariablesPanel = styleMap['showVariablesPanel'];
      if (showVariablesPanel != null && showVariablesPanel is! bool) {
        _addError(
          findings,
          '$contentPath.style.showVariablesPanel',
          'Expected boolean',
        );
      }

      final showStdoutPanel = styleMap['showStdoutPanel'];
      if (showStdoutPanel != null && showStdoutPanel is! bool) {
        _addError(
          findings,
          '$contentPath.style.showStdoutPanel',
          'Expected boolean',
        );
      }
    }
  }

  static void _validateFunctionFlowContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final title = content['title'];
    if (title != null && title is! String) {
      _addError(findings, '$contentPath.title', 'Expected string');
    } else if (title is String && title.trim().isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.title', 'Title cannot be empty');
      } else {
        _addWarning(findings, '$contentPath.title', 'Empty title');
      }
    }

    final nodes = content['nodes'];
    if (nodes is! List) {
      _addError(findings, '$contentPath.nodes', 'Missing or invalid list');
      return;
    }
    if (nodes.isEmpty) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.nodes',
          'Must contain at least one node',
        );
      } else {
        _addWarning(findings, '$contentPath.nodes', 'No nodes configured');
      }
    }

    final nodeIds = <String>{};
    for (int i = 0; i < nodes.length; i++) {
      final nodePath = '$contentPath.nodes[$i]';
      final nodeValue = nodes[i];
      if (nodeValue is! Map) {
        _addError(findings, nodePath, 'Expected object');
        continue;
      }

      final node = Map<String, dynamic>.from(nodeValue);
      final id = node['id'];
      if (id is! String || id.trim().isEmpty) {
        _addError(findings, '$nodePath.id', 'Missing or empty string');
      } else if (!nodeIds.add(id.trim())) {
        _addError(findings, '$nodePath.id', 'Duplicate node id "$id"');
      }

      final label = node['label'];
      if (label is! String) {
        _addError(findings, '$nodePath.label', 'Missing or invalid string');
      } else if (label.trim().isEmpty) {
        if (isStrict) {
          _addError(findings, '$nodePath.label', 'Node label cannot be empty');
        } else {
          _addWarning(findings, '$nodePath.label', 'Empty node label');
        }
      }

      final x = node['x'];
      if (x is! num) {
        _addError(findings, '$nodePath.x', 'Missing or invalid number');
      } else if (x < 0 || x > 100) {
        _addError(findings, '$nodePath.x', 'Must be between 0 and 100');
      }

      final y = node['y'];
      if (y is! num) {
        _addError(findings, '$nodePath.y', 'Missing or invalid number');
      } else if (y < 0 || y > 100) {
        _addError(findings, '$nodePath.y', 'Must be between 0 and 100');
      }

      final kind = node['kind'];
      if (kind is! String) {
        _addError(findings, '$nodePath.kind', 'Missing or invalid string');
      } else if (!FunctionFlowNode.supportedKinds.contains(kind)) {
        _addError(findings, '$nodePath.kind', 'Unknown kind "$kind"');
      }

      final description = node['description'];
      if (description != null && description is! String) {
        _addWarning(findings, '$nodePath.description', 'Expected string');
      }
    }

    final edges = content['edges'];
    if (edges is! List) {
      _addError(findings, '$contentPath.edges', 'Missing or invalid list');
      return;
    }
    if (edges.isEmpty) {
      _addWarning(findings, '$contentPath.edges', 'No edges configured');
    }

    for (int i = 0; i < edges.length; i++) {
      final edgePath = '$contentPath.edges[$i]';
      final edgeValue = edges[i];
      if (edgeValue is! Map) {
        _addError(findings, edgePath, 'Expected object');
        continue;
      }

      final edge = Map<String, dynamic>.from(edgeValue);
      final from = edge['from'];
      if (from is! String || from.trim().isEmpty) {
        _addError(findings, '$edgePath.from', 'Missing or empty string');
      } else if (!nodeIds.contains(from)) {
        _addError(findings, '$edgePath.from', 'Unknown source node "$from"');
      }

      final to = edge['to'];
      if (to is! String || to.trim().isEmpty) {
        _addError(findings, '$edgePath.to', 'Missing or empty string');
      } else if (!nodeIds.contains(to)) {
        _addError(findings, '$edgePath.to', 'Unknown target node "$to"');
      }

      final label = edge['label'];
      if (label != null && label is! String) {
        _addWarning(findings, '$edgePath.label', 'Expected string');
      }
    }

    final entryNodeId = content['entryNodeId'];
    if (entryNodeId != null && entryNodeId is! String) {
      _addError(findings, '$contentPath.entryNodeId', 'Expected string');
    } else if (entryNodeId is String &&
        entryNodeId.trim().isNotEmpty &&
        !nodeIds.contains(entryNodeId)) {
      _addError(
        findings,
        '$contentPath.entryNodeId',
        'Unknown entry node "$entryNodeId"',
      );
    }

    final steps = content['steps'];
    if (steps != null && steps is! List) {
      _addError(findings, '$contentPath.steps', 'Expected list');
    } else if (steps is List) {
      for (int i = 0; i < steps.length; i++) {
        final stepPath = '$contentPath.steps[$i]';
        final stepValue = steps[i];
        if (stepValue is! Map) {
          _addError(findings, stepPath, 'Expected object');
          continue;
        }

        final step = Map<String, dynamic>.from(stepValue);
        final edgeIndex = step['edgeIndex'];
        if (edgeIndex is! int) {
          _addError(
            findings,
            '$stepPath.edgeIndex',
            'Missing or invalid integer',
          );
        } else if (edgeIndex < 0 || edgeIndex >= edges.length) {
          _addError(
            findings,
            '$stepPath.edgeIndex',
            'Out of range for edges list',
          );
        }

        final durationMs = step['durationMs'];
        if (durationMs != null && durationMs is! int) {
          _addError(findings, '$stepPath.durationMs', 'Expected integer');
        } else if (durationMs is int && durationMs <= 0) {
          _addError(findings, '$stepPath.durationMs', 'Must be > 0');
        }

        final note = step['note'];
        if (note != null && note is! String) {
          _addWarning(findings, '$stepPath.note', 'Expected string');
        }
      }
    }

    final style = content['style'];
    if (style != null && style is! Map) {
      _addError(findings, '$contentPath.style', 'Expected object');
    } else if (style is Map) {
      final styleMap = Map<String, dynamic>.from(style);
      final showArrows = styleMap['showArrows'];
      if (showArrows != null && showArrows is! bool) {
        _addWarning(
          findings,
          '$contentPath.style.showArrows',
          'Expected boolean',
        );
      }

      final stepDurationMs = styleMap['stepDurationMs'];
      if (stepDurationMs != null && stepDurationMs is! int) {
        _addError(
          findings,
          '$contentPath.style.stepDurationMs',
          'Expected integer',
        );
      } else if (stepDurationMs is int &&
          (stepDurationMs < 200 || stepDurationMs > 8000)) {
        if (isStrict) {
          _addError(
            findings,
            '$contentPath.style.stepDurationMs',
            'Must be between 200 and 8000',
          );
        } else {
          _addWarning(
            findings,
            '$contentPath.style.stepDurationMs',
            'Recommended range is 200-8000',
          );
        }
      }

      final lineWidth = styleMap['lineWidth'];
      if (lineWidth != null && lineWidth is! num) {
        _addWarning(
          findings,
          '$contentPath.style.lineWidth',
          'Expected number',
        );
      } else if (lineWidth is num && (lineWidth <= 0 || lineWidth > 6)) {
        _addWarning(
          findings,
          '$contentPath.style.lineWidth',
          'Recommended range is 1.0-6.0',
        );
      }

      final theme = styleMap['theme'];
      if (theme != null && theme is! String) {
        _addWarning(findings, '$contentPath.style.theme', 'Expected string');
      } else if (theme is String &&
          !FunctionFlowStyle.supportedThemes.contains(theme)) {
        _addWarning(
          findings,
          '$contentPath.style.theme',
          'Unknown theme "$theme"',
        );
      }
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

    final modeValue = content['mode'];
    var mode = MatchingContent.modeList;
    if (modeValue != null && modeValue is! String) {
      _addError(findings, '$contentPath.mode', 'Expected string');
    } else if (modeValue is String) {
      if (!MatchingContent.supportedModes.contains(modeValue)) {
        _addWarning(findings, '$contentPath.mode', 'Unknown mode "$modeValue"');
      } else {
        mode = modeValue;
      }
    }

    final isGraphMode = mode == MatchingContent.modeGraph;

    final leftItemsRaw = content['leftItems'];
    final rightItemsRaw = content['rightItems'];
    if (leftItemsRaw != null && leftItemsRaw is! List) {
      _addError(findings, '$contentPath.leftItems', 'Expected list');
    }
    if (rightItemsRaw != null && rightItemsRaw is! List) {
      _addError(findings, '$contentPath.rightItems', 'Expected list');
    }
    final leftItems = leftItemsRaw is List ? leftItemsRaw : const <dynamic>[];
    final rightItems = rightItemsRaw is List
        ? rightItemsRaw
        : const <dynamic>[];

    if (!isGraphMode) {
      if (leftItemsRaw is! List) {
        _addError(
          findings,
          '$contentPath.leftItems',
          'Missing or invalid list',
        );
      }
      if (rightItemsRaw is! List) {
        _addError(
          findings,
          '$contentPath.rightItems',
          'Missing or invalid list',
        );
      }
    }

    if (leftItems.length < 2) {
      if (isStrict && !isGraphMode) {
        _addError(
          findings,
          '$contentPath.leftItems',
          'must contain at least 2 left items',
        );
      } else if (!isGraphMode) {
        _addWarning(
          findings,
          '$contentPath.leftItems',
          'Recommended to provide at least 2 items',
        );
      }
    }

    if (rightItems.length < 2) {
      if (isStrict && !isGraphMode) {
        _addError(
          findings,
          '$contentPath.rightItems',
          'must contain at least 2 right items',
        );
      } else if (!isGraphMode) {
        _addWarning(
          findings,
          '$contentPath.rightItems',
          'Recommended to provide at least 2 items',
        );
      }
    }

    final leftIds = leftItemsRaw is List
        ? _validateMatchingItems(
            leftItems,
            '$contentPath.leftItems',
            findings,
            isStrict: isStrict,
          )
        : <String>{};
    final rightIds = rightItemsRaw is List
        ? _validateMatchingItems(
            rightItems,
            '$contentPath.rightItems',
            findings,
            isStrict: isStrict,
          )
        : <String>{};

    final pairs = content['correctPairs'];
    if (pairs != null && pairs is! List) {
      _addError(findings, '$contentPath.correctPairs', 'Expected list');
    }

    final normalizedPairs = <_MatchingRuleEdgeRef>[];
    if (pairs is List) {
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
        } else if (leftIds.isNotEmpty && !leftIds.contains(leftId)) {
          _addError(findings, '$pairPath.leftId', 'unknown left id "$leftId"');
        }

        if (rightId is! String || rightId.trim().isEmpty) {
          _addError(findings, '$pairPath.rightId', 'Missing or empty string');
        } else if (rightIds.isNotEmpty && !rightIds.contains(rightId)) {
          _addError(
            findings,
            '$pairPath.rightId',
            'unknown right id "$rightId"',
          );
        }

        if (leftId is String &&
            leftId.trim().isNotEmpty &&
            rightId is String &&
            rightId.trim().isNotEmpty) {
          normalizedPairs.add(
            _MatchingRuleEdgeRef(from: leftId, to: rightId, path: pairPath),
          );
        }
      }
    }

    final rulesRaw = content['rules'];
    var allowOneToMany = false;
    var allowManyToMany = false;
    var directed = true;
    if (rulesRaw != null && rulesRaw is! Map) {
      _addError(findings, '$contentPath.rules', 'Expected object');
    } else if (rulesRaw is Map) {
      final rules = Map<String, dynamic>.from(rulesRaw);
      final allowOneToManyRaw = rules['allowOneToMany'];
      final allowManyToManyRaw = rules['allowManyToMany'];
      final directedRaw = rules['directed'];
      if (allowOneToManyRaw != null && allowOneToManyRaw is! bool) {
        _addError(
          findings,
          '$contentPath.rules.allowOneToMany',
          'Expected boolean',
        );
      } else if (allowOneToManyRaw is bool) {
        allowOneToMany = allowOneToManyRaw;
      }
      if (allowManyToManyRaw != null && allowManyToManyRaw is! bool) {
        _addError(
          findings,
          '$contentPath.rules.allowManyToMany',
          'Expected boolean',
        );
      } else if (allowManyToManyRaw is bool) {
        allowManyToMany = allowManyToManyRaw;
      }
      if (directedRaw != null && directedRaw is! bool) {
        _addError(findings, '$contentPath.rules.directed', 'Expected boolean');
      } else if (directedRaw is bool) {
        directed = directedRaw;
      }
    }
    if (allowManyToMany) allowOneToMany = true;

    final nodesRaw = content['nodes'];
    final nodeIds = <String>{};
    if (nodesRaw != null && nodesRaw is! List) {
      _addError(findings, '$contentPath.nodes', 'Expected list');
    } else if (nodesRaw is List) {
      for (int i = 0; i < nodesRaw.length; i++) {
        final nodePath = '$contentPath.nodes[$i]';
        final nodeValue = nodesRaw[i];
        if (nodeValue is! Map) {
          _addError(findings, nodePath, 'Expected object');
          continue;
        }

        final node = Map<String, dynamic>.from(nodeValue);
        final id = node['id'];
        if (id is! String || id.trim().isEmpty) {
          _addError(findings, '$nodePath.id', 'Missing or empty string');
        } else if (!nodeIds.add(id.trim())) {
          _addError(findings, '$nodePath.id', 'Duplicate node id "$id"');
        }

        final label = node['label'];
        if (label is! String) {
          _addError(findings, '$nodePath.label', 'Missing or invalid string');
        } else if (label.trim().isEmpty) {
          if (isStrict) {
            _addError(
              findings,
              '$nodePath.label',
              'Node label cannot be empty',
            );
          } else {
            _addWarning(findings, '$nodePath.label', 'Empty node label');
          }
        }

        final x = node['x'];
        if (x is! num) {
          _addError(findings, '$nodePath.x', 'Missing or invalid number');
        } else if (x < 0 || x > 100) {
          _addError(findings, '$nodePath.x', 'Must be between 0 and 100');
        }

        final y = node['y'];
        if (y is! num) {
          _addError(findings, '$nodePath.y', 'Missing or invalid number');
        } else if (y < 0 || y > 100) {
          _addError(findings, '$nodePath.y', 'Must be between 0 and 100');
        }

        final group = node['group'];
        if (group != null && group is! String) {
          _addWarning(findings, '$nodePath.group', 'Expected string');
        } else if (group is String &&
            !MatchingNode.supportedGroups.contains(group)) {
          _addWarning(findings, '$nodePath.group', 'Unknown group "$group"');
        }
      }
    }

    if (isGraphMode && nodeIds.isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.nodes', 'Graph mode requires nodes');
      } else {
        _addWarning(
          findings,
          '$contentPath.nodes',
          'No graph nodes configured',
        );
      }
    }

    final availableNodeIds = nodeIds.isNotEmpty
        ? nodeIds
        : {...leftIds, ...rightIds};
    final edgesRaw = content['edges'];
    final graphEdges = <_MatchingRuleEdgeRef>[];
    if (edgesRaw != null && edgesRaw is! List) {
      _addError(findings, '$contentPath.edges', 'Expected list');
    } else if (edgesRaw is List) {
      for (int i = 0; i < edgesRaw.length; i++) {
        final edgePath = '$contentPath.edges[$i]';
        final edgeValue = edgesRaw[i];
        if (edgeValue is! Map) {
          _addError(findings, edgePath, 'Expected object');
          continue;
        }
        final edge = Map<String, dynamic>.from(edgeValue);
        final from = edge['from'];
        final to = edge['to'];

        if (from is! String || from.trim().isEmpty) {
          _addError(findings, '$edgePath.from', 'Missing or empty string');
        } else if (availableNodeIds.isNotEmpty &&
            !availableNodeIds.contains(from)) {
          _addError(findings, '$edgePath.from', 'Unknown source node "$from"');
        }

        if (to is! String || to.trim().isEmpty) {
          _addError(findings, '$edgePath.to', 'Missing or empty string');
        } else if (availableNodeIds.isNotEmpty &&
            !availableNodeIds.contains(to)) {
          _addError(findings, '$edgePath.to', 'Unknown target node "$to"');
        }

        final label = edge['label'];
        if (label != null && label is! String) {
          _addWarning(findings, '$edgePath.label', 'Expected string');
        }
        final edgeDirected = edge['directed'];
        if (edgeDirected != null && edgeDirected is! bool) {
          _addWarning(findings, '$edgePath.directed', 'Expected boolean');
        }

        if (from is String &&
            from.trim().isNotEmpty &&
            to is String &&
            to.trim().isNotEmpty) {
          graphEdges.add(
            _MatchingRuleEdgeRef(from: from, to: to, path: edgePath),
          );
        }
      }
    }

    if (isGraphMode && graphEdges.isEmpty && normalizedPairs.isEmpty) {
      if (isStrict) {
        _addError(findings, '$contentPath.edges', 'Graph mode requires edges');
      } else {
        _addWarning(
          findings,
          '$contentPath.edges',
          'No graph edges configured',
        );
      }
    }

    final ruleEdges = isGraphMode
        ? (graphEdges.isNotEmpty ? graphEdges : normalizedPairs)
        : normalizedPairs;
    _validateMatchingRuleConstraints(
      ruleEdges,
      findings: findings,
      allowOneToMany: allowOneToMany,
      allowManyToMany: allowManyToMany,
      directed: directed,
    );

    final explanation = content['explanation'];
    if (explanation != null && explanation is! String) {
      _addWarning(findings, '$contentPath.explanation', 'Expected string');
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

  static void _validateMatchingRuleConstraints(
    List<_MatchingRuleEdgeRef> edges, {
    required List<CourseSchemaFinding> findings,
    required bool allowOneToMany,
    required bool allowManyToMany,
    required bool directed,
  }) {
    if (edges.isEmpty) return;

    final seen = <String>{};
    for (final edge in edges) {
      final key = directed
          ? '${edge.from}->${edge.to}'
          : (edge.from.compareTo(edge.to) <= 0
                ? '${edge.from}<->${edge.to}'
                : '${edge.to}<->${edge.from}');
      if (!seen.add(key)) {
        _addError(
          findings,
          edge.path,
          'Duplicate connection "${edge.from}" -> "${edge.to}"',
        );
      }
    }

    if (allowManyToMany) return;

    final outgoingCount = <String, int>{};
    final incomingCount = <String, int>{};
    for (final edge in edges) {
      final outCount = (outgoingCount[edge.from] ?? 0) + 1;
      outgoingCount[edge.from] = outCount;

      final inCount = (incomingCount[edge.to] ?? 0) + 1;
      incomingCount[edge.to] = inCount;

      if (!allowOneToMany && outCount > 1) {
        _addError(
          findings,
          edge.path,
          'Rule conflict: "${edge.from}" has multiple outgoing edges but one-to-one mode is enabled',
        );
      }

      if (inCount > 1) {
        _addError(
          findings,
          edge.path,
          'Rule conflict: "${edge.to}" has multiple incoming edges but many-to-one is disabled',
        );
      }
    }
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

  static void _validateAnimationContent(
    Map<String, dynamic> content,
    String contentPath,
    List<CourseSchemaFinding> findings, {
    required bool isStrict,
  }) {
    final preset = content['preset'];
    if (preset is! String) {
      _addError(findings, '$contentPath.preset', 'Missing or invalid string');
    } else if (!AnimationContent.supportedPresets.contains(preset)) {
      _addError(findings, '$contentPath.preset', 'Unknown preset "$preset"');
    }

    final durationMs = content['durationMs'];
    if (durationMs != null && durationMs is! int) {
      _addError(findings, '$contentPath.durationMs', 'Expected integer');
    } else if (durationMs is int && durationMs <= 0) {
      _addError(findings, '$contentPath.durationMs', 'Must be > 0');
    } else if (durationMs is int && (durationMs < 300 || durationMs > 10000)) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.durationMs',
          'Must be between 300 and 10000',
        );
      } else {
        _addWarning(
          findings,
          '$contentPath.durationMs',
          'Recommended range is 300-10000',
        );
      }
    }

    final loop = content['loop'];
    if (loop != null && loop is! bool) {
      _addWarning(findings, '$contentPath.loop', 'Expected boolean');
    }

    final speed = content['speed'];
    if (speed != null && speed is! num) {
      _addError(findings, '$contentPath.speed', 'Expected number');
    } else if (speed is num && speed <= 0) {
      _addError(findings, '$contentPath.speed', 'Must be > 0');
    } else if (speed is num && (speed < 0.25 || speed > 3.0)) {
      if (isStrict) {
        _addError(
          findings,
          '$contentPath.speed',
          'Must be between 0.25 and 3.0',
        );
      } else {
        _addWarning(
          findings,
          '$contentPath.speed',
          'Recommended range is 0.25-3.0',
        );
      }
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

class _MatchingRuleEdgeRef {
  final String from;
  final String to;
  final String path;

  const _MatchingRuleEdgeRef({
    required this.from,
    required this.to,
    required this.path,
  });
}
