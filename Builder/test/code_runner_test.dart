import 'package:builder/services/code_runner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CodeRunner', () {
    test('supports python-like print(type/int/round) output', () async {
      const code = '''
print(type(5))
print(type(3.0))
print(int(3.9))
print(round(3.9))
''';

      final result = await CodeRunner.instance.runCode(code);
      expect(result.success, isTrue);
      expect(result.output, "<class 'int'>\n<class 'float'>\n3\n4");
    });

    test('supports assignments and arithmetic expressions', () async {
      const code = '''
x = 10
y = 3
print(x + y)
print(x // y)
print(x / y)
print(x ** 2)
''';

      final result = await CodeRunner.instance.runCode(code);
      expect(result.success, isTrue);
      expect(result.output, '13\n3\n3.3333333333333335\n100.0');
    });

    test('returns no output when no print statements', () async {
      const code = '''
x = 1
y = x + 2
''';

      final result = await CodeRunner.instance.runCode(code);
      expect(result.success, isTrue);
      expect(result.output, '(no output)');
    });

    test('returns runtime error for unsupported function', () async {
      const code = 'print(len("abc"))';

      final result = await CodeRunner.instance.runCode(code);
      expect(result.success, isFalse);
      expect(result.error, contains('unsupported function'));
    });
  });
}
