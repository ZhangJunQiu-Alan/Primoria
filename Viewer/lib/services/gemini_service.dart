import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'supabase_service.dart';

class GeminiService {
  GeminiService._();

  static const String _apiKeyFromDefine = String.fromEnvironment(
    'GEMINI_API_KEY',
  );
  static const String _model = String.fromEnvironment(
    'GEMINI_MODEL',
    defaultValue: 'gemini-2.0-flash',
  );
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

  static Future<String> generateReply({
    required List<GeminiMessage> history,
  }) async {
    await initialize();
    final apiKey = _activeApiKey;

    if (!isConfigured) {
      throw const GeminiServiceException(
        'Gemini API key is missing. Launch with '
        '--dart-define=GEMINI_API_KEY=your_key',
      );
    }

    final uri = Uri.https(
      'generativelanguage.googleapis.com',
      '/v1beta/models/$_model:generateContent',
      {'key': apiKey},
    );

    final requestBody = jsonEncode({
      'systemInstruction': {
        'parts': [
          {
            'text':
                'You are Primoria AI Tutor. Be concise, clear, and helpful '
                'for knowledge management and note-taking tasks.',
          },
        ],
      },
      'contents': history.map((message) => message.toApiJson()).toList(),
      'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 1024},
    });

    for (var attempt = 0; attempt < 3; attempt++) {
      final response = await http.post(
        uri,
        headers: const {'Content-Type': 'application/json'},
        body: requestBody,
      );

      final payload = _decodeJson(response.body);
      final shouldRetry =
          (response.statusCode == 429 || response.statusCode == 503) &&
          attempt < 2;
      if (shouldRetry) {
        await Future<void>.delayed(Duration(milliseconds: 700 * (attempt + 1)));
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message =
            _extractErrorMessage(payload) ??
            'Gemini request failed (${response.statusCode}).';
        throw GeminiServiceException(message);
      }

      final text = _extractText(payload);
      if (text == null || text.trim().isEmpty) {
        final blockReason = _extractBlockReason(payload);
        if (blockReason != null) {
          throw GeminiServiceException(
            'Gemini response was blocked by safety policy: $blockReason',
          );
        }
        throw const GeminiServiceException(
          'Gemini returned an empty response.',
        );
      }

      return text.trim();
    }

    throw const GeminiServiceException('Gemini request failed after retries.');
  }

  static Map<String, dynamic> _decodeJson(String source) {
    if (source.trim().isEmpty) return <String, dynamic>{};
    try {
      final decoded = jsonDecode(source);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
    } catch (_) {}
    return <String, dynamic>{};
  }

  static String? _extractErrorMessage(Map<String, dynamic> payload) {
    final error = payload['error'];
    if (error is Map<String, dynamic>) {
      final message = error['message']?.toString().trim();
      if (message != null && message.isNotEmpty) {
        return message;
      }
    }
    return null;
  }

  static String? _extractBlockReason(Map<String, dynamic> payload) {
    final feedback = payload['promptFeedback'];
    if (feedback is Map<String, dynamic>) {
      final reason = feedback['blockReason']?.toString().trim();
      if (reason != null && reason.isNotEmpty) {
        return reason;
      }
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
        if (text != null && text.trim().isNotEmpty) {
          chunks.add(text.trim());
        }
      }
    }

    if (chunks.isEmpty) return null;
    return chunks.join('\n');
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
