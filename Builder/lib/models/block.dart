import 'block_type.dart';
import '../services/id_generator.dart';

/// Block position info
class BlockPosition {
  final int order;

  const BlockPosition({required this.order});

  factory BlockPosition.fromJson(Map<String, dynamic> json) {
    return BlockPosition(order: json['order'] as int? ?? 0);
  }

  Map<String, dynamic> toJson() => {'order': order};

  BlockPosition copyWith({int? order}) {
    return BlockPosition(order: order ?? this.order);
  }
}

/// Block style configuration
class BlockStyle {
  final String spacing;
  final String alignment;
  final double? height;

  const BlockStyle({this.spacing = 'md', this.alignment = 'left', this.height});

  factory BlockStyle.fromJson(Map<String, dynamic> json) {
    return BlockStyle(
      spacing: json['spacing'] as String? ?? 'md',
      alignment: json['alignment'] as String? ?? 'left',
      height: (json['height'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'spacing': spacing, 'alignment': alignment};
    if (height != null) map['height'] = height;
    return map;
  }

  BlockStyle copyWith({String? spacing, String? alignment, double? height}) {
    return BlockStyle(
      spacing: spacing ?? this.spacing,
      alignment: alignment ?? this.alignment,
      height: height ?? this.height,
    );
  }
}

/// Block content - base class
abstract class BlockContent {
  Map<String, dynamic> toJson();

  factory BlockContent.fromJson(BlockType type, Map<String, dynamic> json) {
    switch (type) {
      case BlockType.text:
        return TextContent.fromJson(json);
      case BlockType.image:
        return ImageContent.fromJson(json);
      case BlockType.codeBlock:
        return CodeBlockContent.fromJson(json);
      case BlockType.codePlayground:
        return CodePlaygroundContent.fromJson(json);
      case BlockType.codeExecution:
        return CodeExecutionContent.fromJson(json);
      case BlockType.functionFlow:
        return FunctionFlowContent.fromJson(json);
      case BlockType.multipleChoice:
        return MultipleChoiceContent.fromJson(json);
      case BlockType.fillBlank:
        return FillBlankContent.fromJson(json);
      case BlockType.trueFalse:
        return TrueFalseContent.fromJson(json);
      case BlockType.matching:
        return MatchingContent.fromJson(json);
      case BlockType.animation:
        return AnimationContent.fromJson(json);
      case BlockType.video:
        return VideoContent.fromJson(json);
    }
  }
}

/// Text block content
class TextContent implements BlockContent {
  final String format; // 'markdown' | 'plain'
  final String value;

  const TextContent({this.format = 'markdown', this.value = ''});

  factory TextContent.fromJson(Map<String, dynamic> json) {
    return TextContent(
      format: json['format'] as String? ?? 'markdown',
      value: json['value'] as String? ?? '',
    );
  }

  @override
  Map<String, dynamic> toJson() => {'format': format, 'value': value};

  TextContent copyWith({String? format, String? value}) {
    return TextContent(
      format: format ?? this.format,
      value: value ?? this.value,
    );
  }
}

/// Image block content
class ImageContent implements BlockContent {
  final String url;
  final String? alt;
  final String? caption;

  const ImageContent({this.url = '', this.alt, this.caption});

  factory ImageContent.fromJson(Map<String, dynamic> json) {
    return ImageContent(
      url: json['url'] as String? ?? '',
      alt: json['alt'] as String?,
      caption: json['caption'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'url': url};
    if (alt != null) map['alt'] = alt;
    if (caption != null) map['caption'] = caption;
    return map;
  }
}

/// Code block content
class CodeBlockContent implements BlockContent {
  final String language;
  final String code;

  const CodeBlockContent({this.language = 'python', this.code = ''});

  factory CodeBlockContent.fromJson(Map<String, dynamic> json) {
    return CodeBlockContent(
      language: json['language'] as String? ?? 'python',
      code: json['code'] as String? ?? '',
    );
  }

  @override
  Map<String, dynamic> toJson() => {'language': language, 'code': code};
}

/// Code playground content
class CodePlaygroundContent implements BlockContent {
  final String language;
  final String initialCode;
  final String? expectedOutput;
  final List<String> hints;
  final bool runnable;

  const CodePlaygroundContent({
    this.language = 'python',
    this.initialCode = '',
    this.expectedOutput,
    this.hints = const [],
    this.runnable = true,
  });

  factory CodePlaygroundContent.fromJson(Map<String, dynamic> json) {
    return CodePlaygroundContent(
      language: json['language'] as String? ?? 'python',
      initialCode: json['initialCode'] as String? ?? '',
      expectedOutput: json['expectedOutput'] as String?,
      hints:
          (json['hints'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          [],
      runnable: json['runnable'] as bool? ?? true,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'language': language,
      'initialCode': initialCode,
      'runnable': runnable,
    };
    if (expectedOutput != null) map['expectedOutput'] = expectedOutput;
    if (hints.isNotEmpty) map['hints'] = hints;
    return map;
  }
}

/// Code execution trace step
class CodeExecutionTraceStep {
  final int line;
  final String? stdoutDelta;
  final Map<String, dynamic> variables;
  final List<String>? callStack;
  final String? note;

  const CodeExecutionTraceStep({
    required this.line,
    this.stdoutDelta,
    this.variables = const {},
    this.callStack,
    this.note,
  });

  factory CodeExecutionTraceStep.fromJson(Map<String, dynamic> json) {
    final rawLine = json['line'];
    final line = rawLine is num ? rawLine.toInt() : 1;

    final rawVariables = json['variables'];
    final variables = CodeExecutionContent._normalizeJsonMap(rawVariables);

    List<String>? callStack;
    final rawCallStack = json['callStack'];
    if (rawCallStack is List) {
      final parsed = rawCallStack
          .map((value) => value.toString())
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList();
      if (parsed.isNotEmpty) callStack = parsed;
    }

    final stdoutDelta = json['stdoutDelta'] as String?;
    final note = json['note'] as String?;

    return CodeExecutionTraceStep(
      line: line <= 0 ? 1 : line,
      stdoutDelta: stdoutDelta,
      variables: variables,
      callStack: callStack,
      note: note,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'line': line, 'variables': variables};
    if (stdoutDelta != null) map['stdoutDelta'] = stdoutDelta;
    if (callStack != null) map['callStack'] = callStack;
    if (note != null) map['note'] = note;
    return map;
  }

  CodeExecutionTraceStep copyWith({
    int? line,
    String? stdoutDelta,
    Map<String, dynamic>? variables,
    List<String>? callStack,
    String? note,
    bool clearStdoutDelta = false,
    bool clearCallStack = false,
    bool clearNote = false,
  }) {
    return CodeExecutionTraceStep(
      line: (line ?? this.line) <= 0 ? 1 : (line ?? this.line),
      stdoutDelta: clearStdoutDelta ? null : (stdoutDelta ?? this.stdoutDelta),
      variables: variables ?? this.variables,
      callStack: clearCallStack ? null : (callStack ?? this.callStack),
      note: clearNote ? null : (note ?? this.note),
    );
  }
}

/// Code execution checkpoint question
class CodeExecutionCheckpoint {
  final int stepIndex;
  final String question;
  final List<String> options;
  final int correctIndex;
  final String? explanation;

  const CodeExecutionCheckpoint({
    required this.stepIndex,
    required this.question,
    required this.options,
    required this.correctIndex,
    this.explanation,
  });

  factory CodeExecutionCheckpoint.fromJson(Map<String, dynamic> json) {
    final rawStepIndex = json['stepIndex'];
    final stepIndex = rawStepIndex is num ? rawStepIndex.toInt() : 0;

    final rawOptions = json['options'];
    final options = rawOptions is List
        ? rawOptions
              .map((value) => value.toString())
              .map((value) => value.trim())
              .where((value) => value.isNotEmpty)
              .toList()
        : <String>[];

    final rawCorrectIndex = json['correctIndex'];
    final correctIndex = rawCorrectIndex is num ? rawCorrectIndex.toInt() : 0;

    return CodeExecutionCheckpoint(
      stepIndex: stepIndex < 0 ? 0 : stepIndex,
      question: (json['question'] as String? ?? '').trim(),
      options: options,
      correctIndex: correctIndex,
      explanation: json['explanation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'stepIndex': stepIndex,
      'question': question,
      'options': options,
      'correctIndex': correctIndex,
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }

  CodeExecutionCheckpoint copyWith({
    int? stepIndex,
    String? question,
    List<String>? options,
    int? correctIndex,
    String? explanation,
    bool clearExplanation = false,
  }) {
    return CodeExecutionCheckpoint(
      stepIndex: stepIndex ?? this.stepIndex,
      question: question ?? this.question,
      options: options ?? this.options,
      correctIndex: correctIndex ?? this.correctIndex,
      explanation: clearExplanation ? null : (explanation ?? this.explanation),
    );
  }
}

/// Code execution controls
class CodeExecutionControls {
  final bool autoplay;
  final int stepDurationMs;
  final bool allowScrub;

  const CodeExecutionControls({
    this.autoplay = false,
    this.stepDurationMs = 1200,
    this.allowScrub = true,
  });

  factory CodeExecutionControls.fromJson(Map<String, dynamic> json) {
    final rawDuration = json['stepDurationMs'];
    final duration = rawDuration is num ? rawDuration.toInt() : 1200;
    return CodeExecutionControls(
      autoplay: json['autoplay'] as bool? ?? false,
      stepDurationMs: _normalizeDuration(duration),
      allowScrub: json['allowScrub'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'autoplay': autoplay,
    'stepDurationMs': stepDurationMs,
    'allowScrub': allowScrub,
  };

  CodeExecutionControls copyWith({
    bool? autoplay,
    int? stepDurationMs,
    bool? allowScrub,
  }) {
    return CodeExecutionControls(
      autoplay: autoplay ?? this.autoplay,
      stepDurationMs: _normalizeDuration(stepDurationMs ?? this.stepDurationMs),
      allowScrub: allowScrub ?? this.allowScrub,
    );
  }

  static int _normalizeDuration(int durationMs) {
    if (durationMs < 200) return 200;
    if (durationMs > 10000) return 10000;
    return durationMs;
  }
}

/// Code execution style
class CodeExecutionStyle {
  static const Set<String> supportedThemes = {
    'indigo',
    'emerald',
    'amber',
    'slate',
  };

  final String theme;
  final bool showLineNumbers;
  final bool showVariablesPanel;
  final bool showStdoutPanel;

  const CodeExecutionStyle({
    this.theme = 'indigo',
    this.showLineNumbers = true,
    this.showVariablesPanel = true,
    this.showStdoutPanel = true,
  });

  factory CodeExecutionStyle.fromJson(Map<String, dynamic> json) {
    final rawTheme = (json['theme'] as String? ?? 'indigo').trim();
    return CodeExecutionStyle(
      theme: supportedThemes.contains(rawTheme) ? rawTheme : 'indigo',
      showLineNumbers: json['showLineNumbers'] as bool? ?? true,
      showVariablesPanel: json['showVariablesPanel'] as bool? ?? true,
      showStdoutPanel: json['showStdoutPanel'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'theme': theme,
    'showLineNumbers': showLineNumbers,
    'showVariablesPanel': showVariablesPanel,
    'showStdoutPanel': showStdoutPanel,
  };

  CodeExecutionStyle copyWith({
    String? theme,
    bool? showLineNumbers,
    bool? showVariablesPanel,
    bool? showStdoutPanel,
  }) {
    final nextTheme = theme ?? this.theme;
    return CodeExecutionStyle(
      theme: supportedThemes.contains(nextTheme) ? nextTheme : 'indigo',
      showLineNumbers: showLineNumbers ?? this.showLineNumbers,
      showVariablesPanel: showVariablesPanel ?? this.showVariablesPanel,
      showStdoutPanel: showStdoutPanel ?? this.showStdoutPanel,
    );
  }
}

/// Code execution content
class CodeExecutionContent implements BlockContent {
  final String title;
  final String language;
  final String sourceCode;
  final List<CodeExecutionTraceStep> traceSteps;
  final Map<String, dynamic> initialVariables;
  final List<CodeExecutionCheckpoint> checkpoints;
  final CodeExecutionControls controls;
  final CodeExecutionStyle style;

  const CodeExecutionContent({
    this.title = 'Code Execution',
    this.language = 'python',
    this.sourceCode = '',
    this.traceSteps = const [],
    this.initialVariables = const {},
    this.checkpoints = const [],
    this.controls = const CodeExecutionControls(),
    this.style = const CodeExecutionStyle(),
  });

  factory CodeExecutionContent.fromJson(Map<String, dynamic> json) {
    final sourceCode =
        (json['sourceCode'] as String? ?? json['code'] as String? ?? '');

    final steps =
        (json['traceSteps'] as List<dynamic>?)
            ?.whereType<Map>()
            .map(
              (item) => CodeExecutionTraceStep.fromJson(
                Map<String, dynamic>.from(item),
              ),
            )
            .toList() ??
        const <CodeExecutionTraceStep>[];

    final checkpoints =
        (json['checkpoints'] as List<dynamic>?)
            ?.whereType<Map>()
            .map(
              (item) => CodeExecutionCheckpoint.fromJson(
                Map<String, dynamic>.from(item),
              ),
            )
            .toList() ??
        const <CodeExecutionCheckpoint>[];

    final initialVariables = _normalizeJsonMap(json['initialVariables']);

    return CodeExecutionContent(
      title: (json['title'] as String? ?? 'Code Execution').trim(),
      language: (json['language'] as String? ?? 'python').trim(),
      sourceCode: sourceCode,
      traceSteps: steps.isNotEmpty
          ? steps
          : const [CodeExecutionTraceStep(line: 1, variables: {})],
      initialVariables: initialVariables,
      checkpoints: checkpoints,
      controls: json['controls'] is Map
          ? CodeExecutionControls.fromJson(
              Map<String, dynamic>.from(json['controls'] as Map),
            )
          : const CodeExecutionControls(),
      style: json['style'] is Map
          ? CodeExecutionStyle.fromJson(
              Map<String, dynamic>.from(json['style'] as Map),
            )
          : const CodeExecutionStyle(),
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title,
      'language': language,
      'sourceCode': sourceCode,
      'traceSteps': traceSteps.map((step) => step.toJson()).toList(),
      'controls': controls.toJson(),
      'style': style.toJson(),
    };
    if (initialVariables.isNotEmpty) {
      map['initialVariables'] = initialVariables;
    }
    if (checkpoints.isNotEmpty) {
      map['checkpoints'] = checkpoints.map((cp) => cp.toJson()).toList();
    }
    return map;
  }

  CodeExecutionContent copyWith({
    String? title,
    String? language,
    String? sourceCode,
    List<CodeExecutionTraceStep>? traceSteps,
    Map<String, dynamic>? initialVariables,
    List<CodeExecutionCheckpoint>? checkpoints,
    CodeExecutionControls? controls,
    CodeExecutionStyle? style,
  }) {
    return CodeExecutionContent(
      title: title ?? this.title,
      language: language ?? this.language,
      sourceCode: sourceCode ?? this.sourceCode,
      traceSteps: traceSteps ?? this.traceSteps,
      initialVariables: initialVariables ?? this.initialVariables,
      checkpoints: checkpoints ?? this.checkpoints,
      controls: controls ?? this.controls,
      style: style ?? this.style,
    );
  }

  static Map<String, dynamic> _normalizeJsonMap(dynamic raw) {
    if (raw is! Map) return const {};
    final normalized = <String, dynamic>{};
    raw.forEach((key, value) {
      final keyStr = key.toString().trim();
      if (keyStr.isEmpty) return;
      normalized[keyStr] = value;
    });
    return normalized;
  }
}

/// Function flow node
class FunctionFlowNode {
  static const String kindStart = 'start';
  static const String kindFunction = 'function';
  static const String kindEnd = 'end';
  static const Set<String> supportedKinds = {kindStart, kindFunction, kindEnd};

  final String id;
  final String label;
  final double x;
  final double y;
  final String kind;
  final String? description;

  const FunctionFlowNode({
    required this.id,
    required this.label,
    required this.x,
    required this.y,
    this.kind = kindFunction,
    this.description,
  });

  factory FunctionFlowNode.fromJson(Map<String, dynamic> json) {
    final rawKind = (json['kind'] as String? ?? kindFunction).trim();
    final normalizedKind = supportedKinds.contains(rawKind)
        ? rawKind
        : kindFunction;
    return FunctionFlowNode(
      id: (json['id'] as String? ?? '').trim(),
      label: (json['label'] as String? ?? '').trim(),
      x: _normalizeCoordinate(json['x']),
      y: _normalizeCoordinate(json['y']),
      kind: normalizedKind,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'id': id,
      'label': label,
      'x': x,
      'y': y,
      'kind': kind,
    };
    if (description != null) map['description'] = description;
    return map;
  }

  FunctionFlowNode copyWith({
    String? id,
    String? label,
    double? x,
    double? y,
    String? kind,
    String? description,
    bool clearDescription = false,
  }) {
    final nextKind = kind ?? this.kind;
    return FunctionFlowNode(
      id: id ?? this.id,
      label: label ?? this.label,
      x: _normalizeCoordinate(x ?? this.x),
      y: _normalizeCoordinate(y ?? this.y),
      kind: supportedKinds.contains(nextKind) ? nextKind : kindFunction,
      description: clearDescription ? null : (description ?? this.description),
    );
  }

  static double _normalizeCoordinate(dynamic raw) {
    final value = raw is num ? raw.toDouble() : 0.0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }
}

/// Function flow edge
class FunctionFlowEdge {
  final String from;
  final String to;
  final String? label;

  const FunctionFlowEdge({required this.from, required this.to, this.label});

  factory FunctionFlowEdge.fromJson(Map<String, dynamic> json) {
    return FunctionFlowEdge(
      from: (json['from'] as String? ?? '').trim(),
      to: (json['to'] as String? ?? '').trim(),
      label: json['label'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'from': from, 'to': to};
    if (label != null) map['label'] = label;
    return map;
  }

  FunctionFlowEdge copyWith({
    String? from,
    String? to,
    String? label,
    bool clearLabel = false,
  }) {
    return FunctionFlowEdge(
      from: from ?? this.from,
      to: to ?? this.to,
      label: clearLabel ? null : (label ?? this.label),
    );
  }
}

/// Function flow step
class FunctionFlowStep {
  final int edgeIndex;
  final int? durationMs;
  final String? note;

  const FunctionFlowStep({required this.edgeIndex, this.durationMs, this.note});

  factory FunctionFlowStep.fromJson(Map<String, dynamic> json) {
    final rawIndex = json['edgeIndex'];
    final rawDuration = json['durationMs'];
    return FunctionFlowStep(
      edgeIndex: rawIndex is num ? rawIndex.toInt() : -1,
      durationMs: rawDuration is num ? rawDuration.toInt() : null,
      note: json['note'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'edgeIndex': edgeIndex};
    if (durationMs != null) map['durationMs'] = durationMs;
    if (note != null) map['note'] = note;
    return map;
  }

  FunctionFlowStep copyWith({
    int? edgeIndex,
    int? durationMs,
    String? note,
    bool clearDuration = false,
    bool clearNote = false,
  }) {
    return FunctionFlowStep(
      edgeIndex: edgeIndex ?? this.edgeIndex,
      durationMs: clearDuration ? null : (durationMs ?? this.durationMs),
      note: clearNote ? null : (note ?? this.note),
    );
  }
}

/// Function flow style
class FunctionFlowStyle {
  static const Set<String> supportedThemes = {'indigo', 'emerald', 'amber'};

  final String theme;
  final bool showArrows;
  final int stepDurationMs;
  final double lineWidth;

  const FunctionFlowStyle({
    this.theme = 'indigo',
    this.showArrows = true,
    this.stepDurationMs = 1200,
    this.lineWidth = 2.0,
  });

  factory FunctionFlowStyle.fromJson(Map<String, dynamic> json) {
    final rawTheme = (json['theme'] as String? ?? 'indigo').trim();
    final rawDuration = json['stepDurationMs'];
    final rawLineWidth = json['lineWidth'];
    return FunctionFlowStyle(
      theme: supportedThemes.contains(rawTheme) ? rawTheme : 'indigo',
      showArrows: json['showArrows'] as bool? ?? true,
      stepDurationMs: _normalizeStepDuration(rawDuration),
      lineWidth: _normalizeLineWidth(rawLineWidth),
    );
  }

  Map<String, dynamic> toJson() => {
    'theme': theme,
    'showArrows': showArrows,
    'stepDurationMs': stepDurationMs,
    'lineWidth': lineWidth,
  };

  FunctionFlowStyle copyWith({
    String? theme,
    bool? showArrows,
    int? stepDurationMs,
    double? lineWidth,
  }) {
    final nextTheme = theme ?? this.theme;
    return FunctionFlowStyle(
      theme: supportedThemes.contains(nextTheme) ? nextTheme : 'indigo',
      showArrows: showArrows ?? this.showArrows,
      stepDurationMs: _normalizeStepDuration(
        stepDurationMs ?? this.stepDurationMs,
      ),
      lineWidth: _normalizeLineWidth(lineWidth ?? this.lineWidth),
    );
  }

  static int _normalizeStepDuration(dynamic raw) {
    final value = raw is num ? raw.toInt() : 1200;
    if (value < 200) return 200;
    if (value > 8000) return 8000;
    return value;
  }

  static double _normalizeLineWidth(dynamic raw) {
    final value = raw is num ? raw.toDouble() : 2.0;
    if (value < 1.0) return 1.0;
    if (value > 6.0) return 6.0;
    return value;
  }
}

/// Function flow content
class FunctionFlowContent implements BlockContent {
  final String title;
  final List<FunctionFlowNode> nodes;
  final List<FunctionFlowEdge> edges;
  final String? entryNodeId;
  final List<FunctionFlowStep> steps;
  final FunctionFlowStyle style;

  const FunctionFlowContent({
    this.title = 'Function Flow',
    this.nodes = const [],
    this.edges = const [],
    this.entryNodeId,
    this.steps = const [],
    this.style = const FunctionFlowStyle(),
  });

  factory FunctionFlowContent.fromJson(Map<String, dynamic> json) {
    final parsedNodes =
        (json['nodes'] as List<dynamic>?)
            ?.whereType<Map>()
            .map(
              (item) =>
                  FunctionFlowNode.fromJson(Map<String, dynamic>.from(item)),
            )
            .where((node) => node.id.isNotEmpty)
            .toList() ??
        const <FunctionFlowNode>[];
    final parsedEdges =
        (json['edges'] as List<dynamic>?)
            ?.whereType<Map>()
            .map(
              (item) =>
                  FunctionFlowEdge.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList() ??
        const <FunctionFlowEdge>[];
    final parsedSteps =
        (json['steps'] as List<dynamic>?)
            ?.whereType<Map>()
            .map(
              (item) =>
                  FunctionFlowStep.fromJson(Map<String, dynamic>.from(item)),
            )
            .where((step) => step.edgeIndex >= 0)
            .toList() ??
        const <FunctionFlowStep>[];
    final rawEntryNodeId = (json['entryNodeId'] as String?)?.trim();
    final availableNodeIds = parsedNodes.map((node) => node.id).toSet();
    final normalizedEntry =
        rawEntryNodeId != null &&
            rawEntryNodeId.isNotEmpty &&
            availableNodeIds.contains(rawEntryNodeId)
        ? rawEntryNodeId
        : null;

    return FunctionFlowContent(
      title: (json['title'] as String? ?? 'Function Flow').trim(),
      nodes: parsedNodes,
      edges: parsedEdges,
      entryNodeId: normalizedEntry,
      steps: parsedSteps,
      style: json['style'] is Map
          ? FunctionFlowStyle.fromJson(
              Map<String, dynamic>.from(json['style'] as Map),
            )
          : const FunctionFlowStyle(),
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title,
      'nodes': nodes.map((node) => node.toJson()).toList(),
      'edges': edges.map((edge) => edge.toJson()).toList(),
      'steps': steps.map((step) => step.toJson()).toList(),
      'style': style.toJson(),
    };
    if (entryNodeId != null) map['entryNodeId'] = entryNodeId;
    return map;
  }

  FunctionFlowContent copyWith({
    String? title,
    List<FunctionFlowNode>? nodes,
    List<FunctionFlowEdge>? edges,
    String? entryNodeId,
    List<FunctionFlowStep>? steps,
    FunctionFlowStyle? style,
    bool clearEntryNodeId = false,
  }) {
    return FunctionFlowContent(
      title: title ?? this.title,
      nodes: nodes ?? this.nodes,
      edges: edges ?? this.edges,
      entryNodeId: clearEntryNodeId ? null : (entryNodeId ?? this.entryNodeId),
      steps: steps ?? this.steps,
      style: style ?? this.style,
    );
  }
}

/// Multiple choice option
class ChoiceOption {
  final String id;
  final String text;

  const ChoiceOption({required this.id, required this.text});

  factory ChoiceOption.fromJson(Map<String, dynamic> json) {
    return ChoiceOption(id: json['id'] as String, text: json['text'] as String);
  }

  Map<String, dynamic> toJson() => {'id': id, 'text': text};
}

/// Multiple choice content
class MultipleChoiceContent implements BlockContent {
  final String question;
  final List<ChoiceOption> options;
  final String correctAnswer;
  final List<String> correctAnswers;
  final String? explanation;
  final bool multiSelect;

  const MultipleChoiceContent({
    this.question = '',
    this.options = const [],
    this.correctAnswer = '',
    this.correctAnswers = const [],
    this.explanation,
    this.multiSelect = false,
  });

  factory MultipleChoiceContent.fromJson(Map<String, dynamic> json) {
    final parsedCorrectAnswers =
        (json['correctAnswers'] as List<dynamic>?)
            ?.whereType<String>()
            .toList() ??
        [];
    final legacyCorrectAnswer = json['correctAnswer'] as String? ?? '';
    final normalizedCorrectAnswers = _normalizeAnswerIds([
      ...parsedCorrectAnswers,
      legacyCorrectAnswer,
    ]);

    return MultipleChoiceContent(
      question: json['question'] as String? ?? '',
      options:
          (json['options'] as List<dynamic>?)
              ?.map((e) => ChoiceOption.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      correctAnswer: normalizedCorrectAnswers.isNotEmpty
          ? normalizedCorrectAnswers.first
          : '',
      correctAnswers: normalizedCorrectAnswers,
      explanation: json['explanation'] as String?,
      multiSelect: json['multiSelect'] as bool? ?? false,
    );
  }

  /// Merged and deduplicated list of correct answer IDs.
  List<String> get normalizedCorrectAnswers {
    return _normalizeAnswerIds([...correctAnswers, correctAnswer]);
  }

  String get primaryCorrectAnswer {
    final normalized = normalizedCorrectAnswers;
    return normalized.isNotEmpty ? normalized.first : '';
  }

  @override
  Map<String, dynamic> toJson() {
    final normalized = normalizedCorrectAnswers;
    final map = <String, dynamic>{
      'question': question,
      'options': options.map((o) => o.toJson()).toList(),
      // Keep legacy single-answer key for backward compatibility.
      'correctAnswer': normalized.isNotEmpty ? normalized.first : '',
      'correctAnswers': normalized,
      'multiSelect': multiSelect,
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }

  MultipleChoiceContent copyWith({
    String? question,
    List<ChoiceOption>? options,
    String? correctAnswer,
    List<String>? correctAnswers,
    String? explanation,
    bool clearExplanation = false,
    bool? multiSelect,
  }) {
    final normalized = _normalizeAnswerIds([
      ...(correctAnswers ?? this.correctAnswers),
      correctAnswer ?? this.correctAnswer,
    ]);

    return MultipleChoiceContent(
      question: question ?? this.question,
      options: options ?? this.options,
      correctAnswer: normalized.isNotEmpty ? normalized.first : '',
      correctAnswers: normalized,
      explanation: clearExplanation ? null : (explanation ?? this.explanation),
      multiSelect: multiSelect ?? this.multiSelect,
    );
  }

  static List<String> _normalizeAnswerIds(Iterable<String> rawIds) {
    final seen = <String>{};
    final result = <String>[];

    for (final rawId in rawIds) {
      final id = rawId.trim();
      if (id.isEmpty || !seen.add(id)) continue;
      result.add(id);
    }

    return result;
  }
}

/// Fill-in-the-blank content
class FillBlankContent implements BlockContent {
  final String question;
  final String correctAnswer;
  final String? hint;

  const FillBlankContent({
    this.question = '',
    this.correctAnswer = '',
    this.hint,
  });

  factory FillBlankContent.fromJson(Map<String, dynamic> json) {
    return FillBlankContent(
      question: json['question'] as String? ?? '',
      correctAnswer: json['correctAnswer'] as String? ?? '',
      hint: json['hint'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'question': question,
      'correctAnswer': correctAnswer,
    };
    if (hint != null) map['hint'] = hint;
    return map;
  }
}

/// True/False content
class TrueFalseContent implements BlockContent {
  final String question;
  final bool correctAnswer;
  final String? explanation;

  const TrueFalseContent({
    this.question = '',
    this.correctAnswer = true,
    this.explanation,
  });

  factory TrueFalseContent.fromJson(Map<String, dynamic> json) {
    return TrueFalseContent(
      question: json['question'] as String? ?? '',
      correctAnswer: json['correctAnswer'] as bool? ?? true,
      explanation: json['explanation'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'question': question,
      'correctAnswer': correctAnswer,
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }

  TrueFalseContent copyWith({
    String? question,
    bool? correctAnswer,
    String? explanation,
  }) {
    return TrueFalseContent(
      question: question ?? this.question,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      explanation: explanation ?? this.explanation,
    );
  }
}

/// Matching question option
class MatchingItem {
  final String id;
  final String text;

  const MatchingItem({required this.id, required this.text});

  factory MatchingItem.fromJson(Map<String, dynamic> json) {
    return MatchingItem(id: json['id'] as String, text: json['text'] as String);
  }

  Map<String, dynamic> toJson() => {'id': id, 'text': text};

  MatchingItem copyWith({String? id, String? text}) {
    return MatchingItem(id: id ?? this.id, text: text ?? this.text);
  }
}

/// Matching question pair
class MatchingPair {
  final String leftId;
  final String rightId;

  const MatchingPair({required this.leftId, required this.rightId});

  factory MatchingPair.fromJson(Map<String, dynamic> json) {
    return MatchingPair(
      leftId: json['leftId'] as String,
      rightId: json['rightId'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'leftId': leftId, 'rightId': rightId};
}

/// Matching graph node
class MatchingNode {
  static const String groupLeft = 'left';
  static const String groupRight = 'right';
  static const String groupNeutral = 'neutral';
  static const Set<String> supportedGroups = {
    groupLeft,
    groupRight,
    groupNeutral,
  };

  final String id;
  final String label;
  final double x;
  final double y;
  final String group;

  const MatchingNode({
    required this.id,
    required this.label,
    required this.x,
    required this.y,
    this.group = groupNeutral,
  });

  factory MatchingNode.fromJson(Map<String, dynamic> json) {
    final rawGroup = (json['group'] as String? ?? groupNeutral).trim();
    final normalizedGroup = supportedGroups.contains(rawGroup)
        ? rawGroup
        : groupNeutral;
    return MatchingNode(
      id: (json['id'] as String? ?? '').trim(),
      label: (json['label'] as String? ?? json['text'] as String? ?? '').trim(),
      x: _normalizeCoordinate(json['x']),
      y: _normalizeCoordinate(json['y']),
      group: normalizedGroup,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'x': x,
    'y': y,
    'group': group,
  };

  MatchingNode copyWith({
    String? id,
    String? label,
    double? x,
    double? y,
    String? group,
  }) {
    final nextGroup = group ?? this.group;
    return MatchingNode(
      id: id ?? this.id,
      label: label ?? this.label,
      x: _normalizeCoordinate(x ?? this.x),
      y: _normalizeCoordinate(y ?? this.y),
      group: supportedGroups.contains(nextGroup) ? nextGroup : groupNeutral,
    );
  }

  static double _normalizeCoordinate(dynamic raw) {
    final value = raw is num ? raw.toDouble() : 0.0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }
}

/// Matching graph edge
class MatchingEdge {
  final String from;
  final String to;
  final String? label;
  final bool? directed;

  const MatchingEdge({
    required this.from,
    required this.to,
    this.label,
    this.directed,
  });

  factory MatchingEdge.fromJson(Map<String, dynamic> json) {
    return MatchingEdge(
      from: (json['from'] as String? ?? '').trim(),
      to: (json['to'] as String? ?? '').trim(),
      label: json['label'] as String?,
      directed: json['directed'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'from': from, 'to': to};
    if (label != null) map['label'] = label;
    if (directed != null) map['directed'] = directed;
    return map;
  }

  MatchingEdge copyWith({
    String? from,
    String? to,
    String? label,
    bool? directed,
    bool clearLabel = false,
    bool clearDirected = false,
  }) {
    return MatchingEdge(
      from: from ?? this.from,
      to: to ?? this.to,
      label: clearLabel ? null : (label ?? this.label),
      directed: clearDirected ? null : (directed ?? this.directed),
    );
  }
}

/// Matching graph rules
class MatchingRules {
  final bool allowOneToMany;
  final bool allowManyToMany;
  final bool directed;

  const MatchingRules({
    this.allowOneToMany = false,
    this.allowManyToMany = false,
    this.directed = true,
  });

  factory MatchingRules.fromJson(Map<String, dynamic> json) {
    final allowManyToMany = json['allowManyToMany'] as bool? ?? false;
    final allowOneToMany = allowManyToMany
        ? true
        : (json['allowOneToMany'] as bool? ?? false);
    return MatchingRules(
      allowOneToMany: allowOneToMany,
      allowManyToMany: allowManyToMany,
      directed: json['directed'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'allowOneToMany': allowOneToMany,
    'allowManyToMany': allowManyToMany,
    'directed': directed,
  };

  MatchingRules copyWith({
    bool? allowOneToMany,
    bool? allowManyToMany,
    bool? directed,
  }) {
    final nextAllowManyToMany = allowManyToMany ?? this.allowManyToMany;
    final nextAllowOneToMany = nextAllowManyToMany
        ? true
        : (allowOneToMany ?? this.allowOneToMany);
    return MatchingRules(
      allowOneToMany: nextAllowOneToMany,
      allowManyToMany: nextAllowManyToMany,
      directed: directed ?? this.directed,
    );
  }
}

/// Matching question content
class MatchingContent implements BlockContent {
  static const String modeList = 'list';
  static const String modeGraph = 'graph';
  static const Set<String> supportedModes = {modeList, modeGraph};

  final String question;
  final List<MatchingItem> leftItems;
  final List<MatchingItem> rightItems;
  final List<MatchingPair> correctPairs;
  final String mode;
  final List<MatchingNode> nodes;
  final List<MatchingEdge> edges;
  final MatchingRules rules;
  final String? explanation;

  const MatchingContent({
    this.question = '',
    this.leftItems = const [],
    this.rightItems = const [],
    this.correctPairs = const [],
    this.mode = modeList,
    this.nodes = const [],
    this.edges = const [],
    this.rules = const MatchingRules(),
    this.explanation,
  });

  factory MatchingContent.fromJson(Map<String, dynamic> json) {
    final leftItems =
        (json['leftItems'] as List<dynamic>?)
            ?.map((e) => MatchingItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const <MatchingItem>[];
    final rightItems =
        (json['rightItems'] as List<dynamic>?)
            ?.map((e) => MatchingItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const <MatchingItem>[];
    final correctPairs =
        (json['correctPairs'] as List<dynamic>?)
            ?.map((e) => MatchingPair.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const <MatchingPair>[];
    final parsedNodes =
        (json['nodes'] as List<dynamic>?)
            ?.whereType<Map>()
            .map((e) => MatchingNode.fromJson(Map<String, dynamic>.from(e)))
            .where((n) => n.id.isNotEmpty && n.label.isNotEmpty)
            .toList() ??
        const <MatchingNode>[];
    final parsedEdges =
        (json['edges'] as List<dynamic>?)
            ?.whereType<Map>()
            .map((e) => MatchingEdge.fromJson(Map<String, dynamic>.from(e)))
            .where((e) => e.from.isNotEmpty && e.to.isNotEmpty)
            .toList() ??
        const <MatchingEdge>[];
    final inferredNodes = parsedNodes.isNotEmpty
        ? parsedNodes
        : _deriveNodesFromLegacy(leftItems, rightItems);
    final inferredNodeIds = inferredNodes.map((n) => n.id).toSet();
    final inferredEdges = parsedEdges.isNotEmpty
        ? parsedEdges
              .where(
                (edge) =>
                    inferredNodeIds.isEmpty ||
                    (inferredNodeIds.contains(edge.from) &&
                        inferredNodeIds.contains(edge.to)),
              )
              .toList()
        : _deriveEdgesFromPairs(correctPairs);
    final rawMode = (json['mode'] as String?)?.trim();
    final inferredMode = supportedModes.contains(rawMode)
        ? rawMode!
        : ((json.containsKey('nodes') || json.containsKey('edges'))
              ? modeGraph
              : modeList);

    return MatchingContent(
      question: json['question'] as String? ?? '',
      leftItems: leftItems,
      rightItems: rightItems,
      correctPairs: correctPairs,
      mode: inferredMode,
      nodes: inferredNodes,
      edges: inferredEdges,
      rules: json['rules'] is Map
          ? MatchingRules.fromJson(
              Map<String, dynamic>.from(json['rules'] as Map),
            )
          : const MatchingRules(),
      explanation: json['explanation'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'question': question,
      'leftItems': leftItems.map((i) => i.toJson()).toList(),
      'rightItems': rightItems.map((i) => i.toJson()).toList(),
      'correctPairs': correctPairs.map((p) => p.toJson()).toList(),
      'mode': mode,
      'nodes': nodes.map((n) => n.toJson()).toList(),
      'edges': edges.map((e) => e.toJson()).toList(),
      'rules': rules.toJson(),
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }

  MatchingContent copyWith({
    String? question,
    List<MatchingItem>? leftItems,
    List<MatchingItem>? rightItems,
    List<MatchingPair>? correctPairs,
    String? mode,
    List<MatchingNode>? nodes,
    List<MatchingEdge>? edges,
    MatchingRules? rules,
    String? explanation,
  }) {
    final nextMode = mode ?? this.mode;
    return MatchingContent(
      question: question ?? this.question,
      leftItems: leftItems ?? this.leftItems,
      rightItems: rightItems ?? this.rightItems,
      correctPairs: correctPairs ?? this.correctPairs,
      mode: supportedModes.contains(nextMode) ? nextMode : modeList,
      nodes: nodes ?? this.nodes,
      edges: edges ?? this.edges,
      rules: rules ?? this.rules,
      explanation: explanation ?? this.explanation,
    );
  }

  static List<MatchingNode> _deriveNodesFromLegacy(
    List<MatchingItem> leftItems,
    List<MatchingItem> rightItems,
  ) {
    final result = <MatchingNode>[];

    final leftStep = leftItems.isEmpty ? 50.0 : 80.0 / (leftItems.length + 1);
    for (int i = 0; i < leftItems.length; i++) {
      final item = leftItems[i];
      result.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 18,
          y: 10 + leftStep * (i + 1),
          group: MatchingNode.groupLeft,
        ),
      );
    }

    final rightStep = rightItems.isEmpty
        ? 50.0
        : 80.0 / (rightItems.length + 1);
    for (int i = 0; i < rightItems.length; i++) {
      final item = rightItems[i];
      result.add(
        MatchingNode(
          id: item.id,
          label: item.text,
          x: 82,
          y: 10 + rightStep * (i + 1),
          group: MatchingNode.groupRight,
        ),
      );
    }

    return result;
  }

  static List<MatchingEdge> _deriveEdgesFromPairs(List<MatchingPair> pairs) {
    return pairs
        .map(
          (pair) =>
              MatchingEdge(from: pair.leftId, to: pair.rightId, directed: true),
        )
        .toList();
  }
}

/// Animation content
class AnimationContent implements BlockContent {
  static const String presetBouncingDot = 'bouncing-dot';
  static const String presetPulseBars = 'pulse-bars';
  static const Set<String> supportedPresets = {
    presetBouncingDot,
    presetPulseBars,
  };

  final String preset;
  final int durationMs;
  final bool loop;
  final double speed;

  const AnimationContent({
    this.preset = presetBouncingDot,
    this.durationMs = 2000,
    this.loop = true,
    this.speed = 1.0,
  });

  factory AnimationContent.fromJson(Map<String, dynamic> json) {
    final rawPreset = json['preset'] as String? ?? presetBouncingDot;
    final rawDuration = json['durationMs'] ?? json['duration'];
    final rawSpeed = json['speed'];

    return AnimationContent(
      preset: supportedPresets.contains(rawPreset)
          ? rawPreset
          : presetBouncingDot,
      durationMs: _normalizeDuration(rawDuration),
      loop: json['loop'] as bool? ?? true,
      speed: _normalizeSpeed(rawSpeed),
    );
  }

  @override
  Map<String, dynamic> toJson() => {
    'preset': preset,
    'durationMs': durationMs,
    'loop': loop,
    'speed': speed,
  };

  AnimationContent copyWith({
    String? preset,
    int? durationMs,
    bool? loop,
    double? speed,
  }) {
    final nextPreset = preset ?? this.preset;
    return AnimationContent(
      preset: supportedPresets.contains(nextPreset)
          ? nextPreset
          : presetBouncingDot,
      durationMs: _normalizeDuration(durationMs ?? this.durationMs),
      loop: loop ?? this.loop,
      speed: _normalizeSpeed(speed ?? this.speed),
    );
  }

  static int _normalizeDuration(dynamic raw) {
    final value = raw is num ? raw.toInt() : 2000;
    if (value < 300) return 300;
    if (value > 10000) return 10000;
    return value;
  }

  static double _normalizeSpeed(dynamic raw) {
    final value = raw is num ? raw.toDouble() : 1.0;
    if (value < 0.25) return 0.25;
    if (value > 3.0) return 3.0;
    return value;
  }
}

/// Video content
class VideoContent implements BlockContent {
  final String url;
  final String? title;

  const VideoContent({this.url = '', this.title});

  factory VideoContent.fromJson(Map<String, dynamic> json) {
    return VideoContent(
      url: json['url'] as String? ?? '',
      title: json['title'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'url': url};
    if (title != null) map['title'] = title;
    return map;
  }
}

/// Block model - basic unit of course content
class Block {
  final String id;
  final BlockType type;
  final BlockPosition position;
  final BlockStyle style;
  final BlockContent content;
  final String visibilityRule; // 'always' | 'afterPreviousCorrect'

  const Block({
    required this.id,
    required this.type,
    required this.position,
    required this.style,
    required this.content,
    this.visibilityRule = 'always',
  });

  /// Create default block
  factory Block.create(BlockType type, {int order = 0}) {
    return Block(
      id: IdGenerator.blockId(),
      type: type,
      position: BlockPosition(order: order),
      style: const BlockStyle(),
      content: _getDefaultContent(type),
    );
  }

  static BlockContent _getDefaultContent(BlockType type) {
    switch (type) {
      case BlockType.text:
        return const TextContent(value: 'Enter text here...');
      case BlockType.image:
        return const ImageContent();
      case BlockType.codeBlock:
        return const CodeBlockContent(code: '# Enter code here');
      case BlockType.codePlayground:
        return const CodePlaygroundContent(
          initialCode: '# Write your Python code\nprint("Hello, World!")',
        );
      case BlockType.codeExecution:
        return const CodeExecutionContent(
          title: 'Code Execution',
          language: 'python',
          sourceCode:
              'def add(a, b):\n'
              '    result = a + b\n'
              '    print(result)\n'
              '\n'
              'add(2, 3)',
          traceSteps: [
            CodeExecutionTraceStep(line: 1, variables: {}),
            CodeExecutionTraceStep(
              line: 2,
              variables: {'a': 2, 'b': 3},
              callStack: ['add(a=2, b=3)'],
            ),
            CodeExecutionTraceStep(
              line: 3,
              stdoutDelta: '5',
              variables: {'a': 2, 'b': 3, 'result': 5},
              callStack: ['add(a=2, b=3)'],
              note: 'Print current result to stdout',
            ),
            CodeExecutionTraceStep(line: 5, variables: {'result': 5}),
          ],
          checkpoints: [
            CodeExecutionCheckpoint(
              stepIndex: 1,
              question: 'What is the value of result after line 2?',
              options: ['2', '3', '5'],
              correctIndex: 2,
              explanation: 'result = a + b = 2 + 3 = 5',
            ),
          ],
        );
      case BlockType.functionFlow:
        return const FunctionFlowContent(
          title: 'Function Call Flow',
          nodes: [
            FunctionFlowNode(
              id: 'start',
              label: 'Start',
              x: 15,
              y: 50,
              kind: FunctionFlowNode.kindStart,
            ),
            FunctionFlowNode(
              id: 'process',
              label: 'processInput()',
              x: 50,
              y: 50,
              kind: FunctionFlowNode.kindFunction,
              description: 'Parse input and prepare normalized data.',
            ),
            FunctionFlowNode(
              id: 'result',
              label: 'return result',
              x: 85,
              y: 50,
              kind: FunctionFlowNode.kindEnd,
            ),
          ],
          edges: [
            FunctionFlowEdge(from: 'start', to: 'process', label: 'call'),
            FunctionFlowEdge(from: 'process', to: 'result', label: 'return'),
          ],
          entryNodeId: 'start',
          steps: [
            FunctionFlowStep(edgeIndex: 0, note: 'Start calls processInput'),
            FunctionFlowStep(edgeIndex: 1, note: 'processInput returns result'),
          ],
        );
      case BlockType.multipleChoice:
        return MultipleChoiceContent(
          question: 'Enter a question',
          options: [
            const ChoiceOption(id: 'a', text: 'Option A'),
            const ChoiceOption(id: 'b', text: 'Option B'),
            const ChoiceOption(id: 'c', text: 'Option C'),
          ],
          correctAnswer: 'a',
          correctAnswers: ['a'],
        );
      case BlockType.fillBlank:
        return const FillBlankContent(
          question: 'Enter a fill-in-the-blank question',
        );
      case BlockType.trueFalse:
        return const TrueFalseContent(
          question: 'Enter a true or false statement',
          correctAnswer: true,
        );
      case BlockType.matching:
        return MatchingContent(
          question: 'Match the items on the left with those on the right',
          leftItems: const [
            MatchingItem(id: 'l1', text: 'Item 1'),
            MatchingItem(id: 'l2', text: 'Item 2'),
            MatchingItem(id: 'l3', text: 'Item 3'),
          ],
          rightItems: const [
            MatchingItem(id: 'r1', text: 'Match A'),
            MatchingItem(id: 'r2', text: 'Match B'),
            MatchingItem(id: 'r3', text: 'Match C'),
          ],
          correctPairs: const [
            MatchingPair(leftId: 'l1', rightId: 'r1'),
            MatchingPair(leftId: 'l2', rightId: 'r2'),
            MatchingPair(leftId: 'l3', rightId: 'r3'),
          ],
        );
      case BlockType.animation:
        return const AnimationContent();
      case BlockType.video:
        return const VideoContent();
    }
  }

  factory Block.fromJson(Map<String, dynamic> json) {
    final type = BlockType.fromValue(json['type'] as String);
    return Block(
      id: json['id'] as String,
      type: type,
      position: BlockPosition.fromJson(
        json['position'] as Map<String, dynamic>? ?? {},
      ),
      style: BlockStyle.fromJson(json['style'] as Map<String, dynamic>? ?? {}),
      content: BlockContent.fromJson(
        type,
        json['content'] as Map<String, dynamic>,
      ),
      visibilityRule: json['visibilityRule'] as String? ?? 'always',
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type.value,
    'id': id,
    'position': position.toJson(),
    'style': style.toJson(),
    'content': content.toJson(),
    'visibilityRule': visibilityRule,
  };

  Block copyWith({
    String? id,
    BlockType? type,
    BlockPosition? position,
    BlockStyle? style,
    BlockContent? content,
    String? visibilityRule,
  }) {
    return Block(
      id: id ?? this.id,
      type: type ?? this.type,
      position: position ?? this.position,
      style: style ?? this.style,
      content: content ?? this.content,
      visibilityRule: visibilityRule ?? this.visibilityRule,
    );
  }
}
