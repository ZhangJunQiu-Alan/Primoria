import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Result of an AI animation generation request.
class AnimationGenerationResult {
  final String? html;
  final String? error;

  const AnimationGenerationResult({this.html, this.error});

  bool get isSuccess => html != null && error == null;
}

/// AI animation generation service (Gemini API).
///
/// Generates self-contained HTML/CSS/JS animations from natural language
/// descriptions. Reuses the same Gemini infrastructure as [AICourseGenerator].
class AIAnimationGenerator {
  AIAnimationGenerator._();

  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta';
  static const List<String> _modelCandidates = [
    'gemini-2.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro',
  ];
  static const int _maxOutputTokens = 8192;

  static const String _systemPrompt = '''
You are an expert STEM animation engineer. Your task is to generate a single,
self-contained HTML file that visually animates a STEM concept described by the teacher.

STRICT RULES — follow all of these exactly:
1. Output ONLY the raw HTML. No markdown, no code fences, no explanation text.
2. The output must be a complete, valid HTML document (<!DOCTYPE html> ... </html>).
3. All CSS must be inline inside a <style> tag within <head>.
4. All JavaScript must be inline inside a <script> tag (defer or at end of body).
5. NO external resources — no CDN links, no fetch(), no import from URLs.
6. RESPONSIVE SIZING — CRITICAL:
   - Set html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#1a1a2e; }
   - For canvas elements: set width and height in JS using window.innerWidth and window.innerHeight
     (e.g. canvas.width = window.innerWidth; canvas.height = window.innerHeight;)
   - DO NOT use any fixed pixel widths like width:600px. Use 100%, 100vw, 100vh, or window.innerWidth/Height.
   - All element positions must be computed relative to canvas.width / canvas.height, never hardcoded.
7. Use a dark background (#1a1a2e or similar) that contrasts well with animation elements.
8. Prefer canvas-based animations using requestAnimationFrame. Avoid fixed-pixel DOM layouts.
9. If interactive (play/pause, step, slider), add simple controls at the bottom with position:absolute.
10. Make it visually clear and educational — label key parts where helpful.
11. The animation must start automatically on load (call the animation loop immediately).
12. Add a window resize listener that re-sizes canvas and re-initializes layout when the window is resized.

STEM DOMAIN GUIDANCE:
- Physics: show realistic motion, forces, collisions with labels (velocity, force vectors)
- CS/Algorithms: color-code elements, highlight active comparisons/swaps, show step counter
- Math: plot functions with axes and labels, animate curves or geometric transformations
- Data Structures: visualize memory layout, pointers, node connections

Generate ONLY the HTML document. Nothing else.
''';

  static const String _iterationSystemPrompt = '''
You are an expert STEM animation engineer. You will be given an existing HTML animation
and a modification request from a teacher. Update the HTML to fulfill the request.

STRICT RULES:
1. Output ONLY the modified raw HTML document. No markdown, no code fences, no explanation.
2. Preserve the self-contained structure: all CSS inline, all JS inline, no external resources.
3. KEEP responsive sizing: canvas dimensions must use window.innerWidth/innerHeight, not fixed pixels.
4. The animation must still start automatically on load.
5. Apply the teacher's requested changes while keeping the rest of the animation intact.

Output ONLY the updated HTML document. Nothing else.
''';

  /// Generate a new animation from a natural language [prompt].
  ///
  /// Pass [apiKey] (Gemini API key). Optionally pass [previousHtml] to
  /// refine an existing animation instead of generating from scratch.
  static Future<AnimationGenerationResult> generate({
    required String prompt,
    required String apiKey,
    String? previousHtml,
    String? model,
  }) async {
    final isIteration = previousHtml != null && previousHtml.isNotEmpty;
    final systemPrompt =
        isIteration ? _iterationSystemPrompt : _systemPrompt;

    final userMessage = isIteration
        ? 'Current animation HTML:\n\n$previousHtml\n\nTeacher modification request: $prompt'
        : prompt;

    final modelsToTry = model != null
        ? [model, ..._modelCandidates.where((m) => m != model)]
        : _modelCandidates;

    for (final m in modelsToTry) {
      try {
        final result = await _callGemini(
          apiKey: apiKey,
          model: m,
          systemPrompt: systemPrompt,
          userMessage: userMessage,
        );
        if (result != null) return AnimationGenerationResult(html: result);
      } catch (e) {
        debugPrint('[AIAnimationGenerator] Model $m failed: $e');
        continue;
      }
    }

    return const AnimationGenerationResult(
      error: 'All Gemini models failed. Check your API key and network.',
    );
  }

  static Future<String?> _callGemini({
    required String apiKey,
    required String model,
    required String systemPrompt,
    required String userMessage,
  }) async {
    final url = Uri.parse(
      '$_baseUrl/models/$model:generateContent?key=$apiKey',
    );

    final body = jsonEncode({
      'system_instruction': {
        'parts': [
          {'text': systemPrompt},
        ],
      },
      'contents': [
        {
          'role': 'user',
          'parts': [
            {'text': userMessage},
          ],
        },
      ],
      'generationConfig': {
        'maxOutputTokens': _maxOutputTokens,
        'temperature': 0.7,
      },
    });

    final response = await http
        .post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: body,
        )
        .timeout(const Duration(seconds: 60));

    if (response.statusCode != 200) {
      throw Exception('HTTP ${response.statusCode}: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final candidates = json['candidates'] as List<dynamic>?;
    if (candidates == null || candidates.isEmpty) return null;

    final content = candidates[0]['content'] as Map<String, dynamic>?;
    final parts = content?['parts'] as List<dynamic>?;
    if (parts == null || parts.isEmpty) return null;

    final rawText = parts[0]['text'] as String?;
    if (rawText == null || rawText.trim().isEmpty) return null;

    return _extractHtml(rawText.trim());
  }

  /// Strip any accidental markdown code fences the model might add.
  static String _extractHtml(String raw) {
    // Remove ```html ... ``` or ``` ... ``` wrappers
    final fencePattern = RegExp(
      r'^```(?:html)?\s*\n([\s\S]*?)\n```\s*$',
      multiLine: false,
    );
    final match = fencePattern.firstMatch(raw);
    if (match != null) return match.group(1)!.trim();
    return raw;
  }
}
