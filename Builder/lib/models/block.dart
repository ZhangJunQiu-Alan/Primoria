import 'block_type.dart';
import '../services/id_generator.dart';

/// Block 位置信息
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

/// Block 样式配置
class BlockStyle {
  final String spacing;
  final String alignment;
  final double? height;

  const BlockStyle({
    this.spacing = 'md',
    this.alignment = 'left',
    this.height,
  });

  factory BlockStyle.fromJson(Map<String, dynamic> json) {
    return BlockStyle(
      spacing: json['spacing'] as String? ?? 'md',
      alignment: json['alignment'] as String? ?? 'left',
      height: (json['height'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'spacing': spacing,
      'alignment': alignment,
    };
    if (height != null) map['height'] = height;
    return map;
  }

  BlockStyle copyWith({
    String? spacing,
    String? alignment,
    double? height,
  }) {
    return BlockStyle(
      spacing: spacing ?? this.spacing,
      alignment: alignment ?? this.alignment,
      height: height ?? this.height,
    );
  }
}

/// Block 内容 - 基类
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
      case BlockType.multipleChoice:
        return MultipleChoiceContent.fromJson(json);
      case BlockType.fillBlank:
        return FillBlankContent.fromJson(json);
      case BlockType.matching:
        return MatchingContent.fromJson(json);
      case BlockType.video:
        return VideoContent.fromJson(json);
    }
  }
}

/// 文本模块内容
class TextContent implements BlockContent {
  final String format; // 'markdown' | 'plain'
  final String value;

  const TextContent({
    this.format = 'markdown',
    this.value = '',
  });

  factory TextContent.fromJson(Map<String, dynamic> json) {
    return TextContent(
      format: json['format'] as String? ?? 'markdown',
      value: json['value'] as String? ?? '',
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        'format': format,
        'value': value,
      };

  TextContent copyWith({String? format, String? value}) {
    return TextContent(
      format: format ?? this.format,
      value: value ?? this.value,
    );
  }
}

/// 图片模块内容
class ImageContent implements BlockContent {
  final String url;
  final String? alt;
  final String? caption;

  const ImageContent({
    this.url = '',
    this.alt,
    this.caption,
  });

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

/// 代码块内容
class CodeBlockContent implements BlockContent {
  final String language;
  final String code;

  const CodeBlockContent({
    this.language = 'python',
    this.code = '',
  });

  factory CodeBlockContent.fromJson(Map<String, dynamic> json) {
    return CodeBlockContent(
      language: json['language'] as String? ?? 'python',
      code: json['code'] as String? ?? '',
    );
  }

  @override
  Map<String, dynamic> toJson() => {
        'language': language,
        'code': code,
      };
}

/// 代码运行模块内容
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
      hints: (json['hints'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
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

/// 选择题选项
class ChoiceOption {
  final String id;
  final String text;

  const ChoiceOption({
    required this.id,
    required this.text,
  });

  factory ChoiceOption.fromJson(Map<String, dynamic> json) {
    return ChoiceOption(
      id: json['id'] as String,
      text: json['text'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'text': text};
}

/// 选择题内容
class MultipleChoiceContent implements BlockContent {
  final String question;
  final List<ChoiceOption> options;
  final String correctAnswer;
  final String? explanation;
  final bool multiSelect;

  const MultipleChoiceContent({
    this.question = '',
    this.options = const [],
    this.correctAnswer = '',
    this.explanation,
    this.multiSelect = false,
  });

  factory MultipleChoiceContent.fromJson(Map<String, dynamic> json) {
    return MultipleChoiceContent(
      question: json['question'] as String? ?? '',
      options: (json['options'] as List<dynamic>?)
              ?.map((e) => ChoiceOption.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      correctAnswer: json['correctAnswer'] as String? ?? '',
      explanation: json['explanation'] as String?,
      multiSelect: json['multiSelect'] as bool? ?? false,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'question': question,
      'options': options.map((o) => o.toJson()).toList(),
      'correctAnswer': correctAnswer,
      'multiSelect': multiSelect,
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }
}

/// 填空题内容
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

/// 连线题选项
class MatchingItem {
  final String id;
  final String text;

  const MatchingItem({
    required this.id,
    required this.text,
  });

  factory MatchingItem.fromJson(Map<String, dynamic> json) {
    return MatchingItem(
      id: json['id'] as String,
      text: json['text'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'text': text};

  MatchingItem copyWith({String? id, String? text}) {
    return MatchingItem(
      id: id ?? this.id,
      text: text ?? this.text,
    );
  }
}

/// 连线题配对关系
class MatchingPair {
  final String leftId;
  final String rightId;

  const MatchingPair({
    required this.leftId,
    required this.rightId,
  });

  factory MatchingPair.fromJson(Map<String, dynamic> json) {
    return MatchingPair(
      leftId: json['leftId'] as String,
      rightId: json['rightId'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'leftId': leftId, 'rightId': rightId};
}

/// 连线题内容
class MatchingContent implements BlockContent {
  final String question;
  final List<MatchingItem> leftItems;
  final List<MatchingItem> rightItems;
  final List<MatchingPair> correctPairs;
  final String? explanation;

  const MatchingContent({
    this.question = '',
    this.leftItems = const [],
    this.rightItems = const [],
    this.correctPairs = const [],
    this.explanation,
  });

  factory MatchingContent.fromJson(Map<String, dynamic> json) {
    return MatchingContent(
      question: json['question'] as String? ?? '',
      leftItems: (json['leftItems'] as List<dynamic>?)
              ?.map((e) => MatchingItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      rightItems: (json['rightItems'] as List<dynamic>?)
              ?.map((e) => MatchingItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      correctPairs: (json['correctPairs'] as List<dynamic>?)
              ?.map((e) => MatchingPair.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
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
    };
    if (explanation != null) map['explanation'] = explanation;
    return map;
  }

  MatchingContent copyWith({
    String? question,
    List<MatchingItem>? leftItems,
    List<MatchingItem>? rightItems,
    List<MatchingPair>? correctPairs,
    String? explanation,
  }) {
    return MatchingContent(
      question: question ?? this.question,
      leftItems: leftItems ?? this.leftItems,
      rightItems: rightItems ?? this.rightItems,
      correctPairs: correctPairs ?? this.correctPairs,
      explanation: explanation ?? this.explanation,
    );
  }
}

/// 视频内容
class VideoContent implements BlockContent {
  final String url;
  final String? title;

  const VideoContent({
    this.url = '',
    this.title,
  });

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

/// Block 模块 - 课程内容的基本单元
class Block {
  final String id;
  final BlockType type;
  final BlockPosition position;
  final BlockStyle style;
  final BlockContent content;

  const Block({
    required this.id,
    required this.type,
    required this.position,
    required this.style,
    required this.content,
  });

  /// 创建默认 Block
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
        case BlockType.multipleChoice:
          return MultipleChoiceContent(
          question: 'Enter a question',
          options: [
            const ChoiceOption(id: 'a', text: 'Option A'),
            const ChoiceOption(id: 'b', text: 'Option B'),
            const ChoiceOption(id: 'c', text: 'Option C'),
          ],
          correctAnswer: 'a',
        );
        case BlockType.fillBlank:
        return const FillBlankContent(question: 'Enter a fill-in-the-blank question');
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
          json['position'] as Map<String, dynamic>? ?? {}),
      style: BlockStyle.fromJson(json['style'] as Map<String, dynamic>? ?? {}),
      content:
          BlockContent.fromJson(type, json['content'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type.value,
        'id': id,
        'position': position.toJson(),
        'style': style.toJson(),
        'content': content.toJson(),
      };

  Block copyWith({
    String? id,
    BlockType? type,
    BlockPosition? position,
    BlockStyle? style,
    BlockContent? content,
  }) {
    return Block(
      id: id ?? this.id,
      type: type ?? this.type,
      position: position ?? this.position,
      style: style ?? this.style,
      content: content ?? this.content,
    );
  }
}
