/// Block type enum
/// Matches PRD 3.2 basic module types
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

  /// Parse from JSON value
  static BlockType fromValue(String value) {
    return BlockType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => BlockType.text,
    );
  }
}
