import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../services/storage_service.dart';

/// Language state management.
/// Detects browser locale on first launch (zh → Chinese, else English).
/// Persists user preference to SharedPreferences.
class LanguageProvider extends ChangeNotifier {
  String _languageCode = 'en';
  StorageService? _storage;

  AppLocalizations get t => AppLocalizations(_languageCode);
  String get languageCode => _languageCode;
  String get languageLabel => _languageCode == 'zh' ? '中文' : 'English';

  Future<void> initialize() async {
    _storage = await StorageService.getInstance();
    final saved = _storage?.getLanguage();
    if (saved != null && saved.isNotEmpty) {
      _languageCode = saved;
    } else {
      // Auto-detect from browser/device locale
      final locale = WidgetsBinding.instance.platformDispatcher.locale;
      _languageCode = locale.languageCode.startsWith('zh') ? 'zh' : 'en';
    }
    notifyListeners();
  }

  Future<void> setLanguage(String code) async {
    if (_languageCode == code) return;
    _languageCode = code;
    await _storage?.saveLanguage(code);
    notifyListeners();
  }
}
