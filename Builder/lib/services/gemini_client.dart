import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Low-level Gemini HTTP client with LiteLLM-inspired reliability patterns.
///
/// ## LiteLLM Concepts Implemented
///
/// ### 1. Retry (per model)
/// On transient server errors (429, 500-504), the same model is retried up to
/// [maxRetriesPerModel] times with exponential backoff before being abandoned.
/// This handles momentary spikes without immediately giving up.
///
/// ```
/// attempt 1 → fail 429 → wait 500ms
/// attempt 2 → fail 503 → wait 1000ms
/// attempt 3 → success ✓
/// ```
///
/// ### 2. Fallback (across models)
/// If a model exhausts its retries or hits a non-recoverable error (e.g.
/// 404 model-not-found), the client automatically moves to the next model
/// in the [defaultModels] priority list.
///
/// ```
/// gemini-2.5-flash-latest → fail (model unavailable)
/// gemini-2.5-flash        → fail (overloaded)
/// gemini-2.0-flash        → success ✓
/// ```
///
/// ### 3. Load balancing (priority list)
/// [defaultModels] is ordered from fastest/cheapest to most capable.
/// Callers can override the list to implement custom weighting strategies.
/// A future enhancement could add round-robin or weighted random selection.
///
/// ## Usage
///
/// ```dart
/// final response = await GeminiClient.complete(
///   apiKey: myKey,
///   contents: [{'parts': [{'text': 'Hello'}]}],
/// );
/// if (response.success) print(response.text);
/// ```
class GeminiClient {
  GeminiClient._();

  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta';

  /// Default model priority list — ordered from fastest/cheapest to most capable.
  /// GeminiClient will try these in order when fallback is needed.
  static const List<String> defaultModels = [
    'gemini-2.5-pro-latest',
  ];

  /// Max retries per model before falling back to the next one.
  /// Total attempts = models.length × (maxRetriesPerModel + 1) in the worst case.
  static const int maxRetriesPerModel = 2;

  // ─── Status code classification ─────────────────────────────────────────

  /// Transient errors — retry the same model with backoff.
  static const Set<int> _retryOn = {429, 500, 502, 503, 504};

  /// Errors that warrant trying the next model in the fallback list.
  static const Set<int> _fallbackOn = {404, 429, 500, 502, 503, 504};

  // ─── Public API ──────────────────────────────────────────────────────────

  /// Send [contents] to Gemini and return a unified [GeminiResponse].
  ///
  /// [contents] follows the Gemini API format:
  /// ```json
  /// [{"role": "user", "parts": [{"text": "Hello"}]}]
  /// ```
  /// For multimodal (e.g. PDF), include `inlineData` in parts:
  /// ```json
  /// [{"parts": [{"inlineData": {"mimeType": "...", "data": "..."}}, {"text": "..."}]}]
  /// ```
  ///
  /// [models] overrides the default fallback priority list.
  /// Pass `[singleModel]` to disable fallback and target one model only.
  static Future<GeminiResponse> complete({
    required String apiKey,
    required List<Map<String, dynamic>> contents,
    String? systemInstruction,
    String? responseMimeType,
    int maxOutputTokens = 8192,
    double temperature = 0.7,
    Duration timeout = const Duration(seconds: 60),
    List<String>? models,
  }) async {
    final modelList =
        (models != null && models.isNotEmpty) ? models : defaultModels;

    GeminiResponse? last;
    var totalAttempts = 0;

    for (final model in modelList) {
      // ── Retry loop for this model ────────────────────────────────────────
      for (int attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        if (attempt > 0) {
          // Exponential backoff: 500ms → 1000ms
          final delay = Duration(milliseconds: 500 * (1 << (attempt - 1)));
          debugPrint(
            '[GeminiClient] Retry $attempt for $model — waiting ${delay.inMilliseconds}ms',
          );
          await Future<void>.delayed(delay);
        }

        totalAttempts++;
        final response = await _callOnce(
          apiKey: apiKey,
          model: model,
          contents: contents,
          systemInstruction: systemInstruction,
          responseMimeType: responseMimeType,
          maxOutputTokens: maxOutputTokens,
          temperature: temperature,
          timeout: timeout,
        );

        if (response.success || response.truncated) {
          return response.copyWith(attempts: totalAttempts);
        }

        last = response;

        // Stop retrying this model if the error is not transient
        if (!_retryOn.contains(response.statusCode)) break;
      }

      // ── Fallback decision ────────────────────────────────────────────────
      if (last != null && !_canFallback(last)) break;
      debugPrint('[GeminiClient] Falling back from $model to next model');
    }

    return (last ?? const GeminiResponse(success: false, error: 'No models available'))
        .copyWith(attempts: totalAttempts);
  }

  /// Whether [response] allows trying the next model in the fallback list.
  ///
  /// Exposed so callers can make the same decision in domain-level retry loops
  /// (e.g. when a model succeeds HTTP but produces invalid JSON, the caller
  /// can decide whether to try another model).
  static bool canFallback(GeminiResponse response) => _canFallback(response);

  // ─── Internal helpers ────────────────────────────────────────────────────

  static bool _canFallback(GeminiResponse r) {
    final code = r.statusCode;

    // No HTTP code = network/timeout error — worth trying next model
    if (code == null) return true;

    // Standard fallback status codes
    if (_fallbackOn.contains(code)) return true;

    // Model-specific 400/403 (e.g. "model not found", "model not enabled")
    if (code == 400 || code == 403) {
      final msg = (r.error ?? '').toLowerCase();
      final isModelError =
          msg.contains('model') &&
          (msg.contains('not found') ||
              msg.contains('unsupported') ||
              msg.contains('not available') ||
              msg.contains('not enabled'));
      final isPermissionError =
          msg.contains('permission') && msg.contains('model');
      return isModelError || isPermissionError;
    }

    // Auth errors (401) and unrelated client errors (400/403) — stop immediately
    return false;
  }

  static Future<GeminiResponse> _callOnce({
    required String apiKey,
    required String model,
    required List<Map<String, dynamic>> contents,
    String? systemInstruction,
    String? responseMimeType,
    required int maxOutputTokens,
    required double temperature,
    required Duration timeout,
  }) async {
    try {
      final url = Uri.parse(
        '$_baseUrl/models/$model:generateContent?key=$apiKey',
      );

      final body = <String, dynamic>{
        'contents': contents,
        'generationConfig': {
          'temperature': temperature,
          'maxOutputTokens': maxOutputTokens,
          if (responseMimeType != null) 'responseMimeType': responseMimeType,
        },
      };

      if (systemInstruction != null) {
        body['system_instruction'] = {
          'parts': [
            {'text': systemInstruction},
          ],
        };
      }

      final httpResponse = await http
          .post(
            url,
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(timeout);

      if (httpResponse.statusCode != 200) {
        return GeminiResponse(
          success: false,
          error: _parseErrorMessage(httpResponse.body),
          statusCode: httpResponse.statusCode,
          model: model,
        );
      }

      final decoded = jsonDecode(httpResponse.body) as Map<String, dynamic>;
      final truncated = _isMaxTokens(decoded);
      final text = _extractText(decoded);

      if (text == null || text.trim().isEmpty) {
        return GeminiResponse(
          success: false,
          error: 'Model returned empty response',
          statusCode: httpResponse.statusCode,
          model: model,
        );
      }

      // Truncated responses: return with success=false so callers can try repair,
      // but include the partial text so it's not completely lost.
      if (truncated) {
        return GeminiResponse(
          success: false,
          text: text.trim(),
          error: 'MAX_TOKENS: output truncated — try a model with larger context',
          statusCode: httpResponse.statusCode,
          model: model,
          truncated: true,
        );
      }

      return GeminiResponse(
        success: true,
        text: text.trim(),
        statusCode: httpResponse.statusCode,
        model: model,
      );
    } on TimeoutException {
      return GeminiResponse(
        success: false,
        error: 'Request timed out after ${timeout.inSeconds}s',
        model: model,
      );
    } catch (e) {
      return GeminiResponse(
        success: false,
        error: e.toString(),
        model: model,
      );
    }
  }

  static String? _extractText(Map<String, dynamic> body) {
    final candidates = body['candidates'];
    if (candidates is! List || candidates.isEmpty) return null;

    final first = candidates.first;
    if (first is! Map) return null;

    final content = first['content'];
    if (content is! Map) return null;

    final parts = content['parts'];
    if (parts is! List || parts.isEmpty) return null;

    final chunks = <String>[];
    for (final part in parts) {
      if (part is Map) {
        final t = part['text']?.toString().trim();
        if (t != null && t.isNotEmpty) chunks.add(t);
      }
    }
    return chunks.isEmpty ? null : chunks.join('\n');
  }

  static bool _isMaxTokens(Map<String, dynamic> body) {
    final candidates = body['candidates'];
    if (candidates is! List || candidates.isEmpty) return false;
    final first = candidates.first;
    return (first is Map) && first['finishReason'] == 'MAX_TOKENS';
  }

  static String _parseErrorMessage(String body) {
    try {
      final json = jsonDecode(body);
      if (json is Map) {
        final error = json['error'];
        if (error is Map) {
          final msg = error['message']?.toString().trim();
          if (msg != null && msg.isNotEmpty) return msg;
        }
      }
    } catch (_) {}
    return body.isEmpty ? 'Unknown error' : body;
  }
}

/// The result of a [GeminiClient.complete] call.
class GeminiResponse {
  /// Whether the call succeeded and [text] is valid.
  final bool success;

  /// The generated text. Present when [success] is true, and also when
  /// [truncated] is true (partial content that can be used for repair).
  final String? text;

  /// Error message when [success] is false.
  final String? error;

  /// HTTP status code from the last attempted request. Null on network errors.
  final int? statusCode;

  /// The model that produced this response (or was last attempted).
  final String? model;

  /// True when the model hit MAX_TOKENS and the output was cut short.
  /// [text] contains the partial output in this case.
  final bool truncated;

  /// Total HTTP attempts made (across all retries and model fallbacks).
  final int attempts;

  const GeminiResponse({
    required this.success,
    this.text,
    this.error,
    this.statusCode,
    this.model,
    this.truncated = false,
    this.attempts = 1,
  });

  GeminiResponse copyWith({
    bool? success,
    String? text,
    String? error,
    int? statusCode,
    String? model,
    bool? truncated,
    int? attempts,
  }) {
    return GeminiResponse(
      success: success ?? this.success,
      text: text ?? this.text,
      error: error ?? this.error,
      statusCode: statusCode ?? this.statusCode,
      model: model ?? this.model,
      truncated: truncated ?? this.truncated,
      attempts: attempts ?? this.attempts,
    );
  }
}
