import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../models/course.dart';
import 'file_picker.dart' as fp;

/// AI course generation service (Gemini API)
class AICourseGenerator {
  AICourseGenerator._();

  // Gemini API configuration
  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta';
  static String? _apiKey;

  /// Set API key
  static void setApiKey(String key) {
    _apiKey = key;
  }

  /// Get current API key
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
2. multipleChoice: {"type":"multipleChoice","id":"q1","position":{"order":1},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Question","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation"}}
3. codePlayground: {"type":"codePlayground","id":"c1","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","initialCode":"Code","expectedOutput":"Output","hints":["Hint"],"runnable":true}}

Rules:
- 3-5 blocks per page
- 3-5 pages total
- Every id must be unique
- Ensure valid JSON (double quotes for all strings)
- Use \\n for newlines in text

Generate the course based on the PDF:
''';

  /// Generate course from PDF
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
      // 1. Prepare file data (use inline data for reliability)
      final base64Data = base64Encode(pdfBytes);

      // 2. Call Gemini to generate the course
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

      // 3. Parse JSON into Course object
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
      return GenerationResult(success: false, message: 'Generation error: $e');
    }
  }

  /// Call Gemini to generate content
  static Future<_ContentResult> _generateContent({
    String? fileUri,
    String? inlineData,
    required String mimeType,
    required String prompt,
  }) async {
    try {
      final url =
          '$_baseUrl/models/gemini-2.0-flash:generateContent?key=$_apiKey';

      // Build request body
      Map<String, dynamic> filePart;
      if (fileUri != null) {
        filePart = {
          'fileData': {'mimeType': mimeType, 'fileUri': fileUri},
        };
      } else if (inlineData != null) {
        filePart = {
          'inlineData': {'mimeType': mimeType, 'data': inlineData},
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
            ],
          },
        ],
        'generationConfig': {
          'temperature': 0.7,
          'maxOutputTokens': 65536,
          'responseMimeType': 'application/json',
        },
      };

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final content =
            data['candidates'][0]['content']['parts'][0]['text'] as String;
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

  /// Extract JSON from response
  static String _extractJson(String content) {
    var result = content.trim();

    // Try to extract ```json ... ``` code block
    final jsonBlockRegex = RegExp(r'```json\s*([\s\S]*?)\s*```');
    final match = jsonBlockRegex.firstMatch(result);
    if (match != null) {
      result = match.group(1)!.trim();
    } else {
      // Try to extract ``` ... ``` code block
      final codeBlockRegex = RegExp(r'```\s*([\s\S]*?)\s*```');
      final codeMatch = codeBlockRegex.firstMatch(result);
      if (codeMatch != null) {
        result = codeMatch.group(1)!.trim();
      }
    }

    // Find the first { and last }
    final firstBrace = result.indexOf('{');
    final lastBrace = result.lastIndexOf('}');
    if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
      result = result.substring(firstBrace, lastBrace + 1);
    }

    // Clean up potential problematic characters
    result = result
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
        .replaceAll('\uFF0C', ',') // fullwidth comma
        .replaceAll('\uFF1A', ':') // fullwidth colon
        .replaceAll('\u201C', '"') // left double quote
        .replaceAll('\u201D', '"') // right double quote
        .replaceAll('\u2018', "'") // left single quote
        .replaceAll('\u2019', "'"); // right single quote

    return result;
  }

  /// Pick and read PDF file
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

/// Generation result
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

/// PDF pick result
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

/// Content generation result (internal)
class _ContentResult {
  final bool success;
  final String? content;
  final String? message;

  const _ContentResult({required this.success, this.content, this.message});
}
