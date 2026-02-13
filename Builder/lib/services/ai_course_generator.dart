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
  static const List<String> _modelCandidates = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-pro-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-latest',
    'gemini-2.0-flash',
  ];
  static const int _maxBlocksPerPage = 20;
  static String? _apiKey;

  /// Set API key
  static void setApiKey(String key) {
    _apiKey = key;
  }

  /// Get current API key
  static String? get apiKey => _apiKey;

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

5) multiple-choice
{"type":"multiple-choice","id":"b5","position":{"order":4},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Question","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"correctAnswer":"a","correctAnswers":["a"],"multiSelect":false,"explanation":"Explanation"}}

6) fill-blank
{"type":"fill-blank","id":"b6","position":{"order":5},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"The CPU stands for ____.","correctAnswer":"Central Processing Unit","hint":"Expand CPU"}}

7) true-false
{"type":"true-false","id":"b7","position":{"order":6},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Statement","correctAnswer":true,"explanation":"Why"}}

8) matching
{"type":"matching","id":"b8","position":{"order":7},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"question":"Match terms","leftItems":[{"id":"l1","text":"A"},{"id":"l2","text":"B"}],"rightItems":[{"id":"r1","text":"1"},{"id":"r2","text":"2"}],"correctPairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"}],"explanation":"Why"}}

9) video
{"type":"video","id":"b9","position":{"order":8},"style":{"spacing":"md","alignment":"left"},"visibilityRule":"always","content":{"url":"https://...","title":"Video title"}}

Course-adaptive block strategy:
- Programming / CS: include code-block + code-playground + conceptual quizzes (multiple-choice / fill-blank / matching / true-false).
- Math / Physics / Engineering: prioritize worked explanations (text), formula understanding checks (fill-blank, true-false), and concept mapping (matching).
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
        final decoded = await _parseJsonObjectWithRepair(
          jsonResult.content!,
          preferredModel: jsonResult.model,
        );
        if (decoded == null) {
          return GenerationResult(
            success: false,
            message: 'Failed to parse course JSON: AI output is not valid JSON',
            rawJson: _extractJson(jsonResult.content!),
          );
        }

        final normalizedJson = _normalizeGeneratedCourseJson(
          decoded,
          fileName: fileName,
        );
        final course = Course.fromJson(normalizedJson);

        return GenerationResult(
          success: true,
          message: jsonResult.model != null
              ? 'Course generated with ${jsonResult.model}'
              : 'Course generated',
          course: course,
          rawJson: jsonEncode(normalizedJson),
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

    _ContentResult? lastFailure;
    for (final model in _modelCandidates) {
      final result = await _generateContentWithModel(
        model: model,
        inlineData: inlineData,
        mimeType: mimeType,
        prompt: prompt,
      );

      if (result.success) return result;
      lastFailure = result;
      if (!_shouldTryNextModel(result)) return result;
    }

    return lastFailure ??
        const _ContentResult(
          success: false,
          message: 'No available Gemini model',
        );
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

  static Future<Map<String, dynamic>?> _parseJsonObjectWithRepair(
    String rawContent, {
    String? preferredModel,
  }) async {
    final parsed = _parseJsonObject(rawContent);
    if (parsed != null) return parsed;

    final repaired = await _repairJsonContent(
      rawContent,
      preferredModel: preferredModel,
    );
    if (repaired == null) return null;

    return _parseJsonObject(repaired);
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
          'maxOutputTokens': 65536,
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
    if (statusCode != 400 && statusCode != 403) return false;

    final message = (result.message ?? '').toLowerCase();
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
  final int? statusCode;
  final String? model;

  const _ContentResult({
    required this.success,
    this.content,
    this.message,
    this.statusCode,
    this.model,
  });
}
