/// Code execution service (placeholder)
/// Wire up a real Python execution backend later
class CodeRunner {
  CodeRunner._();
  static final CodeRunner _instance = CodeRunner._();
  static CodeRunner get instance => _instance;

  /// Run code (placeholder)
  Future<CodeRunResult> runCode(String code, {String language = 'python'}) async {
    // Simulate execution delay
    await Future.delayed(const Duration(milliseconds: 500));

    // Simple print output simulation
    final printPattern = RegExp(r'print\s*\(\s*["\x27](.+?)["\x27]\s*\)');
    final matches = printPattern.allMatches(code);

    if (matches.isEmpty) {
      // If no simple print, try to simulate f-string
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
        output: '(no output)',
      );
    }

    final outputs = matches.map((m) => m.group(1) ?? '').toList();
    return CodeRunResult(
      success: true,
      output: outputs.join('\n'),
    );
  }
}

/// Code execution result
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
