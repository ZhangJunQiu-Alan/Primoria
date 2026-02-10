import 'package:flutter/material.dart';
import '../models/block_type.dart';
import '../models/block.dart';

/// Block registry - manage module type metadata
class BlockRegistry {
  BlockRegistry._();

  /// Get all available module types
  static List<BlockTypeInfo> get allTypes => [
        BlockTypeInfo(
          type: BlockType.text,
          name: 'Text',
          description: 'Rich text / Markdown',
          icon: Icons.text_fields,
          priority: 0,
        ),
        BlockTypeInfo(
          type: BlockType.image,
          name: 'Image',
          description: 'Image block',
          icon: Icons.image,
          priority: 1,
        ),
        BlockTypeInfo(
          type: BlockType.codeBlock,
          name: 'Code Block',
          description: 'Code snippet + syntax highlighting',
          icon: Icons.code,
          priority: 2,
        ),
        BlockTypeInfo(
          type: BlockType.codePlayground,
          name: 'Code Playground',
          description: 'Runnable code editor',
          icon: Icons.play_circle_outline,
          priority: 3,
        ),
        BlockTypeInfo(
          type: BlockType.multipleChoice,
          name: 'Multiple Choice',
          description: 'Single / multi-select question',
          icon: Icons.check_circle_outline,
          priority: 4,
        ),
        BlockTypeInfo(
          type: BlockType.fillBlank,
          name: 'Fill in the Blank',
          description: 'Fill-in-the-blank exercise',
          icon: Icons.edit_note,
          priority: 5,
        ),
        BlockTypeInfo(
          type: BlockType.trueFalse,
          name: 'True/False',
          description: 'True or false question',
          icon: Icons.toggle_on_outlined,
          priority: 6,
        ),
        BlockTypeInfo(
          type: BlockType.matching,
          name: 'Matching',
          description: 'Match items between two columns',
          icon: Icons.compare_arrows,
          priority: 7,
        ),
        BlockTypeInfo(
          type: BlockType.video,
          name: 'Video',
          description: 'Embedded video',
          icon: Icons.videocam,
          priority: 8,
        ),
      ];

  /// Get MVP priority modules (P0 + P1)
  static List<BlockTypeInfo> get mvpTypes => allTypes
      .where((t) =>
          t.type == BlockType.text ||
          t.type == BlockType.image ||
          t.type == BlockType.codeBlock ||
          t.type == BlockType.codePlayground ||
          t.type == BlockType.multipleChoice ||
          t.type == BlockType.trueFalse ||
          t.type == BlockType.matching)
      .toList();

  /// Get info by type
  static BlockTypeInfo? getInfo(BlockType type) {
    try {
      return allTypes.firstWhere((t) => t.type == type);
    } catch (_) {
      return null;
    }
  }

  /// Create default block for a type
  static Block createBlock(BlockType type, {int order = 0}) {
    return Block.create(type, order: order);
  }
}

/// Block type info
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
