import 'package:uuid/uuid.dart';

/// ID generator
class IdGenerator {
  static const _uuid = Uuid();

  /// Generate unique block ID
  static String blockId() => 'block-${_uuid.v4()}';

  /// Generate unique page ID
  static String pageId() => 'page-${_uuid.v4()}';

  /// Generate unique course ID
  static String courseId() => 'course-${_uuid.v4()}';

  /// Generate generic unique ID
  static String generate() => _uuid.v4();
}
