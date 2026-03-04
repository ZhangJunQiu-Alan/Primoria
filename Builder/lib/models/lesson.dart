import 'block.dart';
import '../services/id_generator.dart';

/// Course lesson model
class CourseLesson {
  final String lessonId;
  final String title;
  final List<Block> blocks;

  const CourseLesson({
    required this.lessonId,
    required this.title,
    required this.blocks,
  });

  /// Create default empty lesson
  factory CourseLesson.create({String title = 'New Lesson'}) {
    return CourseLesson(
      lessonId: IdGenerator.lessonId(),
      title: title,
      blocks: [],
    );
  }

  factory CourseLesson.fromJson(Map<String, dynamic> json) {
    return CourseLesson(
      // backward compat: accept legacy 'pageId' key
      lessonId: (json['lessonId'] ?? json['pageId']) as String,
      title: json['title'] as String? ?? '',
      blocks: (json['blocks'] as List<dynamic>?)
              ?.map((e) => Block.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'lessonId': lessonId,
        'title': title,
        'blocks': blocks.map((b) => b.toJson()).toList(),
      };

  CourseLesson copyWith({
    String? lessonId,
    String? title,
    List<Block>? blocks,
  }) {
    return CourseLesson(
      lessonId: lessonId ?? this.lessonId,
      title: title ?? this.title,
      blocks: blocks ?? this.blocks,
    );
  }

  /// Add block
  CourseLesson addBlock(Block block) {
    final updatedBlocks = [...blocks, block];
    return copyWith(blocks: updatedBlocks);
  }

  /// Remove block
  CourseLesson removeBlock(String blockId) {
    final updatedBlocks = blocks.where((b) => b.id != blockId).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// Update block
  CourseLesson updateBlock(Block updatedBlock) {
    final updatedBlocks = blocks.map((b) {
      if (b.id == updatedBlock.id) return updatedBlock;
      return b;
    }).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// Reorder blocks
  CourseLesson reorderBlocks(int oldIndex, int newIndex) {
    final updatedBlocks = [...blocks];
    final block = updatedBlocks.removeAt(oldIndex);
    updatedBlocks.insert(newIndex, block);

    // Update order for all blocks
    final reorderedBlocks = updatedBlocks.asMap().entries.map((entry) {
      return entry.value.copyWith(
        position: entry.value.position.copyWith(order: entry.key),
      );
    }).toList();

    return copyWith(blocks: reorderedBlocks);
  }
}
