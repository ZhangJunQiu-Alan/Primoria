import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/storage_service.dart';
import '../l10n/app_localizations.dart';

/// Riverpod notifier that holds the current language code ('en' | 'zh').
/// Initialises from SharedPreferences, falling back to the browser locale.
class LanguageNotifier extends StateNotifier<String> {
  LanguageNotifier() : super('en') {
    _init();
  }

  Future<void> _init() async {
    await StorageService.init();
    final saved = StorageService.getLanguage();
    if (saved != null && saved.isNotEmpty) {
      state = saved;
      return;
    }
    final locale = WidgetsBinding.instance.platformDispatcher.locale;
    state = locale.languageCode.startsWith('zh') ? 'zh' : 'en';
  }

  Future<void> setLanguage(String code) async {
    state = code;
    await StorageService.saveLanguage(code);
  }
}

final languageProvider = StateNotifierProvider<LanguageNotifier, String>(
  (ref) => LanguageNotifier(),
);

/// Convenience extension so consumers can write `ref.watch(tProvider)`.
final tProvider = Provider<BuilderLocalizations>(
  (ref) => BuilderLocalizations(ref.watch(languageProvider)),
);
