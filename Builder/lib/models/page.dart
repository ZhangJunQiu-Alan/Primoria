import 'block.dart';
import '../services/id_generator.dart';

/// Course page model
class CoursePage {
  final String pageId;
  final String title;
  final List<Block> blocks;

  const CoursePage({
    required this.pageId,
    required this.title,
    required this.blocks,
  });

  /// Create default empty page
  factory CoursePage.create({String title = 'New Page'}) {
    return CoursePage(
      pageId: IdGenerator.pageId(),
      title: title,
      blocks: [],
    );
  }

  factory CoursePage.fromJson(Map<String, dynamic> json) {
    return CoursePage(
      pageId: json['pageId'] as String,
      title: json['title'] as String? ?? '',
      blocks: (json['blocks'] as List<dynamic>?)
              ?.map((e) => Block.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'pageId': pageId,
        'title': title,
        'blocks': blocks.map((b) => b.toJson()).toList(),
      };

  CoursePage copyWith({
    String? pageId,
    String? title,
    List<Block>? blocks,
  }) {
    return CoursePage(
      pageId: pageId ?? this.pageId,
      title: title ?? this.title,
      blocks: blocks ?? this.blocks,
    );
  }

  /// Add block
  CoursePage addBlock(Block block) {
    final updatedBlocks = [...blocks, block];
    return copyWith(blocks: updatedBlocks);
  }

  /// Remove block
  CoursePage removeBlock(String blockId) {
    final updatedBlocks = blocks.where((b) => b.id != blockId).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// Update block
  CoursePage updateBlock(Block updatedBlock) {
    final updatedBlocks = blocks.map((b) {
      if (b.id == updatedBlock.id) return updatedBlock;
      return b;
    }).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// Reorder blocks
  CoursePage reorderBlocks(int oldIndex, int newIndex) {
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
