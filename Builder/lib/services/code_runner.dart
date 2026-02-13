import 'dart:math' as math;

class CodeRunner {
  CodeRunner._();
  static final CodeRunner _instance = CodeRunner._();
  static CodeRunner get instance => _instance;

  /// Run code.
  /// NOTE: This is still a local simulator, not a real Python interpreter.
  Future<CodeRunResult> runCode(
    String code, {
    String language = 'python',
  }) async {
    // Simulate execution delay
    await Future.delayed(const Duration(milliseconds: 500));

    if (language.toLowerCase() != 'python') {
      return _runStringLiteralPrintOnly(code);
    }

    return _runPythonLike(code);
  }

  CodeRunResult _runStringLiteralPrintOnly(String code) {
    final printPattern = RegExp(r'print\s*\(\s*["\x27](.+?)["\x27]\s*\)');
    final matches = printPattern.allMatches(code);

    if (matches.isEmpty) {
      return const CodeRunResult(success: true, output: '(no output)');
    }

    final outputs = matches.map((m) => m.group(1) ?? '').toList();
    return CodeRunResult(success: true, output: outputs.join('\n'));
  }

  CodeRunResult _runPythonLike(String code) {
    final outputs = <String>[];
    final variables = <String, dynamic>{};

    try {
      for (final rawLine in code.split('\n')) {
        final line = _stripInlineComment(rawLine).trim();
        if (line.isEmpty) continue;

        if (_isAssignmentLine(line)) {
          final splitIndex = line.indexOf('=');
          final name = line.substring(0, splitIndex).trim();
          final expr = line.substring(splitIndex + 1).trim();
          if (!_isValidIdentifier(name)) continue;

          final value = _evalExpression(expr, variables);
          variables[name] = value;
          continue;
        }

        final printMatch = RegExp(
          r'^print\s*\(([\s\S]*)\)\s*$',
        ).firstMatch(line);
        if (printMatch != null) {
          final argText = printMatch.group(1) ?? '';
          final argExpressions = _splitTopLevel(argText, ',');
          final values = argExpressions
              .where((arg) => arg.trim().isNotEmpty)
              .map((arg) => _evalExpression(arg.trim(), variables))
              .map(_formatPythonValue)
              .toList();
          outputs.add(values.join(' '));
        }
      }
    } catch (e) {
      return CodeRunResult(
        success: false,
        output: '',
        error: 'Runtime error: $e',
      );
    }

    return CodeRunResult(
      success: true,
      output: outputs.isEmpty ? '(no output)' : outputs.join('\n'),
    );
  }

  bool _isAssignmentLine(String line) {
    if (!line.contains('=')) return false;
    if (line.contains('==') ||
        line.contains('!=') ||
        line.contains('>=') ||
        line.contains('<=') ||
        line.startsWith('print(')) {
      return false;
    }

    final splitIndex = line.indexOf('=');
    if (splitIndex <= 0) return false;
    final name = line.substring(0, splitIndex).trim();
    return _isValidIdentifier(name);
  }

  bool _isValidIdentifier(String value) {
    final idPattern = RegExp(r'^[A-Za-z_][A-Za-z0-9_]*$');
    return idPattern.hasMatch(value);
  }

  String _stripInlineComment(String line) {
    final buffer = StringBuffer();
    bool inSingle = false;
    bool inDouble = false;
    bool escaped = false;

    for (int i = 0; i < line.length; i++) {
      final ch = line[i];
      if (escaped) {
        buffer.write(ch);
        escaped = false;
        continue;
      }
      if (ch == r'\') {
        buffer.write(ch);
        escaped = true;
        continue;
      }
      if (!inDouble && ch == "'") {
        inSingle = !inSingle;
        buffer.write(ch);
        continue;
      }
      if (!inSingle && ch == '"') {
        inDouble = !inDouble;
        buffer.write(ch);
        continue;
      }
      if (!inSingle && !inDouble && ch == '#') {
        break;
      }
      buffer.write(ch);
    }

    return buffer.toString();
  }

  dynamic _evalExpression(String expr, Map<String, dynamic> variables) {
    final input = expr.trim();
    if (input.isEmpty) {
      throw const FormatException('empty expression');
    }

    if (_isWrappedByBalancedParentheses(input)) {
      return _evalExpression(input.substring(1, input.length - 1), variables);
    }

    final stringLiteral = _tryParseString(input);
    if (stringLiteral != null) return stringLiteral;

    final number = _tryParseNumber(input);
    if (number != null) return number;

    if (input == 'True') return true;
    if (input == 'False') return false;

    if (_isValidIdentifier(input) && variables.containsKey(input)) {
      return variables[input];
    }

    final fnMatch = RegExp(
      r'^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$',
    ).firstMatch(input);
    if (fnMatch != null) {
      final fn = fnMatch.group(1)!;
      final rawArgs = fnMatch.group(2) ?? '';
      final args = _splitTopLevel(rawArgs, ',')
          .where((arg) => arg.trim().isNotEmpty)
          .map((arg) => _evalExpression(arg.trim(), variables))
          .toList();
      return _evalFunction(fn, args);
    }

    final addSub = _findTopLevelOperator(input, const ['+', '-']);
    if (addSub != null) {
      final left = _evalExpression(input.substring(0, addSub.index), variables);
      final right = _evalExpression(
        input.substring(addSub.index + addSub.operator.length),
        variables,
      );
      return _applyNumericOperator(left, right, addSub.operator);
    }

    final mulDiv = _findTopLevelOperator(input, const ['//', '*', '/', '%']);
    if (mulDiv != null) {
      final left = _evalExpression(input.substring(0, mulDiv.index), variables);
      final right = _evalExpression(
        input.substring(mulDiv.index + mulDiv.operator.length),
        variables,
      );
      return _applyNumericOperator(left, right, mulDiv.operator);
    }

    final power = _findTopLevelOperator(input, const [
      '**',
    ], rightAssociative: true);
    if (power != null) {
      final left = _evalExpression(input.substring(0, power.index), variables);
      final right = _evalExpression(
        input.substring(power.index + power.operator.length),
        variables,
      );
      return _applyNumericOperator(left, right, power.operator);
    }

    throw FormatException('unsupported expression: $input');
  }

  dynamic _evalFunction(String fn, List<dynamic> args) {
    switch (fn) {
      case 'type':
        if (args.length != 1) {
          throw FormatException(
            'type() expects 1 argument, got ${args.length}',
          );
        }
        final value = args.first;
        final typeName = switch (value) {
          int _ => 'int',
          double _ => 'float',
          bool _ => 'bool',
          String _ => 'str',
          _ => 'object',
        };
        return "<class '$typeName'>";
      case 'int':
        if (args.length != 1) {
          throw FormatException('int() expects 1 argument, got ${args.length}');
        }
        return _toNum(args.first).truncate();
      case 'float':
        if (args.length != 1) {
          throw FormatException(
            'float() expects 1 argument, got ${args.length}',
          );
        }
        return _toNum(args.first).toDouble();
      case 'round':
        if (args.length != 1) {
          throw FormatException(
            'round() expects 1 argument, got ${args.length}',
          );
        }
        return _toNum(args.first).round();
      case 'str':
        if (args.length != 1) {
          throw FormatException('str() expects 1 argument, got ${args.length}');
        }
        return _formatPythonValue(args.first);
      case 'bool':
        if (args.length != 1) {
          throw FormatException(
            'bool() expects 1 argument, got ${args.length}',
          );
        }
        final value = args.first;
        if (value is bool) return value;
        if (value is num) return value != 0;
        if (value is String) return value.isNotEmpty;
        return value != null;
      default:
        throw FormatException('unsupported function: $fn');
    }
  }

  dynamic _applyNumericOperator(dynamic left, dynamic right, String op) {
    final a = _toNum(left);
    final b = _toNum(right);

    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      case '//':
        return (a / b).floor();
      case '%':
        return a % b;
      case '**':
        return _powNum(a, b);
      default:
        throw FormatException('unsupported operator: $op');
    }
  }

  num _powNum(num base, num exponent) {
    if (exponent is int) {
      var result = 1.0;
      for (int i = 0; i < exponent.abs(); i++) {
        result *= base;
      }
      return exponent < 0 ? 1 / result : result;
    }
    // Fallback for non-integer exponents.
    return math.pow(base.toDouble(), exponent.toDouble());
  }

  num _toNum(dynamic value) {
    if (value is num) return value;
    if (value is String) {
      final parsed = num.tryParse(value.trim());
      if (parsed != null) return parsed;
    }
    throw FormatException('expected numeric value, got $value');
  }

  String _formatPythonValue(dynamic value) {
    if (value == null) return 'None';
    if (value is bool) return value ? 'True' : 'False';
    if (value is double) {
      if (value == value.truncateToDouble()) {
        return value.toStringAsFixed(1);
      }
      return value.toString();
    }
    return value.toString();
  }

  String? _tryParseString(String input) {
    if (input.length < 2) return null;
    final first = input[0];
    final last = input[input.length - 1];
    if (!((first == "'" && last == "'") || (first == '"' && last == '"'))) {
      return null;
    }
    return input.substring(1, input.length - 1);
  }

  num? _tryParseNumber(String input) {
    final intValue = int.tryParse(input);
    if (intValue != null) return intValue;
    return double.tryParse(input);
  }

  bool _isWrappedByBalancedParentheses(String input) {
    if (!input.startsWith('(') || !input.endsWith(')')) return false;

    int depth = 0;
    bool inSingle = false;
    bool inDouble = false;
    bool escaped = false;

    for (int i = 0; i < input.length; i++) {
      final ch = input[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch == r'\') {
        escaped = true;
        continue;
      }
      if (!inDouble && ch == "'") {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && ch == '"') {
        inDouble = !inDouble;
        continue;
      }
      if (inSingle || inDouble) continue;

      if (ch == '(') depth += 1;
      if (ch == ')') depth -= 1;
      if (depth == 0 && i != input.length - 1) return false;
    }
    return depth == 0;
  }

  List<String> _splitTopLevel(String input, String delimiter) {
    if (input.trim().isEmpty) return const [];
    final parts = <String>[];
    int start = 0;
    int depth = 0;
    bool inSingle = false;
    bool inDouble = false;
    bool escaped = false;

    for (int i = 0; i < input.length; i++) {
      final ch = input[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch == r'\') {
        escaped = true;
        continue;
      }
      if (!inDouble && ch == "'") {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && ch == '"') {
        inDouble = !inDouble;
        continue;
      }
      if (inSingle || inDouble) continue;

      if (ch == '(') {
        depth += 1;
      } else if (ch == ')') {
        depth -= 1;
      } else if (depth == 0 && input.substring(i).startsWith(delimiter)) {
        parts.add(input.substring(start, i).trim());
        start = i + delimiter.length;
        i += delimiter.length - 1;
      }
    }

    parts.add(input.substring(start).trim());
    return parts;
  }

  _TopLevelOperator? _findTopLevelOperator(
    String input,
    List<String> operators, {
    bool rightAssociative = false,
  }) {
    final sortedOperators = [...operators]
      ..sort((a, b) => b.length.compareTo(a.length));
    final candidates = <_TopLevelOperator>[];

    int depth = 0;
    bool inSingle = false;
    bool inDouble = false;
    bool escaped = false;

    for (int i = 0; i < input.length; i++) {
      final ch = input[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch == r'\') {
        escaped = true;
        continue;
      }
      if (!inDouble && ch == "'") {
        inSingle = !inSingle;
        continue;
      }
      if (!inSingle && ch == '"') {
        inDouble = !inDouble;
        continue;
      }
      if (inSingle || inDouble) continue;

      if (ch == '(') {
        depth += 1;
        continue;
      }
      if (ch == ')') {
        depth -= 1;
        continue;
      }
      if (depth != 0) continue;

      for (final op in sortedOperators) {
        if (i + op.length > input.length) continue;
        if (input.substring(i, i + op.length) != op) continue;

        if (op == '*' &&
            ((i > 0 && input[i - 1] == '*') ||
                (i + 1 < input.length && input[i + 1] == '*'))) {
          continue;
        }
        if (op == '/' &&
            ((i > 0 && input[i - 1] == '/') ||
                (i + 1 < input.length && input[i + 1] == '/'))) {
          continue;
        }
        if ((op == '+' || op == '-') && _isUnaryOperator(input, i)) {
          continue;
        }
        if (i == 0 || i + op.length >= input.length) continue;
        candidates.add(_TopLevelOperator(index: i, operator: op));
        i += op.length - 1;
        break;
      }
    }

    if (candidates.isEmpty) return null;
    return rightAssociative ? candidates.first : candidates.last;
  }

  bool _isUnaryOperator(String input, int index) {
    if (index == 0) return true;
    int i = index - 1;
    while (i >= 0 && input[i].trim().isEmpty) {
      i -= 1;
    }
    if (i < 0) return true;
    final prev = input[i];
    return prev == '(' ||
        prev == ',' ||
        prev == '+' ||
        prev == '-' ||
        prev == '*' ||
        prev == '/' ||
        prev == '%' ||
        prev == '=';
  }
}

class _TopLevelOperator {
  final int index;
  final String operator;

  const _TopLevelOperator({required this.index, required this.operator});
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
