import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

/// 音效服务
class AudioService {
  static AudioService? _instance;
  final AudioPlayer _player = AudioPlayer();
  bool _soundEnabled = true;

  AudioService._();

  static AudioService getInstance() {
    _instance ??= AudioService._();
    return _instance!;
  }

  /// 初始化音效服务
  Future<void> initialize() async {
    // 预加载音效文件（如果有的话）
    // await _player.setSource(AssetSource('sounds/correct.mp3'));
  }

  void setSoundEnabled(bool enabled) {
    _soundEnabled = enabled;
  }

  bool get soundEnabled => _soundEnabled;

  /// 播放正确答案音效
  Future<void> playCorrect() async {
    if (!_soundEnabled) return;
    await HapticFeedback.mediumImpact();
    // 使用系统音效或自定义音效
    // await _player.play(AssetSource('sounds/correct.mp3'));
  }

  /// 播放错误答案音效
  Future<void> playWrong() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/wrong.mp3'));
  }

  /// 播放按钮点击音效
  Future<void> playClick() async {
    if (!_soundEnabled) return;
    await HapticFeedback.selectionClick();
    // await _player.play(AssetSource('sounds/click.mp3'));
  }

  /// 播放完成音效
  Future<void> playComplete() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/complete.mp3'));
  }

  /// 播放升级/成就音效
  Future<void> playAchievement() async {
    if (!_soundEnabled) return;
    await HapticFeedback.heavyImpact();
    // await _player.play(AssetSource('sounds/achievement.mp3'));
  }

  /// 播放连续天数音效
  Future<void> playStreak() async {
    if (!_soundEnabled) return;
    await HapticFeedback.mediumImpact();
    // await _player.play(AssetSource('sounds/streak.mp3'));
  }

  void dispose() {
    _player.dispose();
  }
}
