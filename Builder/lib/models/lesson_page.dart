import 'block.dart';
import '../services/id_generator.dart';

/// A single page within a lesson — holds an ordered list of blocks.
class LessonPage {
  final String pageId;
  final int order;
  final List<Block> blocks;

  const LessonPage({
    required this.pageId,
    required this.order,
    required this.blocks,
  });

  factory LessonPage.create({int order = 0}) {
    return LessonPage(
      pageId: IdGenerator.pageId(),
      order: order,
      blocks: [],
    );
  }

  factory LessonPage.fromJson(Map<String, dynamic> json) {
    return LessonPage(
      pageId: (json['page_id'] ?? json['pageId']) as String? ?? IdGenerator.pageId(),
      order: json['order'] as int? ?? 0,
      blocks: (json['blocks'] as List<dynamic>?)
              ?.map((e) => Block.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'page_id': pageId,
        'order': order,
        'blocks': blocks.map((b) => b.toJson()).toList(),
      };

  LessonPage copyWith({String? pageId, int? order, List<Block>? blocks}) {
    return LessonPage(
      pageId: pageId ?? this.pageId,
      order: order ?? this.order,
      blocks: blocks ?? this.blocks,
    );
  }

  LessonPage addBlock(Block block) => copyWith(blocks: [...blocks, block]);

  LessonPage removeBlock(String blockId) =>
      copyWith(blocks: blocks.where((b) => b.id != blockId).toList());

  LessonPage updateBlock(Block updated) => copyWith(
        blocks: blocks.map((b) => b.id == updated.id ? updated : b).toList(),
      );

  LessonPage reorderBlocks(int oldIndex, int newIndex) {
    final list = [...blocks];
    final block = list.removeAt(oldIndex);
    list.insert(newIndex, block);
    final reordered = list.asMap().entries.map((e) {
      return e.value.copyWith(
        position: e.value.position.copyWith(order: e.key),
      );
    }).toList();
    return copyWith(blocks: reordered);
  }
}
