import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../models/course.dart';
import 'file_picker.dart' as fp;

/// AI course generation service (Gemini API)
class AICourseGenerator {
  AICourseGenerator._();

  // Gemini API 配置
  static const String _baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  static String? _apiKey;

  /// 设置 API Key
  static void setApiKey(String key) {
    _apiKey = key;
  }

  /// 获取当前 API Key
  static String? get apiKey => _apiKey;

  /// Prompt template
  static const String _courseGenerationPrompt = '''
You are a course designer. Generate an interactive course in JSON format based on the PDF content.

Important: Output JSON only. Do not include any other text or code fences.

JSON schema:
{
  "courseId": "course-xxx",
  "metadata": {
    "title": "Course title",
    "description": "Short description",
    "author": {"userId": "ai", "displayName": "AI"},
    "tags": ["tag"],
    "difficulty": "beginner",
    "estimatedMinutes": 30
  },
  "pages": [
    {
      "pageId": "p1",
      "title": "Page title",
      "blocks": [...]
    }
  ]
}

Block types:
1. text: {"type":"text","id":"t1","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"content":{"format":"markdown","value":"Text"}}
2. multipleChoice: {"type":"multipleChoice","id":"q1","position":{"order":1},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Question","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correctAnswer":"a","explanation":"Explanation"}}
3. codePlayground: {"type":"codePlayground","id":"c1","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","initialCode":"Code","expectedOutput":"Output","hints":["Hint"],"runnable":true}}

Rules:
- 3-5 blocks per page
- 3-5 pages total
- Every id must be unique
- Ensure valid JSON (double quotes for all strings)
- Use \\n for newlines in text

Generate the course based on the PDF:
''';

  /// 从 PDF 文件生成课程
  static Future<GenerationResult> generateFromPdf({
    required Uint8List pdfBytes,
    required String fileName,
    String? customPrompt,
  }) async {
    if (_apiKey == null || _apiKey!.isEmpty) {
      return const GenerationResult(
        success: false,
        message: 'Please set your Gemini API key first',
      );
    }

    try {
      // 1. 准备文件数据（直接使用 inline data，更可靠）
      final base64Data = base64Encode(pdfBytes);

      // 2. 调用 Gemini 生成课程
      final prompt = customPrompt ?? _courseGenerationPrompt;
      final jsonResult = await _generateContent(
        inlineData: base64Data,
        mimeType: 'application/pdf',
        prompt: prompt,
      );

      if (!jsonResult.success) {
        return GenerationResult(
          success: false,
          message: 'Generation failed: ${jsonResult.message}',
        );
      }

      // 3. 解析 JSON 为 Course 对象
      try {
        final jsonString = _extractJson(jsonResult.content!);
        final jsonMap = jsonDecode(jsonString) as Map<String, dynamic>;
        final course = Course.fromJson(jsonMap);

        return GenerationResult(
          success: true,
          message: 'Course generated',
          course: course,
          rawJson: jsonString,
        );
      } catch (e) {
        return GenerationResult(
          success: false,
          message: 'Failed to parse course JSON: $e',
          rawJson: jsonResult.content,
        );
      }
    } catch (e) {
      return GenerationResult(
        success: false,
        message: 'Generation error: $e',
      );
    }
  }

  /// 调用 Gemini 生成内容
  static Future<_ContentResult> _generateContent({
    String? fileUri,
    String? inlineData,
    required String mimeType,
    required String prompt,
  }) async {
    try {
      final url = '$_baseUrl/models/gemini-2.0-flash:generateContent?key=$_apiKey';

      // 构建请求体
      Map<String, dynamic> filePart;
      if (fileUri != null) {
        filePart = {
          'fileData': {
            'mimeType': mimeType,
            'fileUri': fileUri,
          }
        };
      } else if (inlineData != null) {
        filePart = {
          'inlineData': {
            'mimeType': mimeType,
            'data': inlineData,
          }
        };
      } else {
        return const _ContentResult(
          success: false,
          message: 'No valid file data',
        );
      }

      final requestBody = {
        'contents': [
          {
            'parts': [
              filePart,
              {'text': prompt},
            ]
          }
        ],
        'generationConfig': {
          'temperature': 0.7,
          'maxOutputTokens': 65536,
          'responseMimeType': 'application/json',
        }
      };

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content = data['candidates'][0]['content']['parts'][0]['text'] as String;
        return _ContentResult(success: true, content: content);
      } else {
        final error = jsonDecode(response.body);
        return _ContentResult(
          success: false,
          message: error['error']?['message'] ?? 'Unknown error',
        );
      }
    } catch (e) {
      return _ContentResult(success: false, message: e.toString());
    }
  }

  /// 从响应中提取 JSON
  static String _extractJson(String content) {
    var result = content.trim();

    // 尝试提取 ```json ... ``` 代码块
    final jsonBlockRegex = RegExp(r'```json\s*([\s\S]*?)\s*```');
    final match = jsonBlockRegex.firstMatch(result);
    if (match != null) {
      result = match.group(1)!.trim();
    } else {
      // 尝试提取 ``` ... ``` 代码块
      final codeBlockRegex = RegExp(r'```\s*([\s\S]*?)\s*```');
      final codeMatch = codeBlockRegex.firstMatch(result);
      if (codeMatch != null) {
        result = codeMatch.group(1)!.trim();
      }
    }

    // 找到第一个 { 和最后一个 }
    final firstBrace = result.indexOf('{');
    final lastBrace = result.lastIndexOf('}');
    if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
      result = result.substring(firstBrace, lastBrace + 1);
    }

    // 清理可能的问题字符
    result = result
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
        .replaceAll('，', ',')  // 中文逗号
        .replaceAll('：', ':')  // 中文冒号
        .replaceAll('"', '"')  // 中文引号
        .replaceAll('"', '"')  // 中文引号
        .replaceAll(''', "'")  // 中文单引号
        .replaceAll(''', "'"); // 中文单引号

    return result;
  }

  /// 选择并读取 PDF 文件
  static Future<PdfPickResult> pickPdfFile() async {
    final result = await fp.pickPdfFile();

    return PdfPickResult(
      success: result.success,
      message: result.message,
      bytes: result.bytes,
      fileName: result.fileName,
    );
  }
}

/// 生成结果
class GenerationResult {
  final bool success;
  final String message;
  final Course? course;
  final String? rawJson;

  const GenerationResult({
    required this.success,
    required this.message,
    this.course,
    this.rawJson,
  });
}

/// PDF 选择结果
class PdfPickResult {
  final bool success;
  final String message;
  final Uint8List? bytes;
  final String? fileName;

  const PdfPickResult({
    required this.success,
    required this.message,
    this.bytes,
    this.fileName,
  });
}

/// 内容生成结果（内部使用）
class _ContentResult {
  final bool success;
  final String? content;
  final String? message;

  const _ContentResult({
    required this.success,
    this.content,
    this.message,
  });
}
