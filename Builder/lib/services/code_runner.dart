/// 代码执行服务（占位实现）
/// 后续接入真实的 Python 执行后端
class CodeRunner {
  CodeRunner._();
  static final CodeRunner _instance = CodeRunner._();
  static CodeRunner get instance => _instance;

  /// 运行代码（占位实现）
  Future<CodeRunResult> runCode(String code, {String language = 'python'}) async {
    // 模拟执行延迟
    await Future.delayed(const Duration(milliseconds: 500));

    // 简单模拟 print 输出
    final printPattern = RegExp(r'print\s*\(\s*["\x27](.+?)["\x27]\s*\)');
    final matches = printPattern.allMatches(code);

    if (matches.isEmpty) {
      // 如果没有简单 print，尝试模拟 f-string
      final fStringPattern = RegExp(r'print\s*\(\s*f["\x27](.+?)["\x27]\s*\)');
      final fMatches = fStringPattern.allMatches(code);
      if (fMatches.isNotEmpty) {
        final outputs = fMatches.map((m) => m.group(1) ?? '').toList();
        return CodeRunResult(
          success: true,
          output: outputs.join('\n'),
        );
      }

      return const CodeRunResult(
        success: true,
        output: '(无输出)',
      );
    }

    final outputs = matches.map((m) => m.group(1) ?? '').toList();
    return CodeRunResult(
      success: true,
      output: outputs.join('\n'),
    );
  }
}

/// 代码执行结果
class CodeRunResult {
  final bool success;
  final String output;
  final String? error;

  const CodeRunResult({
    required this.success,
    required this.output,
    this.error,
  });
}
