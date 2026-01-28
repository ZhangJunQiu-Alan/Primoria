import 'dart:convert';
import '../models/course.dart';
import 'course_export_platform.dart'
    if (dart.library.html) 'course_export_web.dart';

/// 课程导出服务
class CourseExport {
  CourseExport._();

  /// 导出课程为 JSON 字符串
  static String exportToJson(Course course) {
    final jsonMap = course.toJson();
    return const JsonEncoder.withIndent('  ').convert(jsonMap);
  }

  /// 验证课程是否可导出
  static ExportValidationResult validateForExport(Course course) {
    final errors = <String>[];

    // 检查课程标题
    if (course.metadata.title.isEmpty) {
      errors.add('课程标题不能为空');
    }

    // 检查页面
    if (course.pages.isEmpty) {
      errors.add('课程至少需要一个页面');
    }

    // 检查每个页面
    for (int i = 0; i < course.pages.length; i++) {
      final page = course.pages[i];
      if (page.title.isEmpty) {
        errors.add('第 ${i + 1} 页标题不能为空');
      }
    }

    return ExportValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
    );
  }

  /// 下载 JSON 文件（Web 环境）
  static void downloadJson(Course course) {
    final validation = validateForExport(course);
    if (!validation.isValid) {
      throw ExportException(validation.errors.join('\n'));
    }

    final jsonString = exportToJson(course);
    final fileName = _generateFileName(course.metadata.title);
    downloadJsonFile(jsonString, fileName);
  }

  /// 生成文件名
  static String _generateFileName(String title) {
    // 清理文件名中的非法字符
    final cleanTitle = title
        .replaceAll(RegExp(r'[<>:"/\\|?*]'), '')
        .replaceAll(RegExp(r'\s+'), '_')
        .toLowerCase();

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return '${cleanTitle}_$timestamp.json';
  }
}

/// 导出验证结果
class ExportValidationResult {
  final bool isValid;
  final List<String> errors;

  const ExportValidationResult({
    required this.isValid,
    required this.errors,
  });
}

/// 导出异常
class ExportException implements Exception {
  final String message;
  const ExportException(this.message);

  @override
  String toString() => 'ExportException: $message';
}
