import 'package:uuid/uuid.dart';

/// ID 生成工具
class IdGenerator {
  static const _uuid = Uuid();

  /// 生成唯一 Block ID
  static String blockId() => 'block-${_uuid.v4()}';

  /// 生成唯一 Page ID
  static String pageId() => 'page-${_uuid.v4()}';

  /// 生成唯一 Course ID
  static String courseId() => 'course-${_uuid.v4()}';

  /// 生成通用唯一 ID
  static String generate() => _uuid.v4();
}
