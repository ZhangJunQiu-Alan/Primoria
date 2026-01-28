/// Block 类型枚举
/// 对应 PRD 3.2 基础模块类型

enum BlockType {
  text('text', '文本', 'Aa'),
  image('image', '图片', '🖼'),
  codeBlock('code-block', '代码块', '</>'),
  codePlayground('code-playground', '代码运行', '▶'),
  multipleChoice('multiple-choice', '选择题', '✓'),
  fillBlank('fill-blank', '填空题', '___'),
  video('video', '视频', '🎬');

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
