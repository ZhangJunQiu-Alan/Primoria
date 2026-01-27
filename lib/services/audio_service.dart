import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// Audio service
class AudioService {
  static AudioService? _instance;
  final AudioPlayer _player = AudioPlayer();
  bool _soundEnabled = true;

  AudioService._();

  static AudioService getInstance() {
    _instance ??= AudioService._();
    return _instance!;
  }

  /// Initialize audio service
  Future<void> initialize() async {
    // Preload audio files (if any)
    // await _player.setSource(AssetSource('sounds/correct.mp3'));
  }

  void setSoundEnabled(bool enabled) {
    _soundEnabled = enabled;
  }

  bool get soundEnabled => _soundEnabled;

  /// Play correct answer sound
  Future<void> playCorrect() async {
    if (!_soundEnabled) return;
    await HapticFeedback.mediumImpact();
    // Use system or custom sound
    // await _player.play(AssetSource('sounds/correct.mp3'));
  }

  /// Play wrong answer sound
  Future<void> playWrong() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/wrong.mp3'));
  }

  /// Play button click sound
  Future<void> playClick() async {
    if (!_soundEnabled) return;
    await HapticFeedback.selectionClick();
    // await _player.play(AssetSource('sounds/click.mp3'));
  }

  /// Play completion sound
  Future<void> playComplete() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/complete.mp3'));
  }

  /// Play achievement sound
  Future<void> playAchievement() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/achievement.mp3'));
  }

  /// Play streak sound
  Future<void> playStreak() async {
    if (!_soundEnabled) return;
    await HapticFeedback.mediumImpact();
    // await _player.play(AssetSource('sounds/streak.mp3'));
  }

  void dispose() {
    _player.dispose();
  }
}
