import 'package:flutter/material.dart';
import '../models/block_type.dart';
import '../models/block.dart';

/// Block 注册表 - 管理模块类型元数据
class BlockRegistry {
  BlockRegistry._();

  /// 获取所有可用模块类型
  static List<BlockTypeInfo> get allTypes => [
        BlockTypeInfo(
          type: BlockType.text,
          name: '文本',
          description: '富文本/Markdown 内容',
          icon: Icons.text_fields,
          priority: 0,
        ),
        BlockTypeInfo(
          type: BlockType.image,
          name: '图片',
          description: '图片展示',
          icon: Icons.image,
          priority: 1,
        ),
        BlockTypeInfo(
          type: BlockType.codeBlock,
          name: '代码块',
          description: '代码展示 + 语法高亮',
          icon: Icons.code,
          priority: 2,
        ),
        BlockTypeInfo(
          type: BlockType.codePlayground,
          name: '代码运行',
          description: '可运行的代码编辑器',
          icon: Icons.play_circle_outline,
          priority: 3,
        ),
        BlockTypeInfo(
          type: BlockType.multipleChoice,
          name: '选择题',
          description: '单选/多选题',
          icon: Icons.check_circle_outline,
          priority: 4,
        ),
        BlockTypeInfo(
          type: BlockType.fillBlank,
          name: '填空题',
          description: '填空练习',
          icon: Icons.edit_note,
          priority: 5,
        ),
        BlockTypeInfo(
          type: BlockType.video,
          name: '视频',
          description: '视频嵌入',
          icon: Icons.videocam,
          priority: 6,
        ),
      ];

  /// 获取 MVP 优先模块（P0 + P1）
  static List<BlockTypeInfo> get mvpTypes => allTypes
      .where((t) =>
          t.type == BlockType.text ||
          t.type == BlockType.image ||
          t.type == BlockType.codeBlock ||
          t.type == BlockType.codePlayground ||
          t.type == BlockType.multipleChoice)
      .toList();

  /// 根据类型获取信息
  static BlockTypeInfo? getInfo(BlockType type) {
    try {
      return allTypes.firstWhere((t) => t.type == type);
    } catch (_) {
      return null;
    }
  }

  /// 创建指定类型的默认 Block
  static Block createBlock(BlockType type, {int order = 0}) {
    return Block.create(type, order: order);
  }
}

/// Block 类型信息
class BlockTypeInfo {
  final BlockType type;
  final String name;
  final String description;
  final IconData icon;
  final int priority;

  const BlockTypeInfo({
    required this.type,
    required this.name,
    required this.description,
    required this.icon,
    required this.priority,
  });
}
