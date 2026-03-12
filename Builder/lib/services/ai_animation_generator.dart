import 'gemini_client.dart';

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
/// descriptions. HTTP calls, retry, and model fallback are handled by
/// [GeminiClient].
class AIAnimationGenerator {
  AIAnimationGenerator._();

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
  ///
  /// Retry and model fallback are handled by [GeminiClient].
  static Future<AnimationGenerationResult> generate({
    required String prompt,
    required String apiKey,
    String? previousHtml,
    String? model,
  }) async {
    final isIteration = previousHtml != null && previousHtml.isNotEmpty;
    final systemPrompt = isIteration ? _iterationSystemPrompt : _systemPrompt;
    final userMessage = isIteration
        ? 'Current animation HTML:\n\n$previousHtml\n\nTeacher modification request: $prompt'
        : prompt;

    // When a preferred model is given, put it first; fall back to defaults.
    final models = model != null
        ? [model, ...GeminiClient.defaultModels.where((m) => m != model)]
        : GeminiClient.defaultModels;

    final response = await GeminiClient.complete(
      apiKey: apiKey,
      contents: [
        {
          'role': 'user',
          'parts': [
            {'text': userMessage},
          ],
        },
      ],
      systemInstruction: systemPrompt,
      maxOutputTokens: _maxOutputTokens,
      temperature: 0.7,
      models: models,
    );

    if (!response.success || response.text == null) {
      return AnimationGenerationResult(
        error: response.error ??
            'All Gemini models failed. Check your API key and network.',
      );
    }

    return AnimationGenerationResult(html: _extractHtml(response.text!));
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
