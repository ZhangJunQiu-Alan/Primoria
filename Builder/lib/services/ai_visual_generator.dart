import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

/// Generation stages for the staged UX
enum VisualGenerationStage {
  idle,
  analyzing,
  generatingScene,
  done,
  error,
}

/// Result of an AI visual generation request
class VisualGenerationResult {
  final InteractiveVisualContent? spec;
  final String? error;

  const VisualGenerationResult({this.spec, this.error});
  bool get isSuccess => spec != null && error == null;
}

/// AI visual generator — calls the Supabase Edge Function `gemini-generate`.
/// The Gemini API key is stored as a server-side secret; the client never sees it.
class AIVisualGenerator {
  AIVisualGenerator._();

  static final _client = Supabase.instance.client;

  /// Generate an interactive visual from a natural language [prompt].
  static Future<VisualGenerationResult> generate({
    required String prompt,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'gemini-generate',
        body: {'prompt': prompt},
      );

      final data = response.data as Map<String, dynamic>?;
      final html = data?['html'] as String?;

      if (html == null || html.trim().isEmpty) {
        final error = data?['error'] as String? ?? 'AI returned empty response';
        return VisualGenerationResult(error: error);
      }

      final spec = InteractiveVisualContent.fromLegacyAnimationJson({
        'customHtml': html,
        'aiPrompt': prompt,
      });

      return VisualGenerationResult(spec: spec);
    } on FunctionException catch (e) {
      return VisualGenerationResult(
        error: e.details?.toString() ?? 'Edge Function error: ${e.reasonPhrase}',
      );
    } catch (e) {
      return VisualGenerationResult(error: e.toString());
    }
  }
}
