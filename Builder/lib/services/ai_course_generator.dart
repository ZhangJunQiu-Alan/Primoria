import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';
import 'course_import.dart';
import 'course_schema_validator.dart';
import 'file_picker.dart' as fp;

/// AI course generation service (Gemini API)
class AICourseGenerator {
  AICourseGenerator._();

  // Gemini API configuration
  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta';
  static const List<String> _modelCandidates = [
    'gemini-2.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro',
    'gemini-3-pro-preview',
  ];
  static const int _maxOutputTokens = 16384;
  static const int _maxBlocksPerPage = 20;
  static const String _promptVersion = '2026-02-13.ai-course-v1';
  static String? _apiKey;

  /// Set API key
  static void setApiKey(String key) {
    _apiKey = key;
  }

  /// Get current API key
  static String? get apiKey => _apiKey;
  static String get promptVersion => _promptVersion;

  /// Prompt template
  static const String _courseGenerationPrompt = '''
You are an expert instructional designer. Create a Primoria course JSON from the uploaded PDF.

Return JSON only. Do not output markdown/code fences/explanations.
All strings must use double quotes.

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

Hard constraints:
- Put all generated blocks into exactly ONE page.
- Total block count must be <= 20.
- Prefer 10-20 blocks when content is sufficient; for short PDFs 6-12 is acceptable.
- Every id must be unique.
- position.order must be continuous from 0.
- Use \\n for newlines in text.
- Keep metadata concise and useful.

Allowed block types and exact type values:
1) text
{"type":"text","id":"b1","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"format":"markdown","value":"Text"}}

2) image
{"type":"image","id":"b2","position":{"order":1},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"url":"https://...","alt":"Alt text","caption":"Caption"}}

3) code-block
{"type":"code-block","id":"b3","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"language":"python","code":"print(1)"}}

4) code-playground
{"type":"code-playground","id":"b4","position":{"order":3},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"language":"python","initialCode":"print(1)","expectedOutput":"1","hints":["hint"],"runnable":true}}

5) code-execution
{"type":"code-execution","id":"b5","position":{"order":4},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"title":"Trace demo","language":"python","sourceCode":"a = 1\\nb = a + 2\\nprint(b)","traceSteps":[{"line":1,"variables":{"a":1}},{"line":2,"variables":{"a":1,"b":3}},{"line":3,"stdoutDelta":"3","variables":{"a":1,"b":3}}],"controls":{"autoplay":false,"stepDurationMs":1200,"allowScrub":true},"style":{"theme":"indigo","showLineNumbers":true,"showVariablesPanel":true,"showStdoutPanel":true}}}

6) multiple-choice
{"type":"multiple-choice","id":"b6","position":{"order":5},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Question","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation"}}

7) fill-blank
{"type":"fill-blank","id":"b7","position":{"order":6},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"The CPU stands for ____.","correctAnswer":"Central Processing Unit","hint":"Expand CPU"}}

8) true-false
{"type":"true-false","id":"b8","position":{"order":7},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Statement","correctAnswer":true,"explanation":"Why"}}

9) matching
{"type":"matching","id":"b9","position":{"order":8},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Match terms","leftItems":[{"id":"l1","text":"A"},{"id":"l2","text":"B"}],"rightItems":[{"id":"r1","text":"1"},{"id":"r2","text":"2"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}],"explanation":"Why"}}

10) video
{"type":"video","id":"b10","position":{"order":9},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"url":"https://...","title":"Video title"}}

11) animation
{"type":"animation","id":"b11","position":{"order":10},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"preset":"bouncing-dot","durationMs":2000,"loop":true,"speed":1.0}}

Course-adaptive block strategy:
- Programming / CS: include code-block + code-playground + conceptual quizzes (multiple-choice / fill-blank / matching / true-false).
- Math / Physics / Engineering: prioritize worked explanations (text), formula understanding checks (fill-blank, true-false), concept mapping (matching), and simple animation when it helps.
- Language / History / Business / Humanities: prioritize text + multiple-choice + fill-blank + matching; add image/video only when it improves understanding.
- Use at least 4 different block types when the source material supports it.
- Keep an explain-practice rhythm: usually 1 assessment block after every 1-2 concept blocks.
- If real image/video URLs are unavailable, use text or quiz blocks instead of fake URLs.

Generate the course based on the PDF:
''';

  /// Generate course from PDF
  static Future<GenerationResult> generateFromPdf({
    required Uint8List pdfBytes,
    required String fileName,
    String? customPrompt,
  }) async {
    final totalTimer = Stopwatch()..start();
    final requestId = _buildRequestId();
    final prompt = customPrompt ?? _courseGenerationPrompt;
    final promptSource = customPrompt == null ? 'default' : 'custom';
    final promptFingerprint = _fingerprintPrompt(prompt);

    var stage = 'preflight';
    var parseResult = AIGenerationParseResult.notAttempted;
    bool? validationPassed;
    var validationErrorCount = 0;
    var validationWarningCount = 0;
    var generationLatencyMs = 0;
    var parseLatencyMs = 0;
    var validationLatencyMs = 0;
    var modelAttempts = 0;
    String? selectedModel;

    GenerationResult buildResult({
      required bool success,
      required String message,
      Course? course,
      String? rawJson,
    }) {
      totalTimer.stop();
      final diagnostics = AIGenerationDiagnostics(
        requestId: requestId,
        promptVersion: _promptVersion,
        promptSource: promptSource,
        promptFingerprint: promptFingerprint,
        model: selectedModel,
        modelAttempts: modelAttempts,
        totalLatencyMs: totalTimer.elapsedMilliseconds,
        generationLatencyMs: generationLatencyMs,
        parseLatencyMs: parseLatencyMs,
        validationLatencyMs: validationLatencyMs,
        parseResult: parseResult,
        validationPassed: validationPassed,
        validationErrorCount: validationErrorCount,
        validationWarningCount: validationWarningCount,
        stage: stage,
        success: success,
        message: message,
      );
      _logDiagnostics(diagnostics);
      return GenerationResult(
        success: success,
        message: message,
        course: course,
        rawJson: rawJson,
        diagnostics: diagnostics,
      );
    }

    if (_apiKey == null || _apiKey!.isEmpty) {
      return buildResult(
        success: false,
        message: 'Please set your Gemini API key first',
      );
    }

    try {
      // 1. Prepare file data (use inline data for reliability)
      final base64Data = base64Encode(pdfBytes);

      // 2. Call Gemini to generate the course
      stage = 'generate';
      final jsonResult = await _generateContent(
        inlineData: base64Data,
        mimeType: 'application/pdf',
        prompt: prompt,
      );
      generationLatencyMs = jsonResult.latencyMs ?? generationLatencyMs;
      modelAttempts = jsonResult.attemptCount ?? modelAttempts;
      selectedModel = jsonResult.model;

      if (!jsonResult.success) {
        return buildResult(
          success: false,
          message: 'Generation failed: ${jsonResult.message}',
        );
      }

      // 3. Parse JSON into Course object
      stage = 'parse';
      final parseTimer = Stopwatch()..start();
      final parsedResult = await _parseJsonObjectWithRepair(
        jsonResult.content!,
        preferredModel: jsonResult.model,
      );
      parseTimer.stop();
      parseLatencyMs = parseTimer.elapsedMilliseconds;
      parseResult = parsedResult.result;

      if (parsedResult.json == null) {
        return buildResult(
          success: false,
          message: 'Failed to parse course JSON: AI output is not valid JSON',
          rawJson: _extractJson(jsonResult.content!),
        );
      }

      final normalizedJson = _normalizeGeneratedCourseJson(
        parsedResult.json!,
        fileName: fileName,
      );

      final course = Course.fromJson(normalizedJson);

      stage = 'validate';
      final validationTimer = Stopwatch()..start();
      final validation = CourseSchemaValidator.validateCourse(
        course,
        mode: CourseSchemaValidationMode.import,
      );
      validationTimer.stop();
      validationLatencyMs = validationTimer.elapsedMilliseconds;
      validationPassed = validation.isValid;
      validationErrorCount = validation.errors.length;
      validationWarningCount = validation.warnings.length;

      if (!validation.isValid) {
        return buildResult(
          success: false,
          message: _formatValidationFailureMessage(validation.errorMessages),
          rawJson: jsonEncode(normalizedJson),
        );
      }

      stage = 'complete';
      return buildResult(
        success: true,
        message: jsonResult.model != null
            ? 'Course generated with ${jsonResult.model}'
            : 'Course generated',
        course: course,
        rawJson: jsonEncode(normalizedJson),
      );
    } catch (e) {
      return buildResult(success: false, message: 'Generation error: $e');
    }
  }

  /// Generate course from a plain-text description (one-sentence / Beta flow).
  ///
  /// Unlike [generateFromPdf], this method sends a text-only prompt to Gemini
  /// (no file upload), so it works without any file picker.
  static Future<GenerationResult> generateFromDescription({
    required String description,
    String difficulty = 'beginner',
    String animationStyle = 'minimal',
    String audience = 'beginners',
  }) async {
    final totalTimer = Stopwatch()..start();
    final requestId = _buildRequestId();
    const promptSource = 'description';
    const promptVersion = _promptVersion;

    var stage = 'preflight';
    var parseResult = AIGenerationParseResult.notAttempted;
    bool? validationPassed;
    var validationErrorCount = 0;
    var validationWarningCount = 0;
    var generationLatencyMs = 0;
    var parseLatencyMs = 0;
    var validationLatencyMs = 0;
    var modelAttempts = 0;
    String? selectedModel;

    final promptFingerprint = _fingerprintPrompt(description);

    GenerationResult buildResult({
      required bool success,
      required String message,
      Course? course,
      String? rawJson,
    }) {
      totalTimer.stop();
      final diagnostics = AIGenerationDiagnostics(
        requestId: requestId,
        promptVersion: promptVersion,
        promptSource: promptSource,
        promptFingerprint: promptFingerprint,
        model: selectedModel,
        modelAttempts: modelAttempts,
        totalLatencyMs: totalTimer.elapsedMilliseconds,
        generationLatencyMs: generationLatencyMs,
        parseLatencyMs: parseLatencyMs,
        validationLatencyMs: validationLatencyMs,
        parseResult: parseResult,
        validationPassed: validationPassed,
        validationErrorCount: validationErrorCount,
        validationWarningCount: validationWarningCount,
        stage: stage,
        success: success,
        message: message,
      );
      _logDiagnostics(diagnostics);
      return GenerationResult(
        success: success,
        message: message,
        course: course,
        rawJson: rawJson,
        diagnostics: diagnostics,
      );
    }

    if (_apiKey == null || _apiKey!.isEmpty) {
      return buildResult(
        success: false,
        message: 'Please set your Gemini API key first',
      );
    }

    if (description.trim().isEmpty) {
      return buildResult(
        success: false,
        message: 'Course description must not be empty',
      );
    }

    // Build a text-only prompt embedding all user options
    final prompt =
        '''
$_courseGenerationPrompt

User course request:
"${description.trim()}"

Additional requirements:
- Difficulty level: $difficulty
- Animation style preference: $animationStyle
- Target audience: $audience
- Generate content entirely from the description above (no PDF provided).
- Follow all hard constraints and block type rules above.
''';

    try {
      // 1. Call Gemini with text-only prompt (no file upload needed)
      stage = 'generate';
      final models = _modelCandidates;
      final genTimer = Stopwatch()..start();
      _ContentResult? lastFailure;

      for (final model in models) {
        modelAttempts += 1;
        final result = await _generateTextWithModel(
          model: model,
          prompt: prompt,
        );
        if (result.success) {
          genTimer.stop();
          generationLatencyMs = genTimer.elapsedMilliseconds;
          selectedModel = result.model;
          lastFailure = null;

          // 2. Parse
          stage = 'parse';
          final parseTimer = Stopwatch()..start();
          final parsedResult = await _parseJsonObjectWithRepair(
            result.content!,
            preferredModel: model,
          );
          parseTimer.stop();
          parseLatencyMs = parseTimer.elapsedMilliseconds;
          parseResult = parsedResult.result;

          if (parsedResult.json == null) {
            return buildResult(
              success: false,
              message: 'Failed to parse course JSON from AI output',
              rawJson: _extractJson(result.content!),
            );
          }

          final normalizedJson = _normalizeGeneratedCourseJson(
            parsedResult.json!,
            fileName: description.trim(),
          );
          final course = Course.fromJson(normalizedJson);

          // 3. Validate
          stage = 'validate';
          final valTimer = Stopwatch()..start();
          final validation = CourseSchemaValidator.validateCourse(
            course,
            mode: CourseSchemaValidationMode.import,
          );
          valTimer.stop();
          validationLatencyMs = valTimer.elapsedMilliseconds;
          validationPassed = validation.isValid;
          validationErrorCount = validation.errors.length;
          validationWarningCount = validation.warnings.length;

          if (!validation.isValid) {
            return buildResult(
              success: false,
              message: _formatValidationFailureMessage(
                validation.errorMessages,
              ),
              rawJson: jsonEncode(normalizedJson),
            );
          }

          stage = 'complete';
          return buildResult(
            success: true,
            message: 'Course generated with $model',
            course: course,
            rawJson: jsonEncode(normalizedJson),
          );
        }
        lastFailure = result;
        if (!_shouldTryNextModel(result)) break;
      }

      genTimer.stop();
      return buildResult(
        success: false,
        message:
            'Generation failed: ${lastFailure?.message ?? 'No available model'}',
      );
    } catch (e) {
      return buildResult(success: false, message: 'Generation error: $e');
    }
  }

  /// Generate course via the backend Supabase Edge Function.
  ///
  /// Unlike [generateFromDescription], this method does not require a
  /// client-side Gemini API key — the key and prompt live server-side in
  /// the `ai-generate-course-json` Edge Function.
  ///
  /// The returned JSON is normalised and validated through the existing
  /// [CourseImport] pipeline (schema migration + schema validation).
  static Future<GenerationResult> generateViaApi({
    required String description,
    String difficulty = 'beginner',
    String animationStyle = 'minimal',
    String audience = 'beginners',
  }) async {
    final totalTimer = Stopwatch()..start();
    final requestId = _buildRequestId();

    GenerationResult buildResult({
      required bool success,
      required String message,
      Course? course,
      String? rawJson,
    }) {
      totalTimer.stop();
      return GenerationResult(
        success: success,
        message: message,
        course: course,
        rawJson: rawJson,
        diagnostics: AIGenerationDiagnostics(
          requestId: requestId,
          promptVersion: _promptVersion,
          promptSource: 'api',
          promptFingerprint: _fingerprintPrompt(description),
          model: null,
          modelAttempts: 1,
          totalLatencyMs: totalTimer.elapsedMilliseconds,
          generationLatencyMs: 0,
          parseLatencyMs: 0,
          validationLatencyMs: 0,
          parseResult: success
              ? AIGenerationParseResult.direct
              : AIGenerationParseResult.failed,
          validationPassed: success ? true : false,
          validationErrorCount: 0,
          validationWarningCount: 0,
          stage: success ? 'complete' : 'generate',
          success: success,
          message: message,
        ),
      );
    }

    if (description.trim().isEmpty) {
      return buildResult(
        success: false,
        message: 'Course description must not be empty',
      );
    }

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'ai-generate-course-json',
        body: {
          'description': description.trim(),
          'difficulty': difficulty,
          'animationStyle': animationStyle,
          'audience': audience,
        },
      );

      final data = response.data;
      if (data == null) {
        return buildResult(success: false, message: 'No response from server');
      }

      final dataMap = data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data as Map);

      if (dataMap['success'] != true) {
        final error =
            dataMap['error']?.toString() ?? 'Generation failed on server';
        return buildResult(success: false, message: error);
      }

      final rawCourseJson = dataMap['courseJson'];
      if (rawCourseJson == null) {
        return buildResult(
          success: false,
          message: 'Server returned no course JSON',
        );
      }

      final courseJsonMap = rawCourseJson is Map<String, dynamic>
          ? rawCourseJson
          : Map<String, dynamic>.from(rawCourseJson as Map);

      // Normalise (type aliases, unique IDs, defaults) then encode as string
      final normalizedJson = _normalizeGeneratedCourseJson(
        courseJsonMap,
        fileName: description.trim(),
      );
      final rawJsonStr = jsonEncode(normalizedJson);

      // Validate through the existing CourseImport pipeline
      // (schema migration + schema validation)
      final importResult = CourseImport.importFromString(rawJsonStr);
      if (!importResult.success || importResult.course == null) {
        return buildResult(
          success: false,
          message: importResult.message,
          rawJson: rawJsonStr,
        );
      }

      return buildResult(
        success: true,
        message: 'Course generated via API',
        course: importResult.course,
        rawJson: rawJsonStr,
      );
    } on FunctionException catch (e) {
      final detail = e.details?.toString() ?? e.toString();
      return buildResult(success: false, message: 'Server error: $detail');
    } on http.ClientException catch (e) {
      // "Failed to fetch" in Flutter Web = CORS blocked or function not deployed.
      // The most common cause: the Edge Function has never been deployed to Supabase.
      final isFailedToFetch = e.message.toLowerCase().contains(
        'failed to fetch',
      );
      final msg = isFailedToFetch
          ? 'Edge Function 不可访问（可能尚未部署）。\n'
                '请运行：supabase functions deploy ai-generate-course-json\n'
                '并设置：supabase secrets set GEMINI_API_KEY=<your_key>'
          : 'Network error: ${e.message}';
      return buildResult(success: false, message: msg);
    } catch (e) {
      return buildResult(success: false, message: 'Error: $e');
    }
  }

  /// Agentic course generation via the `agentic-generate-course` Edge Function.
  ///
  /// Internally the function runs three stages:
  ///   1. ai-plan-course      → decides N lessons and their key_points
  ///   2. ai-generate-lesson-blocks × N → content blocks per lesson
  ///   3. DB write            → inserts courses + lessons rows
  ///
  /// The course is written to the database before this method returns.
  /// [AgentCourseResult.courseId] identifies the new row.
  static Future<AgentCourseResult> generateCourseAgentViaApi({
    required String description,
    String difficulty = 'beginner',
    String animationStyle = 'minimal',
    String language = 'zh',
  }) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'agentic-generate-course',
        body: {
          'description': description.trim(),
          'difficulty': difficulty,
          'animationStyle': animationStyle,
          'language': language,
        },
      );

      final data = response.data;
      if (data == null) {
        return const AgentCourseResult(
          success: false,
          message: 'No response from server',
        );
      }

      final dataMap = data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data as Map);

      if (dataMap['success'] != true) {
        final error =
            dataMap['error']?.toString() ?? 'Generation failed on server';
        final stage = dataMap['stage']?.toString();
        return AgentCourseResult(
          success: false,
          message: stage != null ? '[$stage] $error' : error,
        );
      }

      return AgentCourseResult(
        success: true,
        message: 'Course generated successfully',
        courseId: dataMap['courseId']?.toString(),
        lessonCount: (dataMap['lessonCount'] as num?)?.toInt() ?? 0,
      );
    } on FunctionException catch (e) {
      final detail = e.details?.toString() ?? e.toString();
      return AgentCourseResult(
        success: false,
        message: 'Server error: $detail',
      );
    } on http.ClientException catch (e) {
      final isFailedToFetch =
          e.message.toLowerCase().contains('failed to fetch');
      final msg = isFailedToFetch
          ? 'Edge Function 不可访问（可能尚未部署）。\n'
                '请运行：supabase functions deploy agentic-generate-course\n'
                '并设置：supabase secrets set GEMINI_API_KEY=<your_key>'
          : 'Network error: ${e.message}';
      return AgentCourseResult(success: false, message: msg);
    } catch (e) {
      return AgentCourseResult(success: false, message: 'Error: $e');
    }
  }

  /// Generate course from PDF via backend Supabase Edge Function.
  ///
  /// This method does not require a client-side Gemini API key.
  /// The PDF is sent as base64 to `ai-generate-course-json`.
  static Future<GenerationResult> generateFromPdfViaApi({
    required Uint8List pdfBytes,
    required String fileName,
  }) async {
    final totalTimer = Stopwatch()..start();
    final requestId = _buildRequestId();

    GenerationResult buildResult({
      required bool success,
      required String message,
      Course? course,
      String? rawJson,
      String? model,
    }) {
      totalTimer.stop();
      return GenerationResult(
        success: success,
        message: message,
        course: course,
        rawJson: rawJson,
        diagnostics: AIGenerationDiagnostics(
          requestId: requestId,
          promptVersion: _promptVersion,
          promptSource: 'api_pdf',
          promptFingerprint: _fingerprintPrompt(
            'pdf:$fileName:${pdfBytes.length}',
          ),
          model: model,
          modelAttempts: 1,
          totalLatencyMs: totalTimer.elapsedMilliseconds,
          generationLatencyMs: 0,
          parseLatencyMs: 0,
          validationLatencyMs: 0,
          parseResult: success
              ? AIGenerationParseResult.direct
              : AIGenerationParseResult.failed,
          validationPassed: success ? true : false,
          validationErrorCount: 0,
          validationWarningCount: 0,
          stage: success ? 'complete' : 'generate',
          success: success,
          message: message,
        ),
      );
    }

    if (pdfBytes.isEmpty) {
      return buildResult(success: false, message: 'PDF file must not be empty');
    }

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'ai-generate-course-json',
        body: {'pdfBase64': base64Encode(pdfBytes), 'fileName': fileName},
      );

      final data = response.data;
      if (data == null) {
        return buildResult(success: false, message: 'No response from server');
      }

      final dataMap = data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data as Map);

      final model = dataMap['model']?.toString();

      if (dataMap['success'] != true) {
        final error =
            dataMap['error']?.toString() ?? 'Generation failed on server';
        return buildResult(success: false, message: error, model: model);
      }

      final rawCourseJson = dataMap['courseJson'];
      if (rawCourseJson == null) {
        return buildResult(
          success: false,
          message: 'Server returned no course JSON',
          model: model,
        );
      }

      final courseJsonMap = rawCourseJson is Map<String, dynamic>
          ? rawCourseJson
          : Map<String, dynamic>.from(rawCourseJson as Map);

      final normalizedJson = _normalizeGeneratedCourseJson(
        courseJsonMap,
        fileName: fileName.trim().isEmpty ? 'Uploaded PDF' : fileName,
      );
      final rawJsonStr = jsonEncode(normalizedJson);

      final importResult = CourseImport.importFromString(rawJsonStr);
      if (!importResult.success || importResult.course == null) {
        return buildResult(
          success: false,
          message: importResult.message,
          rawJson: rawJsonStr,
          model: model,
        );
      }

      return buildResult(
        success: true,
        message: model != null && model.isNotEmpty
            ? 'Course generated via API ($model)'
            : 'Course generated via API',
        course: importResult.course,
        rawJson: rawJsonStr,
        model: model,
      );
    } on FunctionException catch (e) {
      final detail = e.details?.toString() ?? e.toString();
      return buildResult(success: false, message: 'Server error: $detail');
    } on http.ClientException catch (e) {
      final isFailedToFetch = e.message.toLowerCase().contains(
        'failed to fetch',
      );
      final msg = isFailedToFetch
          ? 'Edge Function 不可访问（可能尚未部署）。\n'
                '请运行：supabase functions deploy ai-generate-course-json\n'
                '并设置：supabase secrets set GEMINI_API_KEY=<your_key>'
          : 'Network error: ${e.message}';
      return buildResult(success: false, message: msg);
    } catch (e) {
      return buildResult(success: false, message: 'Error: $e');
    }
  }

  /// Call Gemini to generate content
  static Future<_ContentResult> _generateContent({
    String? inlineData,
    required String mimeType,
    required String prompt,
  }) async {
    if (inlineData == null || inlineData.isEmpty) {
      return const _ContentResult(
        success: false,
        message: 'No valid file data',
      );
    }

    final timer = Stopwatch()..start();
    _ContentResult? lastFailure;
    var attempts = 0;
    for (final model in _modelCandidates) {
      attempts += 1;
      final result = await _generateContentWithModel(
        model: model,
        inlineData: inlineData,
        mimeType: mimeType,
        prompt: prompt,
      );

      if (result.success) {
        timer.stop();
        return result.copyWith(
          attemptCount: attempts,
          latencyMs: timer.elapsedMilliseconds,
        );
      }
      lastFailure = result;
      if (!_shouldTryNextModel(result)) {
        timer.stop();
        return result.copyWith(
          attemptCount: attempts,
          latencyMs: timer.elapsedMilliseconds,
        );
      }
    }

    timer.stop();
    return (lastFailure ??
            const _ContentResult(
              success: false,
              message: 'No available Gemini model',
            ))
        .copyWith(attemptCount: attempts, latencyMs: timer.elapsedMilliseconds);
  }

  static Future<_ContentResult> _generateContentWithModel({
    required String model,
    required String inlineData,
    required String mimeType,
    required String prompt,
  }) async {
    try {
      final url = '$_baseUrl/models/$model:generateContent?key=$_apiKey';

      final requestBody = {
        'contents': [
          {
            'parts': [
              {
                'inlineData': {'mimeType': mimeType, 'data': inlineData},
              },
              {'text': prompt},
            ],
          },
        ],
        'generationConfig': {
          'temperature': 0.6,
          'maxOutputTokens': _maxOutputTokens,
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
        final candidates = data['candidates'];
        if (candidates is! List || candidates.isEmpty) {
          return _ContentResult(
            success: false,
            message: 'Empty response candidates',
            statusCode: response.statusCode,
            model: model,
          );
        }

        final candidate = _mapFromDynamic(candidates.first);
        final contentMap = _mapFromDynamic(candidate['content']);
        final parts = contentMap['parts'];
        if (parts is! List || parts.isEmpty) {
          return _ContentResult(
            success: false,
            message: 'Response has no content parts',
            statusCode: response.statusCode,
            model: model,
          );
        }

        final firstPart = _mapFromDynamic(parts.first);
        final content = firstPart['text'] as String?;
        if (content == null || content.trim().isEmpty) {
          return _ContentResult(
            success: false,
            message: 'Model returned empty text',
            statusCode: response.statusCode,
            model: model,
          );
        }

        return _ContentResult(success: true, content: content, model: model);
      }

      final errorMessage = _extractErrorMessage(response.body);
      return _ContentResult(
        success: false,
        message: errorMessage,
        statusCode: response.statusCode,
        model: model,
      );
    } catch (e) {
      return _ContentResult(
        success: false,
        message: e.toString(),
        model: model,
      );
    }
  }

  static Future<_ParsedJsonResult> _parseJsonObjectWithRepair(
    String rawContent, {
    String? preferredModel,
  }) async {
    final parsed = _parseJsonObject(rawContent);
    if (parsed != null) {
      return _ParsedJsonResult(
        json: parsed,
        result: AIGenerationParseResult.direct,
      );
    }

    final repaired = await _repairJsonContent(
      rawContent,
      preferredModel: preferredModel,
    );
    if (repaired == null) {
      return const _ParsedJsonResult(
        json: null,
        result: AIGenerationParseResult.failed,
      );
    }

    final repairedJson = _parseJsonObject(repaired);
    return _ParsedJsonResult(
      json: repairedJson,
      result: repairedJson == null
          ? AIGenerationParseResult.failed
          : AIGenerationParseResult.repaired,
    );
  }

  static Map<String, dynamic>? _parseJsonObject(String content) {
    final candidates = _collectJsonCandidates(content);
    for (final candidate in candidates) {
      try {
        final decoded = jsonDecode(candidate);
        if (decoded is Map) {
          return decoded.map((key, value) => MapEntry(key.toString(), value));
        }
      } catch (_) {
        continue;
      }
    }

    return null;
  }

  static List<String> _collectJsonCandidates(String content) {
    final candidates = <String>[];
    final seen = <String>{};

    void addCandidate(String? raw) {
      if (raw == null) return;

      final cleaned = _sanitizeJsonText(raw);
      if (cleaned.isEmpty) return;

      if (seen.add(cleaned)) {
        candidates.add(cleaned);
      }

      final withoutLanguageTag = _dropLeadingLanguageTag(cleaned);
      if (withoutLanguageTag.isNotEmpty && seen.add(withoutLanguageTag)) {
        candidates.add(withoutLanguageTag);
      }

      final bracketWrapped = _extractBracketWrapped(withoutLanguageTag);
      if (bracketWrapped != null && seen.add(bracketWrapped)) {
        candidates.add(bracketWrapped);
      }
    }

    final trimmed = content.trim();
    addCandidate(trimmed);

    final jsonBlockRegex = RegExp(
      r'```(?:json|application/json)\s*([\s\S]*?)\s*```',
      caseSensitive: false,
    );
    for (final match in jsonBlockRegex.allMatches(trimmed)) {
      addCandidate(match.group(1));
    }

    final anyCodeBlockRegex = RegExp(r'```([a-zA-Z0-9_-]*)\s*([\s\S]*?)\s*```');
    for (final match in anyCodeBlockRegex.allMatches(trimmed)) {
      final language = (match.group(1) ?? '').toLowerCase();
      final body = match.group(2);
      if (body == null) continue;
      if (language == 'json' || language.isEmpty || body.contains('{')) {
        addCandidate(body);
      }
    }

    return candidates;
  }

  static String _dropLeadingLanguageTag(String text) {
    final lines = text.split('\n');
    if (lines.length < 2) return text.trim();

    final firstLine = lines.first.trim().toLowerCase();
    const knownTags = {
      'json',
      'jsonc',
      'javascript',
      'js',
      'typescript',
      'ts',
      'python',
      'py',
      'dart',
      'yaml',
      'yml',
      'xml',
      'html',
      'markdown',
      'md',
      'text',
      'plaintext',
    };
    if (!knownTags.contains(firstLine)) return text.trim();

    return lines.skip(1).join('\n').trim();
  }

  static String? _extractBracketWrapped(String text) {
    final firstBrace = text.indexOf('{');
    final lastBrace = text.lastIndexOf('}');
    if (firstBrace == -1 || lastBrace == -1 || lastBrace <= firstBrace) {
      return null;
    }

    return text.substring(firstBrace, lastBrace + 1).trim();
  }

  static String _sanitizeJsonText(String raw) {
    return raw
        .trim()
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
        .replaceAll('\uFF0C', ',') // fullwidth comma
        .replaceAll('\uFF1A', ':') // fullwidth colon
        .replaceAll('\u201C', '"') // left double quote
        .replaceAll('\u201D', '"') // right double quote
        .replaceAll('\u2018', "'") // left single quote
        .replaceAll('\u2019', "'"); // right single quote
  }

  static Future<String?> _repairJsonContent(
    String rawContent, {
    String? preferredModel,
  }) async {
    final repairPrompt =
        '''
Convert the following content into a strict valid JSON object.

Rules:
- Return JSON only.
- Do not use markdown, code fences, or comments.
- Preserve the original structure and values as much as possible.
- Ensure keys and string values use double quotes.

Content to repair:
$rawContent
''';

    final repairModels = <String>[
      if (preferredModel != null && preferredModel.trim().isNotEmpty)
        preferredModel.trim(),
      ..._modelCandidates,
    ];

    final tried = <String>{};
    for (final model in repairModels) {
      if (!tried.add(model)) continue;
      final result = await _generateTextWithModel(
        model: model,
        prompt: repairPrompt,
      );
      if (result.success && (result.content?.trim().isNotEmpty ?? false)) {
        return result.content!.trim();
      }
    }

    return null;
  }

  static Future<_ContentResult> _generateTextWithModel({
    required String model,
    required String prompt,
  }) async {
    try {
      final url = '$_baseUrl/models/$model:generateContent?key=$_apiKey';
      final requestBody = {
        'contents': [
          {
            'parts': [
              {'text': prompt},
            ],
          },
        ],
        'generationConfig': {
          'temperature': 0.0,
          'maxOutputTokens': _maxOutputTokens,
          'responseMimeType': 'application/json',
        },
      };

      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode != 200) {
        return _ContentResult(
          success: false,
          message: _extractErrorMessage(response.body),
          statusCode: response.statusCode,
          model: model,
        );
      }

      final data = jsonDecode(response.body);
      final candidates = data['candidates'];
      if (candidates is! List || candidates.isEmpty) {
        return _ContentResult(
          success: false,
          message: 'Empty response candidates',
          statusCode: response.statusCode,
          model: model,
        );
      }

      final candidate = _mapFromDynamic(candidates.first);
      final contentMap = _mapFromDynamic(candidate['content']);
      final parts = contentMap['parts'];
      if (parts is! List || parts.isEmpty) {
        return _ContentResult(
          success: false,
          message: 'Response has no content parts',
          statusCode: response.statusCode,
          model: model,
        );
      }

      final firstPart = _mapFromDynamic(parts.first);
      final content = _asString(firstPart['text']);
      if (content == null || content.trim().isEmpty) {
        return _ContentResult(
          success: false,
          message: 'Model returned empty text',
          statusCode: response.statusCode,
          model: model,
        );
      }

      return _ContentResult(success: true, content: content, model: model);
    } catch (e) {
      return _ContentResult(
        success: false,
        message: e.toString(),
        model: model,
      );
    }
  }

  static bool _shouldTryNextModel(_ContentResult result) {
    final statusCode = result.statusCode;
    if (statusCode == 404) return true;
    if (statusCode == 429) return true;
    if (statusCode == 500 ||
        statusCode == 502 ||
        statusCode == 503 ||
        statusCode == 504) {
      return true;
    }

    final message = (result.message ?? '').toLowerCase();
    if (message.contains('high demand') ||
        message.contains('resource_exhausted') ||
        message.contains('resource exhausted') ||
        message.contains('unavailable')) {
      return true;
    }

    if (statusCode != 400 && statusCode != 403) return false;

    return message.contains('model') &&
            (message.contains('not found') ||
                message.contains('unsupported') ||
                message.contains('not available') ||
                message.contains('not enabled')) ||
        (message.contains('permission') && message.contains('model'));
  }

  static String _extractErrorMessage(String body) {
    try {
      final jsonBody = jsonDecode(body);
      if (jsonBody is Map) {
        final map = jsonBody.map((k, v) => MapEntry(k.toString(), v));
        final error = _mapFromDynamic(map['error']);
        final message = error['message'] as String?;
        if (message != null && message.trim().isNotEmpty) return message;
      }
    } catch (_) {
      // Ignore parse errors and fallback to raw response.
    }

    return body.isEmpty ? 'Unknown error' : body;
  }

  static String _buildRequestId() {
    final millis = DateTime.now().millisecondsSinceEpoch;
    final suffix = (millis % 1000000).toString().padLeft(6, '0');
    return 'gen-$suffix';
  }

  static String _fingerprintPrompt(String prompt) {
    var hash = 2166136261;
    for (final codeUnit in prompt.codeUnits) {
      hash ^= codeUnit;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return hash.toRadixString(16).padLeft(8, '0');
  }

  static String _formatValidationFailureMessage(List<String> errors) {
    if (errors.isEmpty) {
      return 'Generated course failed schema validation';
    }
    final shown = errors.take(3).toList();
    final more = errors.length - shown.length;
    final suffix = more > 0 ? '\n...and $more more issue(s)' : '';
    return 'Generated course failed schema validation:\n'
        '${shown.join('\n')}$suffix';
  }

  static void _logDiagnostics(AIGenerationDiagnostics diagnostics) {
    debugPrint(
      '[AICourseGenerator] request=${diagnostics.requestId} '
      '${diagnostics.toSummaryLine()}',
    );
  }

  static Map<String, dynamic> _normalizeGeneratedCourseJson(
    Map<String, dynamic> rawJson, {
    required String fileName,
  }) {
    final normalized = Map<String, dynamic>.from(rawJson);
    final metadata = _normalizeMetadata(normalized['metadata'], fileName);
    final pages = _normalizePages(normalized['pages']);

    normalized['courseId'] = _normalizeCourseId(normalized['courseId']);
    normalized['metadata'] = metadata;
    normalized['pages'] = pages;
    normalized['settings'] = _normalizeSettings(normalized['settings']);

    return normalized;
  }

  static String _normalizeCourseId(dynamic rawCourseId) {
    final id = _asString(rawCourseId);
    if (id != null && id.trim().isNotEmpty) return id.trim();
    return 'course-ai-${DateTime.now().millisecondsSinceEpoch}';
  }

  static Map<String, dynamic> _normalizeMetadata(
    dynamic rawMetadata,
    String fileName,
  ) {
    final metadata = _mapFromDynamic(rawMetadata);

    final title = _asString(metadata['title'])?.trim();
    final normalizedTitle = (title == null || title.isEmpty)
        ? _titleFromFileName(fileName)
        : title;

    final description = _asString(metadata['description'])?.trim();
    final author = _mapFromDynamic(metadata['author']);
    final tags = _stringListFromDynamic(metadata['tags']);
    final difficulty = _asString(metadata['difficulty'])?.trim();
    final estimatedMinutes = _asInt(metadata['estimatedMinutes']);
    final authorUserId = _asString(author['userId'])?.trim();
    final authorDisplayName = _asString(author['displayName'])?.trim();

    return {
      'title': normalizedTitle,
      'description': description ?? '',
      'author': {
        'userId': (authorUserId != null && authorUserId.isNotEmpty)
            ? authorUserId
            : 'ai',
        'displayName':
            (authorDisplayName != null && authorDisplayName.isNotEmpty)
            ? authorDisplayName
            : 'Gemini',
      },
      'tags': tags,
      'difficulty': (difficulty == null || difficulty.isEmpty)
          ? 'beginner'
          : difficulty,
      'estimatedMinutes': estimatedMinutes ?? 30,
    };
  }

  static Map<String, dynamic> _normalizeSettings(dynamic rawSettings) {
    final settings = _mapFromDynamic(rawSettings);
    final theme = _asString(settings['theme'])?.trim();
    final primaryColor = _asString(settings['primaryColor'])?.trim();
    final fontFamily = _asString(settings['fontFamily'])?.trim();
    return {
      'theme': (theme != null && theme.isNotEmpty) ? theme : 'light',
      'primaryColor': (primaryColor != null && primaryColor.isNotEmpty)
          ? primaryColor
          : 'blue',
      'fontFamily': (fontFamily != null && fontFamily.isNotEmpty)
          ? fontFamily
          : 'system',
    };
  }

  static List<Map<String, dynamic>> _normalizePages(dynamic rawPages) {
    final rawPageList = rawPages is List ? rawPages : const [];
    final allRawBlocks = <Map<String, dynamic>>[];
    String? firstPageTitle;

    for (final rawPage in rawPageList) {
      final page = _mapFromDynamic(rawPage);
      final title = _asString(page['title'])?.trim();
      if (firstPageTitle == null && title != null && title.isNotEmpty) {
        firstPageTitle = title;
      }

      final blocks = page['blocks'];
      if (blocks is! List) continue;

      for (final rawBlock in blocks) {
        if (rawBlock is Map) {
          allRawBlocks.add(_mapFromDynamic(rawBlock));
        }
      }
    }

    final normalizedBlocks = _normalizeBlocks(allRawBlocks);
    return [
      {
        'pageId': 'p1',
        'title': firstPageTitle ?? 'Generated Content',
        'blocks': normalizedBlocks,
      },
    ];
  }

  static List<Map<String, dynamic>> _normalizeBlocks(
    List<Map<String, dynamic>> rawBlocks,
  ) {
    final normalized = <Map<String, dynamic>>[];
    final usedIds = <String>{};

    for (final rawBlock in rawBlocks) {
      if (normalized.length >= _maxBlocksPerPage) break;

      final type = _normalizeBlockType(_asString(rawBlock['type']));
      final originalContent = _mapFromDynamic(rawBlock['content']);
      final content = _normalizeBlockContent(type, originalContent);

      final id = _normalizeBlockId(
        _asString(rawBlock['id']),
        fallbackIndex: normalized.length + 1,
        usedIds: usedIds,
      );

      normalized.add({
        'type': type,
        'id': id,
        'position': {'order': normalized.length},
        'style': _normalizeStyle(rawBlock['style']),
        'visibilityRule': _normalizeVisibilityRule(rawBlock['visibilityRule']),
        'content': content,
      });
    }

    if (normalized.isEmpty) {
      normalized.add({
        'type': 'text',
        'id': 'block-1',
        'position': {'order': 0},
        'style': const {'spacing': 'md', 'alignment': 'left'},
        'visibilityRule': 'always',
        'content': const {
          'format': 'markdown',
          'value': 'No valid content was extracted from the PDF.',
        },
      });
    }

    return normalized;
  }

  static String _normalizeBlockType(String? rawType) {
    final value = (rawType ?? '').trim().toLowerCase();
    if (value.isEmpty) return 'text';

    const typeAliases = <String, String>{
      'text': 'text',
      'image': 'image',
      'code-block': 'code-block',
      'codeblock': 'code-block',
      'code_block': 'code-block',
      'code-playground': 'code-playground',
      'codeplayground': 'code-playground',
      'code_playground': 'code-playground',
      'code-execution': 'code-execution',
      'codeexecution': 'code-execution',
      'code_execution': 'code-execution',
      'multiple-choice': 'multiple-choice',
      'multiplechoice': 'multiple-choice',
      'multiple_choice': 'multiple-choice',
      'fill-blank': 'fill-blank',
      'fillblank': 'fill-blank',
      'fill_blank': 'fill-blank',
      'true-false': 'true-false',
      'truefalse': 'true-false',
      'true_false': 'true-false',
      'matching': 'matching',
      'animation': 'animation',
      'animationblock': 'animation',
      'animation-block': 'animation',
      'animation_block': 'animation',
      'video': 'video',
    };

    return typeAliases[value] ?? 'text';
  }

  static String _normalizeBlockId(
    String? rawId, {
    required int fallbackIndex,
    required Set<String> usedIds,
  }) {
    final sanitized = (rawId ?? '').trim();
    if (sanitized.isNotEmpty && usedIds.add(sanitized)) return sanitized;

    var candidate = 'block-$fallbackIndex';
    var index = fallbackIndex;
    while (!usedIds.add(candidate)) {
      index += 1;
      candidate = 'block-$index';
    }

    return candidate;
  }

  static Map<String, dynamic> _normalizeStyle(dynamic rawStyle) {
    final style = _mapFromDynamic(rawStyle);
    final spacing = _asString(style['spacing']);
    final alignment = _asString(style['alignment']);

    const spacingValues = {'xs', 'sm', 'md', 'lg', 'xl'};
    const alignmentValues = {'left', 'center', 'right'};

    final normalized = <String, dynamic>{
      'spacing': spacingValues.contains(spacing) ? spacing : 'md',
      'alignment': alignmentValues.contains(alignment) ? alignment : 'left',
    };

    final rawHeight = style['height'];
    if (rawHeight is num) {
      normalized['height'] = rawHeight.toDouble();
    }

    return normalized;
  }

  static String _normalizeVisibilityRule(dynamic rawRule) {
    final rule = _asString(rawRule);
    if (rule == 'afterPreviousCorrect') return 'afterPreviousCorrect';
    return 'always';
  }

  static Map<String, dynamic> _normalizeBlockContent(
    String type,
    Map<String, dynamic> content,
  ) {
    switch (type) {
      case 'image':
        final imageUrl = _asString(content['url'])?.trim() ?? '';
        final imageAlt = _asString(content['alt'])?.trim();
        final imageCaption = _asString(content['caption'])?.trim();
        return {
          'url': imageUrl,
          if (imageAlt != null && imageAlt.isNotEmpty) 'alt': imageAlt,
          if (imageCaption != null && imageCaption.isNotEmpty)
            'caption': imageCaption,
        };
      case 'code-block':
        final language = _asString(content['language'])?.trim();
        return {
          'language': (language != null && language.isNotEmpty)
              ? language
              : 'python',
          'code': _asString(content['code']) ?? '',
        };
      case 'code-playground':
        final playgroundLanguage = _asString(content['language'])?.trim();
        final expectedOutput = _asString(content['expectedOutput'])?.trim();
        return {
          'language':
              (playgroundLanguage != null && playgroundLanguage.isNotEmpty)
              ? playgroundLanguage
              : 'python',
          'initialCode':
              _asString(content['initialCode']) ??
              _asString(content['code']) ??
              '',
          if (expectedOutput != null && expectedOutput.isNotEmpty)
            'expectedOutput': expectedOutput,
          'hints': _stringListFromDynamic(content['hints']),
          'runnable': _asBool(content['runnable']) ?? true,
        };
      case 'code-execution':
        return _normalizeCodeExecutionContent(content);
      case 'multiple-choice':
        return _normalizeMultipleChoiceContent(content);
      case 'fill-blank':
        final hint = _asString(content['hint'])?.trim();
        return {
          'question': _asString(content['question']) ?? '',
          'correctAnswer': _asString(content['correctAnswer']) ?? '',
          if (hint != null && hint.isNotEmpty) 'hint': hint,
        };
      case 'true-false':
        final explanation = _asString(content['explanation'])?.trim();
        return {
          'question': _asString(content['question']) ?? '',
          'correctAnswer': _asBool(content['correctAnswer']) ?? true,
          if (explanation != null && explanation.isNotEmpty)
            'explanation': explanation,
        };
      case 'matching':
        return _normalizeMatchingContent(content);
      case 'animation':
        final preset = _asString(content['preset'])?.trim().toLowerCase();
        final normalizedPreset = preset == 'pulse-bars'
            ? 'pulse-bars'
            : 'bouncing-dot';
        final rawDuration = content['durationMs'];
        final durationMs = rawDuration is num ? rawDuration.toInt() : 2000;
        final rawSpeed = content['speed'];
        final speed = rawSpeed is num ? rawSpeed.toDouble() : 1.0;
        return {
          'preset': normalizedPreset,
          'durationMs': durationMs,
          'loop': _asBool(content['loop']) ?? true,
          'speed': speed,
        };
      case 'video':
        final videoUrl = _asString(content['url'])?.trim() ?? '';
        final videoTitle = _asString(content['title'])?.trim();
        return {
          'url': videoUrl,
          if (videoTitle != null && videoTitle.isNotEmpty) 'title': videoTitle,
        };
      case 'text':
      default:
        return {
          'format': _asString(content['format']) == 'plain'
              ? 'plain'
              : 'markdown',
          'value':
              _asString(content['value']) ?? _asString(content['text']) ?? '',
        };
    }
  }

  static Map<String, dynamic> _normalizeMultipleChoiceContent(
    Map<String, dynamic> content,
  ) {
    final rawOptions = content['options'];
    final options = <Map<String, dynamic>>[];
    if (rawOptions is List) {
      for (int index = 0; index < rawOptions.length; index++) {
        final optionMap = _mapFromDynamic(rawOptions[index]);
        final rawId = _asString(optionMap['id'])?.trim();
        final optionId = (rawId != null && rawId.isNotEmpty)
            ? rawId
            : String.fromCharCode(97 + index);
        final optionText = _asString(optionMap['text'])?.trim();
        if (optionText == null || optionText.isEmpty) continue;
        options.add({'id': optionId, 'text': optionText});
      }
    }

    if (options.length < 2) {
      options
        ..clear()
        ..addAll(const [
          {'id': 'a', 'text': 'Option A'},
          {'id': 'b', 'text': 'Option B'},
          {'id': 'c', 'text': 'Option C'},
        ]);
    }

    final optionIds = options.map((option) => option['id'] as String).toSet();
    final candidateAnswers = <String>[
      ..._stringListFromDynamic(content['correctAnswers']),
      if (content['correctAnswer'] is String)
        content['correctAnswer'] as String,
    ].map((answer) => answer.trim()).where((answer) => answer.isNotEmpty);

    final dedupAnswers = <String>[];
    final seen = <String>{};
    for (final answer in candidateAnswers) {
      if (!optionIds.contains(answer) || !seen.add(answer)) continue;
      dedupAnswers.add(answer);
    }

    if (dedupAnswers.isEmpty) {
      dedupAnswers.add(options.first['id'] as String);
    }

    final multiSelect = _asBool(content['multiSelect']) ?? false;
    final explanation = _asString(content['explanation'])?.trim();

    return {
      'question': _asString(content['question']) ?? '',
      'options': options,
      'correctAnswer': dedupAnswers.first,
      'correctAnswers': multiSelect ? dedupAnswers : [dedupAnswers.first],
      'multiSelect': multiSelect,
      if (explanation != null && explanation.isNotEmpty)
        'explanation': explanation,
    };
  }

  static Map<String, dynamic> _normalizeMatchingContent(
    Map<String, dynamic> content,
  ) {
    List<Map<String, dynamic>> normalizeItems(dynamic rawItems, String prefix) {
      final normalized = <Map<String, dynamic>>[];
      if (rawItems is! List) return normalized;

      for (int index = 0; index < rawItems.length; index++) {
        final item = _mapFromDynamic(rawItems[index]);
        final text = _asString(item['text'])?.trim();
        if (text == null || text.isEmpty) continue;
        final rawId = _asString(item['id'])?.trim();
        final id = (rawId != null && rawId.isNotEmpty)
            ? rawId
            : '$prefix${index + 1}';
        normalized.add({'id': id, 'text': text});
      }
      return normalized;
    }

    final leftItems = normalizeItems(content['leftItems'], 'l');
    final rightItems = normalizeItems(content['rightItems'], 'r');

    if (leftItems.length < 2 || rightItems.length < 2) {
      final fallbackExplanation = _asString(content['explanation'])?.trim();
      return {
        'question': _asString(content['question']) ?? '',
        'leftItems': const [
          {'id': 'l1', 'text': 'Item 1'},
          {'id': 'l2', 'text': 'Item 2'},
        ],
        'rightItems': const [
          {'id': 'r1', 'text': 'Match 1'},
          {'id': 'r2', 'text': 'Match 2'},
        ],
        'correctPairs': const [
          {'leftId': 'l1', 'rightId': 'r1'},
          {'leftId': 'l2', 'rightId': 'r2'},
        ],
        if (fallbackExplanation != null && fallbackExplanation.isNotEmpty)
          'explanation': fallbackExplanation,
      };
    }

    final leftIds = leftItems.map((item) => item['id'] as String).toSet();
    final rightIds = rightItems.map((item) => item['id'] as String).toSet();

    final pairs = <Map<String, dynamic>>[];
    final seenLeft = <String>{};
    final rawPairs = content['correctPairs'];
    if (rawPairs is List) {
      for (final rawPair in rawPairs) {
        final pair = _mapFromDynamic(rawPair);
        final leftId = _asString(pair['leftId'])?.trim() ?? '';
        final rightId = _asString(pair['rightId'])?.trim() ?? '';
        if (leftId.isEmpty ||
            rightId.isEmpty ||
            !leftIds.contains(leftId) ||
            !rightIds.contains(rightId) ||
            !seenLeft.add(leftId)) {
          continue;
        }
        pairs.add({'leftId': leftId, 'rightId': rightId});
      }
    }

    if (pairs.isEmpty) {
      final count = leftItems.length < rightItems.length
          ? leftItems.length
          : rightItems.length;
      for (int i = 0; i < count; i++) {
        pairs.add({
          'leftId': leftItems[i]['id'],
          'rightId': rightItems[i]['id'],
        });
      }
    }

    final explanation = _asString(content['explanation'])?.trim();
    return {
      'question': _asString(content['question']) ?? '',
      'leftItems': leftItems,
      'rightItems': rightItems,
      'correctPairs': pairs,
      if (explanation != null && explanation.isNotEmpty)
        'explanation': explanation,
    };
  }

  static Map<String, dynamic> _normalizeCodeExecutionContent(
    Map<String, dynamic> content,
  ) {
    final sourceCode =
        _asString(content['sourceCode']) ?? _asString(content['code']) ?? '';

    final rawTraceSteps = content['traceSteps'];
    final traceSteps = <Map<String, dynamic>>[];
    if (rawTraceSteps is List) {
      for (final rawStep in rawTraceSteps) {
        if (rawStep is! Map) continue;
        final map = _mapFromDynamic(rawStep);
        final lineRaw = map['line'] ?? map['lineNumber'];
        final line = lineRaw is num ? lineRaw.toInt() : 1;
        final variables = map['variables'] is Map
            ? Map<String, dynamic>.from(map['variables'] as Map)
            : <String, dynamic>{};
        final stdoutDelta = _asString(map['stdoutDelta'])?.trim();
        final note = _asString(map['note'])?.trim();
        final callStack = _stringListFromDynamic(map['callStack']);
        traceSteps.add({
          'line': line <= 0 ? 1 : line,
          'variables': variables,
          if (stdoutDelta != null && stdoutDelta.isNotEmpty)
            'stdoutDelta': stdoutDelta,
          if (callStack.isNotEmpty) 'callStack': callStack,
          if (note != null && note.isNotEmpty) 'note': note,
        });
      }
    }
    if (traceSteps.isEmpty) {
      traceSteps.add(const {'line': 1, 'variables': <String, dynamic>{}});
    }

    final checkpoints = <Map<String, dynamic>>[];
    final rawCheckpoints = content['checkpoints'];
    if (rawCheckpoints is List) {
      for (final rawCheckpoint in rawCheckpoints) {
        if (rawCheckpoint is! Map) continue;
        final map = _mapFromDynamic(rawCheckpoint);
        final options = _stringListFromDynamic(map['options']);
        if (options.isEmpty) continue;
        final stepIndexRaw = map['stepIndex'];
        final correctIndexRaw = map['correctIndex'];
        final stepIndex = stepIndexRaw is num ? stepIndexRaw.toInt() : 0;
        final correctIndex = correctIndexRaw is num
            ? correctIndexRaw.toInt()
            : 0;
        checkpoints.add({
          'stepIndex': stepIndex < 0 ? 0 : stepIndex,
          'question': _asString(map['question'])?.trim().isNotEmpty == true
              ? _asString(map['question'])!.trim()
              : 'What happens next?',
          'options': options,
          'correctIndex': correctIndex < 0 ? 0 : correctIndex,
          if (_asString(map['explanation'])?.trim().isNotEmpty == true)
            'explanation': _asString(map['explanation'])!.trim(),
        });
      }
    }

    final controls = _mapFromDynamic(content['controls']);
    final style = _mapFromDynamic(content['style']);
    final initialVariables = content['initialVariables'] is Map
        ? Map<String, dynamic>.from(content['initialVariables'] as Map)
        : <String, dynamic>{};

    return {
      'title': _asString(content['title'])?.trim().isNotEmpty == true
          ? _asString(content['title'])!.trim()
          : 'Code Execution',
      'language': _asString(content['language'])?.trim().isNotEmpty == true
          ? _asString(content['language'])!.trim()
          : 'python',
      'sourceCode': sourceCode,
      'traceSteps': traceSteps,
      if (initialVariables.isNotEmpty) 'initialVariables': initialVariables,
      if (checkpoints.isNotEmpty) 'checkpoints': checkpoints,
      'controls': {
        'autoplay': _asBool(controls['autoplay']) ?? false,
        'stepDurationMs': _asInt(controls['stepDurationMs']) ?? 1200,
        'allowScrub': _asBool(controls['allowScrub']) ?? true,
      },
      'style': {
        'theme': _asString(style['theme']) ?? 'indigo',
        'showLineNumbers': _asBool(style['showLineNumbers']) ?? true,
        'showVariablesPanel': _asBool(style['showVariablesPanel']) ?? true,
        'showStdoutPanel': _asBool(style['showStdoutPanel']) ?? true,
      },
    };
  }

  static String _titleFromFileName(String fileName) {
    final name = fileName.trim();
    if (name.isEmpty) return 'AI Generated Course';

    final dotIndex = name.lastIndexOf('.');
    final withoutExtension = dotIndex > 0
        ? name.substring(0, dotIndex).trim()
        : name;
    if (withoutExtension.isEmpty) return 'AI Generated Course';
    return withoutExtension;
  }

  static Map<String, dynamic> _mapFromDynamic(dynamic value) {
    if (value is! Map) return <String, dynamic>{};
    return value.map((key, val) => MapEntry(key.toString(), val));
  }

  static String? _asString(dynamic value) => value is String ? value : null;

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return null;
  }

  static bool? _asBool(dynamic value) => value is bool ? value : null;

  static List<String> _stringListFromDynamic(dynamic value) {
    if (value is! List) return <String>[];
    return value
        .whereType<String>()
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  /// Extract JSON from response
  static String _extractJson(String content) {
    final candidates = _collectJsonCandidates(content);
    if (candidates.isNotEmpty) return candidates.first;
    return _sanitizeJsonText(content);
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
  final AIGenerationDiagnostics? diagnostics;

  const GenerationResult({
    required this.success,
    required this.message,
    this.course,
    this.rawJson,
    this.diagnostics,
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
  final int? statusCode;
  final String? model;
  final int? attemptCount;
  final int? latencyMs;

  const _ContentResult({
    required this.success,
    this.content,
    this.message,
    this.statusCode,
    this.model,
    this.attemptCount,
    this.latencyMs,
  });

  _ContentResult copyWith({
    bool? success,
    String? content,
    String? message,
    int? statusCode,
    String? model,
    int? attemptCount,
    int? latencyMs,
  }) {
    return _ContentResult(
      success: success ?? this.success,
      content: content ?? this.content,
      message: message ?? this.message,
      statusCode: statusCode ?? this.statusCode,
      model: model ?? this.model,
      attemptCount: attemptCount ?? this.attemptCount,
      latencyMs: latencyMs ?? this.latencyMs,
    );
  }
}

enum AIGenerationParseResult {
  notAttempted('not_attempted'),
  direct('direct'),
  repaired('repaired'),
  failed('failed');

  final String value;
  const AIGenerationParseResult(this.value);
}

class AIGenerationDiagnostics {
  final String requestId;
  final String promptVersion;
  final String promptSource;
  final String promptFingerprint;
  final String? model;
  final int modelAttempts;
  final int totalLatencyMs;
  final int generationLatencyMs;
  final int parseLatencyMs;
  final int validationLatencyMs;
  final AIGenerationParseResult parseResult;
  final bool? validationPassed;
  final int validationErrorCount;
  final int validationWarningCount;
  final String stage;
  final bool success;
  final String message;

  const AIGenerationDiagnostics({
    required this.requestId,
    required this.promptVersion,
    required this.promptSource,
    required this.promptFingerprint,
    required this.model,
    required this.modelAttempts,
    required this.totalLatencyMs,
    required this.generationLatencyMs,
    required this.parseLatencyMs,
    required this.validationLatencyMs,
    required this.parseResult,
    required this.validationPassed,
    required this.validationErrorCount,
    required this.validationWarningCount,
    required this.stage,
    required this.success,
    required this.message,
  });

  Map<String, dynamic> toJson() {
    return {
      'requestId': requestId,
      'promptVersion': promptVersion,
      'promptSource': promptSource,
      'promptFingerprint': promptFingerprint,
      'model': model,
      'modelAttempts': modelAttempts,
      'latencyMs': {
        'total': totalLatencyMs,
        'generate': generationLatencyMs,
        'parse': parseLatencyMs,
        'validate': validationLatencyMs,
      },
      'parseResult': parseResult.value,
      'validation': {
        'passed': validationPassed,
        'errors': validationErrorCount,
        'warnings': validationWarningCount,
      },
      'stage': stage,
      'success': success,
      'message': message,
    };
  }

  String toSummaryLine() => jsonEncode(toJson());
}

class _ParsedJsonResult {
  final Map<String, dynamic>? json;
  final AIGenerationParseResult result;

  const _ParsedJsonResult({required this.json, required this.result});
}

/// Result returned by [AICourseGenerator.generateCourseAgentViaApi].
///
/// Unlike [GenerationResult], the course is already persisted to the database
/// by the time this is returned — only [courseId] is provided, not a Course object.
class AgentCourseResult {
  const AgentCourseResult({
    required this.success,
    required this.message,
    this.courseId,
    this.lessonCount = 0,
  });

  final bool success;
  final String message;

  /// Supabase UUID of the newly-created course row (null on failure).
  final String? courseId;

  /// Number of lessons generated and saved to the database.
  final int lessonCount;
}
