/// Block 类型枚举
/// 对应 PRD 3.2 基础模块类型
library;

enum BlockType {
  text('text', 'Text', 'Aa'),
  image('image', 'Image', '🖼'),
  codeBlock('code-block', 'Code Block', '</>'),
  codePlayground('code-playground', 'Code Playground', '▶'),
  multipleChoice('multiple-choice', 'Multiple Choice', '✓'),
  fillBlank('fill-blank', 'Fill in the Blank', '___'),
  matching('matching', 'Matching', '⟷'),
  video('video', 'Video', '🎬');

  final String value;
  final String label;
  final String icon;

  const BlockType(this.value, this.label, this.icon);

  /// 从 JSON 值解析
  static BlockType fromValue(String value) {
    return BlockType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => BlockType.text,
    );
  }
}
