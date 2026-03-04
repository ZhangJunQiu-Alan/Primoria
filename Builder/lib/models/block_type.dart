/// Block type enum
/// Matches PRD 3.2 basic module types
library;

enum BlockType {
  text('text', 'Text', 'Aa'),
  image('image', 'Image', '🖼'),
  codeBlock('code-block', 'Code Block', '</>'),
  codePlayground('code-playground', 'Code Playground', '▶'),
  codeExecution('code-execution', 'Code Execution', '▶▷'),
  functionFlow('function-flow', 'Function Flow', 'ƒ→'),
  multipleChoice('multiple-choice', 'Multiple Choice', '✓'),
  fillBlank('fill-blank', 'Fill in the Blank', '___'),
  trueFalse('true-false', 'True/False', 'T/F'),
  matching('matching', 'Matching', '⟷'),
  animation('animation', 'Animation', '◌'),
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
