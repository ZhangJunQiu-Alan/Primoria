import 'block.dart';
import '../services/id_generator.dart';

/// 课程页面模型
class CoursePage {
  final String pageId;
  final String title;
  final List<Block> blocks;

  const CoursePage({
    required this.pageId,
    required this.title,
    required this.blocks,
  });

  /// 创建默认空页面
  factory CoursePage.create({String title = '新页面'}) {
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

  /// 添加 Block
  CoursePage addBlock(Block block) {
    final updatedBlocks = [...blocks, block];
    return copyWith(blocks: updatedBlocks);
  }

  /// 删除 Block
  CoursePage removeBlock(String blockId) {
    final updatedBlocks = blocks.where((b) => b.id != blockId).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// 更新 Block
  CoursePage updateBlock(Block updatedBlock) {
    final updatedBlocks = blocks.map((b) {
      if (b.id == updatedBlock.id) return updatedBlock;
      return b;
    }).toList();
    return copyWith(blocks: updatedBlocks);
  }

  /// 重排 Block 顺序
  CoursePage reorderBlocks(int oldIndex, int newIndex) {
    final updatedBlocks = [...blocks];
    final block = updatedBlocks.removeAt(oldIndex);
    updatedBlocks.insert(newIndex, block);

    // 更新所有 block 的 order
    final reorderedBlocks = updatedBlocks.asMap().entries.map((entry) {
      return entry.value.copyWith(
        position: entry.value.position.copyWith(order: entry.key),
      );
    }).toList();

    return copyWith(blocks: reorderedBlocks);
  }
}
