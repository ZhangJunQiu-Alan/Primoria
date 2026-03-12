import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'supabase_service.dart';

// ─── LiteLLM-inspired Gemini client (Viewer) ────────────────────────────────
//
// Implements the same retry + fallback pattern as Builder's GeminiClient:
//
//  Retry   — on 429/5xx, wait with exponential backoff and retry the same model.
//  Fallback — if a model exhausts retries, try the next one in [_fallbackModels].
//
// Both patterns reduce reliance on a single model and smooth over transient
// provider outages without any change to the calling code.

class GeminiService {
  GeminiService._();

  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta';

  static const String _apiKeyFromDefine = String.fromEnvironment(
    'GEMINI_API_KEY',
  );

  /// Primary model (from compile-time define or defaults to fast flash).
  static const String _primaryModel = String.fromEnvironment(
    'GEMINI_MODEL',
    defaultValue: 'gemini-2.0-flash',
  );

  /// Fallback priority list — tried in order if [_primaryModel] fails.
  static const List<String> _fallbackModels = [
    'gemini-2.5-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro',
  ];

  /// Status codes that trigger a retry on the same model.
  static const Set<int> _retryOn = {429, 500, 502, 503, 504};

  /// Status codes that trigger fallback to the next model.
  static const Set<int> _fallbackOn = {404, 429, 500, 502, 503, 504};

  static const String _storageApiKey = 'gemini_api_key';

  static String _runtimeApiKey = '';
  static Future<void>? _bootstrapFuture;
  static bool _didBootstrap = false;

  static String get _activeApiKey {
    final defined = _apiKeyFromDefine.trim();
    if (defined.isNotEmpty) return defined;
    return _runtimeApiKey.trim();
  }

  static bool get isConfigured => _activeApiKey.isNotEmpty;

  static Future<void> initialize() async {
    if (_didBootstrap || _apiKeyFromDefine.trim().isNotEmpty) return;

    _bootstrapFuture ??= _bootstrap();
    await _bootstrapFuture;
  }

  static Future<bool> ensureConfigured() async {
    await initialize();
    return isConfigured;
  }

  static Future<void> setApiKey(String apiKey, {bool persist = true}) async {
    final normalized = apiKey.trim();
    if (normalized.isEmpty) return;

    _runtimeApiKey = normalized;
    _didBootstrap = true;

    if (!persist || _apiKeyFromDefine.trim().isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageApiKey, normalized);
  }

  static Future<void> _bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageApiKey)?.trim() ?? '';
      if (saved.isNotEmpty) {
        _runtimeApiKey = saved;
        return;
      }

      await _loadApiKeyFromSupabase();
    } finally {
      _didBootstrap = true;
      _bootstrapFuture = null;
    }
  }

  static Future<void> _loadApiKeyFromSupabase() async {
    if (SupabaseService.currentUser == null) return;

    try {
      final response = await SupabaseService.client.functions.invoke(
        'get-gemini-key',
      );
      final data = response.data;
      if (data is! Map) return;

      final success = data['success'] == true;
      final key = data['key']?.toString().trim() ?? '';
      if (!success || key.isEmpty) return;

      _runtimeApiKey = key;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageApiKey, key);
    } catch (_) {
      // Best effort fallback. The UI will still show clear next-step guidance.
    }
  }

  /// Generate a tutor reply for [history].
  ///
  /// Applies LiteLLM-inspired retry + fallback:
  ///  - Retries the same model up to 2× on 429/5xx with exponential backoff.
  ///  - Falls back to the next model in [_fallbackModels] when a model fails.
  static Future<String> generateReply({
    required List<GeminiMessage> history,
  }) async {
    await initialize();

    if (!isConfigured) {
      throw const GeminiServiceException(
        'Gemini API key is missing. Launch with '
        '--dart-define=GEMINI_API_KEY=your_key',
      );
    }

    const systemText =
        'You are Primoria AI Tutor. Be concise, clear, and helpful '
        'for knowledge management and note-taking tasks.';

    final contents = history.map((m) => m.toApiJson()).toList();

    // Build the ordered model list: primary first, then fallbacks (deduplicated).
    final models = <String>[
      _primaryModel,
      ..._fallbackModels.where((m) => m != _primaryModel),
    ];

    String? lastError;

    for (final model in models) {
      // ── Retry loop (per model) ─────────────────────────────────────────
      for (int attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) {
          final delay = Duration(milliseconds: 500 * (1 << (attempt - 1)));
          debugPrint(
            '[GeminiService] Retry $attempt for $model — waiting ${delay.inMilliseconds}ms',
          );
          await Future<void>.delayed(delay);
        }

        final url = Uri.parse(
          '$_baseUrl/models/$model:generateContent?key=$_activeApiKey',
        );

        late http.Response response;
        try {
          response = await http
              .post(
                url,
                headers: const {'Content-Type': 'application/json'},
                body: jsonEncode({
                  'system_instruction': {
                    'parts': [
                      {'text': systemText},
                    ],
                  },
                  'contents': contents,
                  'generationConfig': {
                    'temperature': 0.7,
                    'maxOutputTokens': 1024,
                  },
                }),
              )
              .timeout(const Duration(seconds: 30));
        } on TimeoutException {
          lastError = 'Request timed out';
          break; // try next model
        } catch (e) {
          lastError = e.toString();
          break; // try next model
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          final payload = _decodeJson(response.body);
          final blockReason = _extractBlockReason(payload);
          if (blockReason != null) {
            throw GeminiServiceException(
              'Gemini response blocked by safety policy: $blockReason',
            );
          }
          final text = _extractText(payload);
          if (text != null && text.trim().isNotEmpty) return text.trim();
          throw const GeminiServiceException('Gemini returned an empty response.');
        }

        lastError =
            _extractErrorMessage(_decodeJson(response.body)) ??
            'HTTP ${response.statusCode}';

        // Retry on transient errors; break on permanent ones
        if (!_retryOn.contains(response.statusCode)) break;
      }

      // ── Fallback decision ──────────────────────────────────────────────
      final lastCode = _lastStatusCode(lastError);
      if (!_fallbackOn.contains(lastCode) && lastCode != null) break;
      debugPrint('[GeminiService] Falling back from $model to next model');
    }

    throw GeminiServiceException(
      lastError ?? 'Gemini request failed after all retries and fallbacks.',
    );
  }

  static int? _lastStatusCode(String? errorMsg) {
    if (errorMsg == null) return null;
    final match = RegExp(r'HTTP (\d+)').firstMatch(errorMsg);
    return match != null ? int.tryParse(match.group(1)!) : null;
  }

  static Map<String, dynamic> _decodeJson(String source) {
    if (source.trim().isEmpty) return <String, dynamic>{};
    try {
      final decoded = jsonDecode(source);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return <String, dynamic>{};
  }

  static String? _extractErrorMessage(Map<String, dynamic> payload) {
    final error = payload['error'];
    if (error is Map<String, dynamic>) {
      final message = error['message']?.toString().trim();
      if (message != null && message.isNotEmpty) return message;
    }
    return null;
  }

  static String? _extractBlockReason(Map<String, dynamic> payload) {
    final feedback = payload['promptFeedback'];
    if (feedback is Map<String, dynamic>) {
      final reason = feedback['blockReason']?.toString().trim();
      if (reason != null && reason.isNotEmpty) return reason;
    }
    return null;
  }

  static String? _extractText(Map<String, dynamic> payload) {
    final candidates = payload['candidates'];
    if (candidates is! List || candidates.isEmpty) return null;
    final first = candidates.first;
    if (first is! Map<String, dynamic>) return null;
    final content = first['content'];
    if (content is! Map<String, dynamic>) return null;
    final parts = content['parts'];
    if (parts is! List || parts.isEmpty) return null;

    final chunks = <String>[];
    for (final part in parts) {
      if (part is Map<String, dynamic>) {
        final text = part['text']?.toString();
        if (text != null && text.trim().isNotEmpty) chunks.add(text.trim());
      }
    }
    return chunks.isEmpty ? null : chunks.join('\n');
  }
}

enum GeminiRole { user, model }

class GeminiMessage {
  final GeminiRole role;
  final String text;

  const GeminiMessage({required this.role, required this.text});

  Map<String, dynamic> toApiJson() {
    return {
      'role': role == GeminiRole.user ? 'user' : 'model',
      'parts': [
        {'text': text},
      ],
    };
  }
}

class GeminiServiceException implements Exception {
  final String message;

  const GeminiServiceException(this.message);

  @override
  String toString() => message;
}
