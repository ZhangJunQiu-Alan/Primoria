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
    'gemini-2.0-flash',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro',
  ];
  static const int _maxOutputTokens = 16384;
  static const int _maxBlocksPerLesson = 20;
  static const String _promptVersion = '2026-02-13.ai-course-v1';
  static String? _apiKey;

  /// Set API key manually (optional — [generateCourseAgentLocally] will
  /// auto-fetch from the server if the key has not been set yet).
  static void setApiKey(String key) {
    _apiKey = key;
  }

  /// Get current API key
  static String? get apiKey => _apiKey;
  static String get promptVersion => _promptVersion;

  /// Fetch the Gemini API key from the `get-gemini-key` Edge Function and
  /// cache it in [_apiKey].  Requires an active Supabase session.
  /// Returns null on success, or an error message string on failure.
  static Future<String?> fetchAndCacheApiKey() async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'get-gemini-key',
      );
      final data = response.data;
      debugPrint('[AICourseGenerator] get-gemini-key response: $data');
      if (data is Map && data['success'] == true) {
        final key = data['key']?.toString();
        if (key != null && key.isNotEmpty) {
          _apiKey = key;
          return null; // success
        }
        return 'Server returned empty key';
      }
      final serverError = (data is Map ? data['error']?.toString() : null)
          ?? 'Unexpected response: $data';
      return serverError;
    } on FunctionException catch (e) {
      final detail = e.details?.toString() ?? e.toString();
      debugPrint('[AICourseGenerator] get-gemini-key FunctionException: $detail');
      return 'get-gemini-key error: $detail';
    } catch (e) {
      debugPrint('[AICourseGenerator] get-gemini-key exception: $e');
      return 'get-gemini-key exception: $e';
    }
  }

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
  "lessons": [
    {
      "lessonId": "p1",
      "title": "Lesson title",
      "blocks": [...]
    }
  ]
}

Hard constraints:
- Put all generated blocks into exactly ONE lesson.
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

      final qr = dataMap['qualityReport'] as Map<String, dynamic>?;
      final qualityScore  = (qr?['score'] as num?)?.toInt() ?? 100;
      final qualityPassed = qr?['passed'] as bool? ?? true;
      final rawIssues     = qr?['issues'] as List<dynamic>? ?? [];
      final qualityIssues = rawIssues
          .whereType<Map<String, dynamic>>()
          .map((i) => i['message']?.toString() ?? '')
          .where((s) => s.isNotEmpty)
          .toList();

      return AgentCourseResult(
        success:       true,
        message:       'Course generated successfully',
        courseId:      dataMap['courseId']?.toString(),
        lessonCount:   (dataMap['lessonCount'] as num?)?.toInt() ?? 0,
        qualityScore:  qualityScore,
        qualityPassed: qualityPassed,
        qualityIssues: qualityIssues,
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

  /// Enhance an existing AI-generated course in the database.
  ///
  /// [type] is either `'add-interactive'` (re-generate lessons that have no
  /// interactive blocks) or `'add-final-quiz'` (append a new quiz lesson).
  static Future<EnhanceCourseResult> enhanceCourseViaApi({
    required String courseId,
    required String type,
  }) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'ai-enhance-course',
        body: {'courseId': courseId, 'type': type},
      );

      final data = response.data;
      if (data == null) {
        return const EnhanceCourseResult(
          success: false,
          message: 'No response from server',
        );
      }

      final dataMap = data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data as Map);

      if (dataMap['success'] != true) {
        return EnhanceCourseResult(
          success: false,
          message: dataMap['error']?.toString() ?? 'Enhancement failed',
        );
      }

      return EnhanceCourseResult(
        success: true,
        message: dataMap['message']?.toString() ?? 'Done',
      );
    } on FunctionException catch (e) {
      return EnhanceCourseResult(
        success: false,
        message: 'Server error: ${e.details ?? e}',
      );
    } catch (e) {
      return EnhanceCourseResult(success: false, message: 'Error: $e');
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
    double temperature = 0.0,
    int? maxOutputTokens,
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
          'temperature': temperature,
          'maxOutputTokens': maxOutputTokens ?? _maxOutputTokens,
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
      final finishReason = _asString(candidate['finishReason']);
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

      if (finishReason == 'MAX_TOKENS') {
        return _ContentResult(
          success: false,
          message: 'MAX_TOKENS: output truncated by $model — try a model with larger context',
          statusCode: response.statusCode,
          model: model,
          truncated: true,
          partialContent: content,
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

  static bool _isHighDemandError(String? message) {
    final msg = (message ?? '').toLowerCase();
    return msg.contains('high demand') ||
        msg.contains('resource_exhausted') ||
        msg.contains('resource exhausted') ||
        msg.contains('overloaded') ||
        msg.contains('503');
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
    // Accept both 'lessons' (new) and 'pages' (legacy) key from AI output
    final lessons = _normalizeLessons(normalized['lessons'] ?? normalized['pages']);

    normalized['courseId'] = _normalizeCourseId(normalized['courseId']);
    normalized['metadata'] = metadata;
    normalized['lessons'] = lessons;
    normalized.remove('pages');
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

  static List<Map<String, dynamic>> _normalizeLessons(dynamic rawLessons) {
    final rawLessonList = rawLessons is List ? rawLessons : const [];
    final allRawBlocks = <Map<String, dynamic>>[];
    String? firstLessonTitle;

    for (final rawLesson in rawLessonList) {
      final lesson = _mapFromDynamic(rawLesson);
      final title = _asString(lesson['title'])?.trim();
      if (firstLessonTitle == null && title != null && title.isNotEmpty) {
        firstLessonTitle = title;
      }

      final blocks = lesson['blocks'];
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
        'lessonId': 'p1',
        'title': firstLessonTitle ?? 'Generated Content',
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
      if (normalized.length >= _maxBlocksPerLesson) break;

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

  // ── Local agentic generation (no Edge Function) ──────────────────────────

  static const String _planSystemPrompt =
      'You are an expert instructional designer for Primoria, an interactive STEM learning platform.\n'
      'Given a course description, produce a structured course plan JSON.\n\n'
      'Return JSON only. Do not output markdown, code fences, or explanations.\n'
      'All strings must use double quotes.\n\n'
      'Required JSON structure (exact schema — do NOT add or remove fields):\n'
      '{\n'
      '  "schema_version": "plan-1.0",\n'
      '  "course": {\n'
      '    "title": "Course title",\n'
      '    "description": "2-3 sentence description of what students will learn",\n'
      '    "subject": "<exactly one of the 8 allowed subjects>",\n'
      '    "difficulty": "beginner",\n'
      '    "target_audience": "Who this course is designed for",\n'
      '    "estimated_total_minutes": 90,\n'
      '    "tags": ["tag1", "tag2", "tag3"],\n'
      '    "animation_style": "minimal",\n'
      '    "language": "zh"\n'
      '  },\n'
      '  "lessons": [\n'
      '    {\n'
      '      "order": 1,\n'
      '      "title": "Lesson title",\n'
      '      "objective": "By the end of this lesson, students will be able to...",\n'
      '      "key_points": ["concept1", "concept2", "concept3"],\n'
      '      "type": "interactive",\n'
      '      "estimated_minutes": 15,\n'
      '      "xp_reward": 50\n'
      '    }\n'
      '  ]\n'
      '}\n\n'
      'Hard constraints:\n'
      '- subject must be exactly one of: "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Engineering", "Data Science & AI", "Earth & Space Science"\n'
      '- difficulty must be exactly one of: beginner, intermediate, advanced\n'
      '- animation_style must be exactly one of: cartoon, minimal, realistic\n'
      '- language must be exactly one of: zh, en\n'
      '- lesson.type must be exactly one of: interactive, quiz, video, article; most lessons should be "interactive"\n'
      '- Generate 3-8 lessons. Use 3-4 for short/focused topics, 5-8 for rich/broad topics.\n'
      '- Each lesson must have exactly 3-6 key_points (strings).\n'
      '- lesson.order starts at 1 and must be consecutive (1, 2, 3 …).\n'
      '- lesson.estimated_minutes must be between 10 and 30.\n'
      '- lesson.xp_reward must be between 30 and 100; longer or harder lessons earn more.\n'
      '- estimated_total_minutes must equal the sum of all lesson estimated_minutes.\n'
      '- Lessons must be in a logical learning sequence: fundamentals first, advanced concepts last.';

  static const String _blockTypeReference =
      'Allowed block types and exact JSON format:\n\n'
      '1) text\n'
      '{"type":"text","id":"b0","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"content":{"format":"markdown","value":"## Heading\\n\\nParagraph text."}}\n\n'
      '2) image\n'
      '{"type":"image","id":"b1","position":{"order":1},"style":{"spacing":"md","alignment":"center"},"content":{"url":"https://example.com/img.png","alt":"Alt text","caption":"Caption"}}\n\n'
      '3) code-block  (read-only display)\n'
      '{"type":"code-block","id":"b2","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","code":"x = 1\\nprint(x)"}}\n\n'
      '4) code-playground  (editable + runnable)\n'
      '{"type":"code-playground","id":"b3","position":{"order":3},"style":{"spacing":"md","alignment":"left"},"content":{"language":"python","initialCode":"# fill in the blank\\nresult = ___\\nprint(result)","expectedOutput":"2","hints":["Use the + operator"],"runnable":true}}\n\n'
      '5) multiple-choice\n'
      '{"type":"multiple-choice","id":"b4","position":{"order":4},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Question text?","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation."}}\n\n'
      '6) fill-blank\n'
      '{"type":"fill-blank","id":"b5","position":{"order":5},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Python uses ___ to print output.","correctAnswer":"print","hint":"It is a built-in function"}}\n\n'
      '7) true-false\n'
      '{"type":"true-false","id":"b6","position":{"order":6},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Python is a compiled language.","correctAnswer":false,"explanation":"Python is interpreted."}}\n\n'
      '8) matching\n'
      '{"type":"matching","id":"b7","position":{"order":7},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Match each term to its meaning.","leftItems":[{"id":"l1","text":"variable"},{"id":"l2","text":"function"}],"rightItems":[{"id":"r1","text":"stores a value"},{"id":"r2","text":"reusable block of code"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}],"explanation":"Explanation."}}\n\n'
      '9) video\n'
      '{"type":"video","id":"b8","position":{"order":8},"style":{"spacing":"md","alignment":"center"},"content":{"url":"https://example.com/video.mp4","title":"Video title"}}';

  static String _buildPlanPrompt(
    String description,
    String difficulty,
    String animationStyle,
    String language,
  ) {
    return '$_planSystemPrompt\n\n'
        'User course request:\n'
        '"${description.trim()}"\n\n'
        'Honour these user preferences:\n'
        '- Difficulty level: $difficulty\n'
        '- Animation style: $animationStyle\n'
        '- Content language: $language (write all titles, descriptions, objectives, and key_points in this language)';
  }

  static String _buildLessonBlocksPrompt(
    Map<String, dynamic> lessonPlan,
    Map<String, dynamic> courseContext,
  ) {
    final keyPoints = lessonPlan['key_points'] as List? ?? [];
    final keyPointsList = keyPoints
        .asMap()
        .entries
        .map((e) => '  ${e.key + 1}. ${e.value}')
        .join('\n');

    final animStyle =
        courseContext['animation_style'] as String? ?? 'minimal';
    final String animationHint;
    if (animStyle == 'cartoon') {
      animationHint =
          'Prefer visual, animated, and playful examples. Use animation blocks where they help.';
    } else if (animStyle == 'realistic') {
      animationHint =
          'Use realistic, professional examples. Include video or image blocks when they add clarity.';
    } else {
      animationHint =
          'Keep content clean and minimal. Prefer text, code, and quiz blocks over decorative elements.';
    }

    final subject = courseContext['subject'] as String? ?? '';
    final lessonType = lessonPlan['type'] as String? ?? 'interactive';
    final String subjectHint;
    if (lessonType == 'quiz') {
      subjectHint =
          '- This is a quiz lesson: use mostly multiple-choice, fill-blank, true-false, and matching blocks. Minimal or no text blocks.';
    } else if (subject == 'Computer Science' ||
        subject == 'Engineering' ||
        subject == 'Data Science & AI') {
      subjectHint =
          '- Include at least 1 code-block (display) and 1 code-playground (practice) if the key concepts involve code.';
    } else if (subject == 'Mathematics' || subject == 'Physics') {
      subjectHint =
          '- Use text for worked examples, fill-blank for formula checks, and true-false for conceptual verification.';
    } else {
      subjectHint =
          '- Prefer text + multiple-choice + fill-blank. Add matching for terminology lessons.';
    }

    return 'You are an expert instructional designer for Primoria, an interactive STEM learning platform.\n'
        'Generate content blocks for ONE lesson. Return JSON only — no markdown, no code fences, no explanations.\n\n'
        'Output structure (exact — do NOT add or remove top-level keys):\n'
        '{\n'
        '  "lessonTitle": "<lesson title>",\n'
        '  "blocks": [ /* array of block objects */ ]\n'
        '}\n\n'
        '═══ COURSE CONTEXT ═══\n'
        'Course title:    ${courseContext['title']}\n'
        'Subject:         ${courseContext['subject']}\n'
        'Difficulty:      ${courseContext['difficulty']}\n'
        'Target audience: ${courseContext['target_audience']}\n'
        'Animation style: $animStyle — $animationHint\n'
        'Language:        ${courseContext['language']} ← write ALL content (titles, text, questions, hints, explanations) in this language\n\n'
        '═══ THIS LESSON ═══\n'
        'Title:     ${lessonPlan['title']}\n'
        'Objective: ${lessonPlan['objective']}\n'
        'Key concepts to cover:\n'
        '$keyPointsList\n\n'
        '═══ HARD CONSTRAINTS ═══\n'
        '- Generate 4-8 blocks. Do NOT exceed 8.\n'
        '- Must include at least 2 interactive blocks (code-playground, multiple-choice, fill-blank, true-false, or matching).\n'
        '- Rhythm: introduce concept → show example → practice (at least one interactive block after every 1-2 concept blocks).\n'
        '- All block IDs must be unique (use simple names like b0, b1, b2 … — they will be prefixed automatically).\n'
        '- position.order is 0-based and continuous within this lesson.\n'
        '- Write ALL text, question, answer, hint, and explanation content in the specified language.\n'
        '- Keep text blocks very concise: ≤ 2 sentences each. Prioritise quality over quantity.\n'
        '- If no real image/video URL is available, use text or quiz blocks instead of fake URLs.\n'
        '$subjectHint\n\n'
        '$_blockTypeReference';
  }

  static String? _validatePlanJsonLocal(Map<String, dynamic> plan) {
    const validSubjects = {
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Computer Science',
      'Engineering',
      'Data Science & AI',
      'Earth & Space Science',
    };
    const validDifficulties = {'beginner', 'intermediate', 'advanced'};
    const validAnimStyles = {'cartoon', 'minimal', 'realistic'};
    const validLanguages = {'zh', 'en'};

    if (plan['schema_version'] != 'plan-1.0') {
      return 'schema_version must be "plan-1.0"';
    }
    final course = plan['course'];
    if (course is! Map) return 'course object is required';
    final c = _mapFromDynamic(course);
    if ((c['title'] as String? ?? '').trim().isEmpty) {
      return 'course.title is required';
    }
    if (!validSubjects.contains(c['subject'])) {
      return 'invalid course.subject: ${c['subject']}';
    }
    if (!validDifficulties.contains(c['difficulty'])) {
      return 'invalid course.difficulty: ${c['difficulty']}';
    }
    if (!validAnimStyles.contains(c['animation_style'])) {
      return 'invalid course.animation_style: ${c['animation_style']}';
    }
    if (!validLanguages.contains(c['language'])) {
      return 'invalid course.language: ${c['language']}';
    }
    final lessons = plan['lessons'];
    if (lessons is! List || lessons.isEmpty) return 'lessons array is empty';
    if (lessons.length < 2 || lessons.length > 8) {
      return 'lessons count must be 2-8, got ${lessons.length}';
    }
    for (int i = 0; i < lessons.length; i++) {
      final l = _mapFromDynamic(lessons[i]);
      if ((l['title'] as String? ?? '').trim().isEmpty) {
        return 'lessons[$i].title is required';
      }
      if ((l['objective'] as String? ?? '').trim().isEmpty) {
        return 'lessons[$i].objective is required';
      }
      final kp = l['key_points'];
      if (kp is! List || kp.length < 2) {
        return 'lessons[$i].key_points must have ≥ 2 items';
      }
    }
    return null;
  }

  static String? _validateLessonBlocksLocal(Map<String, dynamic> lesson) {
    if ((lesson['lessonTitle'] as String? ?? '').trim().isEmpty) {
      return 'lessonTitle is required';
    }
    final blocks = lesson['blocks'];
    if (blocks is! List || blocks.isEmpty) return 'blocks array is empty';
    if (blocks.length < 2 || blocks.length > 15) {
      return 'blocks count must be 2-15, got ${blocks.length}';
    }
    const interactiveTypes = {
      'code-playground',
      'multiple-choice',
      'fill-blank',
      'true-false',
      'matching',
    };
    var interactiveCount = 0;
    for (final b in blocks) {
      if (b is! Map) return 'each block must be an object';
      final block = _mapFromDynamic(b);
      if ((block['id'] as String? ?? '').trim().isEmpty) {
        return 'block.id is required';
      }
      if ((block['type'] as String? ?? '').trim().isEmpty) {
        return 'block.type is required';
      }
      if (interactiveTypes.contains(block['type'])) interactiveCount++;
    }
    if (interactiveCount < 1) {
      return 'lesson needs at least 1 interactive block';
    }
    return null;
  }

  static List<Map<String, dynamic>> _prefixBlockIdsLocal(
    List<dynamic> blocks,
    int lessonOrder,
  ) {
    final prefix = 'l$lessonOrder-';
    return blocks.map((b) {
      final block = Map<String, dynamic>.from(_mapFromDynamic(b));
      block['id'] = '$prefix${block['id'] ?? 'b'}';

      if (block['type'] == 'matching') {
        final content =
            Map<String, dynamic>.from(_mapFromDynamic(block['content']));
        if (content['leftItems'] is List) {
          content['leftItems'] = (content['leftItems'] as List).map((item) {
            final m = Map<String, dynamic>.from(_mapFromDynamic(item));
            m['id'] = '$prefix${m['id']}';
            return m;
          }).toList();
        }
        if (content['rightItems'] is List) {
          content['rightItems'] = (content['rightItems'] as List).map((item) {
            final m = Map<String, dynamic>.from(_mapFromDynamic(item));
            m['id'] = '$prefix${m['id']}';
            return m;
          }).toList();
        }
        if (content['correctPairs'] is List) {
          content['correctPairs'] =
              (content['correctPairs'] as List).map((pair) {
            final m = Map<String, dynamic>.from(_mapFromDynamic(pair));
            m['leftId'] = '$prefix${m['leftId']}';
            m['rightId'] = '$prefix${m['rightId']}';
            return m;
          }).toList();
        }
        block['content'] = content;
      }

      if (block['type'] == 'multiple-choice') {
        final content =
            Map<String, dynamic>.from(_mapFromDynamic(block['content']));
        if (content['options'] is List) {
          content['options'] = (content['options'] as List).map((opt) {
            final m = Map<String, dynamic>.from(_mapFromDynamic(opt));
            m['id'] = '$prefix${m['id']}';
            return m;
          }).toList();
        }
        if (content['correctAnswer'] is String) {
          content['correctAnswer'] = '$prefix${content['correctAnswer']}';
        }
        if (content['correctAnswers'] is List) {
          content['correctAnswers'] =
              (content['correctAnswers'] as List).map((id) => '$prefix$id').toList();
        }
        block['content'] = content;
      }

      return block;
    }).toList();
  }

  static String _agenticToSlug(String title) {
    final ascii = title.replaceAll(RegExp(r'[^\x00-\x7F]'), '').trim();
    final base = ascii.isNotEmpty
        ? ascii
              .toLowerCase()
              .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
              .replaceAll(RegExp(r'^-|-$'), '')
        : 'course';
    return '${base.isEmpty ? 'course' : base}-${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';
  }

  static Future<String> _writeAgenticCourseToDb({
    required Map<String, dynamic> planJson,
    required List<Map<String, dynamic>> lessonJsons,
    required String userId,
  }) async {
    final client = Supabase.instance.client;
    final course = _mapFromDynamic(planJson['course']);

    String? subjectId;
    try {
      final subjectData = await client
          .from('subjects')
          .select('id')
          .eq('name', course['subject'] as String)
          .maybeSingle();
      subjectId = (subjectData)?['id']?.toString();
    } catch (_) {}

    final courseRow = await client
        .from('courses')
        .insert({
          'author_id': userId,
          if (subjectId != null) 'subject_id': subjectId,
          'title': course['title'],
          'slug': _agenticToSlug(course['title'].toString()),
          'description': course['description'] ?? '',
          'difficulty_level': course['difficulty'] ?? 'beginner',
          'estimated_minutes': course['estimated_total_minutes'] ?? 30,
          'tags': course['tags'] ?? [],
          'animation_style': course['animation_style'] ?? 'minimal',
          'content_language': course['language'] ?? 'zh',
          'planning_json': planJson,
          'status': 'draft',
        })
        .select('id')
        .single();

    final courseId = courseRow['id'] as String;

    final lessons = planJson['lessons'] as List? ?? [];
    const validTypes = {'interactive', 'quiz', 'video', 'article'};
    final lessonRows = List.generate(lessons.length, (i) {
      final l = _mapFromDynamic(lessons[i]);
      final lessonType = l['type'] as String? ?? 'interactive';
      final blocks =
          i < lessonJsons.length
              ? (lessonJsons[i]['blocks'] as List? ?? [])
              : [];
      return {
        'course_id': courseId,
        'title': l['title'] ?? 'Untitled',
        'type': validTypes.contains(lessonType) ? lessonType : 'interactive',
        'sort_key': ((l['order'] as num?)?.toInt() ?? (i + 1)) * 1000,
        'xp_reward': (l['xp_reward'] as num?)?.toInt() ?? 50,
        'duration_seconds':
            ((l['estimated_minutes'] as num?)?.toInt() ?? 15) * 60,
        'is_locked': ((l['order'] as num?)?.toInt() ?? (i + 1)) > 1,
        'content_json': {'blocks': blocks},
      };
    });

    await client.from('lessons').insert(lessonRows);
    return courseId;
  }

  /// Compact variant of [_buildLessonBlocksPrompt] used in retry rounds to
  /// reduce output size and avoid MAX_TOKENS truncation.
  static String _buildLessonBlocksPromptCompact(
    Map<String, dynamic> lessonPlan,
    Map<String, dynamic> courseContext,
  ) {
    final keyPoints = lessonPlan['key_points'] as List? ?? [];
    final keyPointsList = keyPoints
        .asMap()
        .entries
        .map((e) => '  ${e.key + 1}. ${e.value}')
        .join('\n');
    return 'You are an expert instructional designer. Generate content blocks '
        'for ONE lesson as compact JSON.\n\n'
        'Output structure:\n'
        '{"lessonTitle":"<title>","blocks":[...]}\n\n'
        'Lesson: ${lessonPlan['title']}\n'
        'Key concepts:\n$keyPointsList\n'
        'Language: ${courseContext['language']}\n\n'
        'STRICT RULES:\n'
        '- Exactly 4-6 blocks. No more.\n'
        '- Include at least 1 interactive block (multiple-choice, fill-blank, or true-false).\n'
        '- Use ONLY text and multiple-choice blocks if unsure (simplest schema).\n'
        '- All block IDs unique (b0, b1, …).\n'
        '- Write all content in the specified language.\n\n'
        'Allowed block types (minimal reference):\n'
        '{"type":"text","id":"b0","position":{"order":0},"style":{"spacing":"md","alignment":"left"},"content":{"format":"markdown","value":"content"}}\n'
        '{"type":"multiple-choice","id":"b1","position":{"order":1},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Q?","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Why."}}\n'
        '{"type":"fill-blank","id":"b2","position":{"order":2},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Sentence with ___.","correctAnswer":"answer","hint":"hint"}}\n'
        '{"type":"true-false","id":"b3","position":{"order":3},"style":{"spacing":"md","alignment":"left"},"content":{"question":"Statement.","correctAnswer":true,"explanation":"Why."}}';
  }

  /// Builds a minimal placeholder lesson for when all AI models fail.
  /// This ensures the course can still be saved and opened in the Builder.
  static Map<String, dynamic> _buildFallbackLesson(
    String title,
    int lessonOrder,
  ) {
    final prefix = 'l$lessonOrder-';
    return {
      'lessonTitle': title,
      'blocks': [
        {
          'type': 'text',
          'id': '${prefix}b0',
          'position': {'order': 0},
          'style': {'spacing': 'md', 'alignment': 'left'},
          'content': {
            'format': 'markdown',
            'value': '## $title\n\n*Content for this lesson could not be '
                'generated automatically. Please edit this lesson in the '
                'Builder to add your content.*',
          },
        },
        {
          'type': 'multiple-choice',
          'id': '${prefix}b1',
          'position': {'order': 1},
          'style': {'spacing': 'md', 'alignment': 'left'},
          'content': {
            'question': 'What did you learn in this lesson?',
            'options': [
              {'id': '${prefix}a', 'text': 'Option A'},
              {'id': '${prefix}b', 'text': 'Option B'},
              {'id': '${prefix}c', 'text': 'Option C'},
            ],
            'correctAnswer': '${prefix}a',
            'correctAnswers': ['${prefix}a'],
            'multiSelect': false,
            'explanation': 'Please update this question with real content.',
          },
        },
      ],
    };
  }

  /// Agentic course generation — runs entirely on the client via direct
  /// Gemini API calls. No Supabase Edge Function, no server-side timeout.
  ///
  /// Stages:
  ///   1. Plan course    — one Gemini call, produces lesson outline
  ///   2. Generate blocks — one Gemini call per lesson
  ///   3. DB write       — inserts courses + lessons rows directly
  ///
  /// [onProgress] receives (stageLabel, 0.0–1.0) after each sub-step.
  static Future<AgentCourseResult> generateCourseAgentLocally({
    required String description,
    String difficulty = 'beginner',
    String animationStyle = 'minimal',
    String language = 'zh',
    void Function(String stage, double progress)? onProgress,
  }) async {
    if (description.trim().isEmpty) {
      return const AgentCourseResult(
        success: false,
        message: 'Course description must not be empty',
      );
    }

    try {
      // ── Auto-fetch API key if not already cached ──────────────────
      if (_apiKey == null || _apiKey!.isEmpty) {
        onProgress?.call('init', 0.02);
        final fetchError = await fetchAndCacheApiKey();
        if (fetchError != null) {
          return AgentCourseResult(
            success: false,
            message: '获取 AI 服务配置失败：$fetchError',
          );
        }
      }

      // ── Stage 1: Plan course ──────────────────────────────────────
      onProgress?.call('plan', 0.05);
      final planPrompt =
          _buildPlanPrompt(description, difficulty, animationStyle, language);

      Map<String, dynamic>? planJson;
      String? planError;
      for (final model in _modelCandidates) {
        final result = await _generateTextWithModel(
          model: model,
          prompt: planPrompt,
          temperature: 0.4,
          maxOutputTokens: 8192,
        );
        if (!result.success) {
          planError = result.message;
          if (!_shouldTryNextModel(result)) break;
          if (_isHighDemandError(result.message)) {
            await Future.delayed(const Duration(seconds: 2));
          }
          continue;
        }
        final parsed = _parseJsonObject(result.content!);
        if (parsed == null) {
          planError = 'Could not parse plan JSON from $model';
          continue;
        }
        final validErr = _validatePlanJsonLocal(parsed);
        if (validErr != null) {
          planError = 'Plan validation ($model): $validErr';
          continue;
        }
        planJson = parsed;
        break;
      }

      if (planJson == null) {
        return AgentCourseResult(
          success: false,
          message:
              'Course planning failed: ${planError ?? "No model succeeded"}',
        );
      }
      onProgress?.call('plan', 0.15);

      // ── Stage 2: Generate blocks per lesson ───────────────────────
      final lessons = planJson['lessons'] as List? ?? [];
      final planCourse = _mapFromDynamic(planJson['course']);
      final courseCtx = <String, dynamic>{
        'title': planCourse['title'] ?? '',
        'subject': planCourse['subject'] ?? '',
        'difficulty': planCourse['difficulty'] ?? difficulty,
        'target_audience': planCourse['target_audience'] ?? '',
        'animation_style': planCourse['animation_style'] ?? animationStyle,
        'language': planCourse['language'] ?? language,
      };

      final lessonJsons = <Map<String, dynamic>>[];
      for (int i = 0; i < lessons.length; i++) {
        final lesson = _mapFromDynamic(lessons[i]);
        final lessonOrder = (lesson['order'] as num?)?.toInt() ?? (i + 1);
        final progress = 0.15 + (i / lessons.length) * 0.70;
        onProgress?.call('blocks', progress);

        final lessonPrompt = _buildLessonBlocksPrompt(lesson, courseCtx);
        Map<String, dynamic>? lessonJson;
        String? lessonError;

        // Up to 3 full rounds through the model list (with backoff between rounds)
        const maxRounds = 3;
        for (int round = 0; round < maxRounds && lessonJson == null; round++) {
          if (round > 0) {
            // Exponential backoff between full rounds: 5s, 10s
            await Future.delayed(Duration(seconds: 5 * round));
          }
          // Round 2+: use a more compact prompt (fewer blocks) to avoid truncation
          final roundPrompt = round > 0
              ? _buildLessonBlocksPromptCompact(lesson, courseCtx)
              : lessonPrompt;
          final roundTokens = round > 0 ? 8192 : 12288;
          for (final model in _modelCandidates) {
            final result = await _generateTextWithModel(
              model: model,
              prompt: roundPrompt,
              temperature: 0.3,
              maxOutputTokens: roundTokens,
            );
            if (!result.success) {
              lessonError = result.message;
              // On truncation: try repair on partial content before moving on
              if (result.truncated && result.partialContent != null) {
                final repaired = await _repairJsonContent(
                  result.partialContent!,
                  preferredModel: model,
                );
                if (repaired != null) {
                  final parsed = _parseJsonObject(repaired);
                  if (parsed != null) {
                    final validErr = _validateLessonBlocksLocal(parsed);
                    if (validErr == null) {
                      final prefixed = Map<String, dynamic>.from(parsed);
                      prefixed['blocks'] = _prefixBlockIdsLocal(
                        parsed['blocks'] as List? ?? [],
                        lessonOrder,
                      );
                      lessonJson = prefixed;
                      break;
                    }
                  }
                }
              }
              if (!_shouldTryNextModel(result)) break;
              if (_isHighDemandError(result.message)) {
                await Future.delayed(const Duration(seconds: 2));
              }
              continue;
            }
            // Try to parse; if that fails, attempt AI-assisted repair once
            Map<String, dynamic>? parsed = _parseJsonObject(result.content!);
            if (parsed == null) {
              final repaired = await _repairJsonContent(
                result.content!,
                preferredModel: model,
              );
              if (repaired != null) parsed = _parseJsonObject(repaired);
            }
            if (parsed == null) {
              lessonError = 'Could not parse lesson JSON from $model';
              continue;
            }
            final validErr = _validateLessonBlocksLocal(parsed);
            if (validErr != null) {
              lessonError = 'Lesson ${i + 1} validation ($model): $validErr';
              continue;
            }
            final prefixed = Map<String, dynamic>.from(parsed);
            prefixed['blocks'] = _prefixBlockIdsLocal(
              parsed['blocks'] as List? ?? [],
              lessonOrder,
            );
            lessonJson = prefixed;
            break;
          }
        }

        // Graceful fallback: if all models failed, create a minimal placeholder
        // lesson so the rest of the course can still be saved.
        if (lessonJson == null) {
          debugPrint(
            '[AICourseGenerator] Lesson ${i + 1} failed after all retries '
            '(${lessonError ?? "unknown error"}). Using placeholder.',
          );
          final lessonTitle =
              (lesson['title'] as String? ?? 'Lesson ${i + 1}').trim();
          lessonJson = _buildFallbackLesson(lessonTitle, lessonOrder);
        }
        lessonJsons.add(lessonJson);
      }

      onProgress?.call('db', 0.88);

      // ── Stage 3: Write to DB ──────────────────────────────────────
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        return const AgentCourseResult(
          success: false,
          message: 'Not authenticated — please sign in',
        );
      }

      final courseId = await _writeAgenticCourseToDb(
        planJson: planJson,
        lessonJsons: lessonJsons,
        userId: userId,
      );

      onProgress?.call('done', 1.0);
      return AgentCourseResult(
        success: true,
        message: 'Course generated successfully',
        courseId: courseId,
        lessonCount: lessonJsons.length,
      );
    } catch (e) {
      return AgentCourseResult(success: false, message: 'Error: $e');
    }
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
  /// True when the model hit MAX_TOKENS and output was cut mid-JSON.
  final bool truncated;
  /// The partial (unparseable) content from a truncated response.
  final String? partialContent;

  const _ContentResult({
    required this.success,
    this.content,
    this.message,
    this.statusCode,
    this.model,
    this.attemptCount,
    this.latencyMs,
    this.truncated = false,
    this.partialContent,
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
    this.qualityScore = 100,
    this.qualityPassed = true,
    this.qualityIssues = const [],
  });

  final bool success;
  final String message;

  /// Supabase UUID of the newly-created course row (null on failure).
  final String? courseId;

  /// Number of lessons generated and saved to the database.
  final int lessonCount;

  /// Quality score from the server-side quality check (0–100).
  final int qualityScore;

  /// Whether the quality check passed (score ≥ 80).
  final bool qualityPassed;

  /// Human-readable descriptions of quality issues (empty if none).
  final List<String> qualityIssues;
}

/// Result returned by [AICourseGenerator.enhanceCourseViaApi].
class EnhanceCourseResult {
  const EnhanceCourseResult({
    required this.success,
    required this.message,
  });

  final bool success;
  final String message;
}
