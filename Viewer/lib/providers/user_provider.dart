import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../services/audio_service.dart';
import '../services/supabase_service.dart';

/// User data model
class UserData {
  final String id;
  final String name;
  final String email;
  final String? avatarUrl;
  final bool isPro;
  final DateTime joinedAt;

  UserData({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.isPro = false,
    required this.joinedAt,
  });

  factory UserData.fromJson(Map<String, dynamic> json) {
    return UserData(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      avatarUrl: json['avatarUrl'],
      isPro: json['isPro'] ?? false,
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatarUrl': avatarUrl,
      'isPro': isPro,
      'joinedAt': joinedAt.toIso8601String(),
    };
  }
}

/// User state management
class UserProvider extends ChangeNotifier {
  StorageService? _storage;
  UserData? _user;
  bool _isLoggedIn = false;
  bool _isLoading = false;
  String _errorMessage = '';

  // Learning statistics
  int _streak = 0;
  int _longestStreak = 0;
  int _completedCourses = 0;
  int _totalStudyMinutes = 0;
  int _completedQuestions = 0;
  List<String> _unlockedAchievements = [];

  // Getters
  UserData? get user => _user;
  bool get isLoggedIn => _isLoggedIn;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;
  int get streak => _streak;
  int get longestStreak => _longestStreak;
  int get completedCourses => _completedCourses;
  int get totalStudyMinutes => _totalStudyMinutes;
  String get totalStudyTime {
    final hours = _totalStudyMinutes ~/ 60;
    if (hours > 0) {
      return '${hours}h ${_totalStudyMinutes % 60}m';
    }
    return '${_totalStudyMinutes}m';
  }

  int get completedQuestions => _completedQuestions;
  List<String> get unlockedAchievements => _unlockedAchievements;

  Future<void> initialize() async {
    _storage = await StorageService.getInstance();
    await _restoreSession();
    await _loadStats();
    await _checkAndUpdateStreak();
  }

  Future<void> _restoreSession() async {
    final supabaseUser = SupabaseService.currentUser;
    if (supabaseUser != null) {
      _user = _userDataFromSupabase(supabaseUser);
      await _storage?.saveUser(_user!.toJson());
      _isLoggedIn = true;
    } else {
      final userData = _storage?.getUser();
      if (userData != null) {
        // Stale local cache but no Supabase session — clear it
        await _storage?.clearUser();
      }
      _isLoggedIn = false;
    }
    notifyListeners();
  }

  UserData _userDataFromSupabase(dynamic supabaseUser) {
    final meta = supabaseUser.userMetadata as Map<String, dynamic>? ?? {};
    return UserData(
      id: supabaseUser.id,
      name:
          (meta['name'] as String?) ??
          (meta['full_name'] as String?) ??
          (supabaseUser.email?.split('@').first ?? ''),
      email: supabaseUser.email ?? '',
      avatarUrl: meta['avatar_url'] as String?,
      isPro: false,
      joinedAt:
          DateTime.tryParse(supabaseUser.createdAt ?? '') ?? DateTime.now(),
    );
  }

  Future<void> _loadStats() async {
    _streak = _storage?.getStreak() ?? 0;
    _longestStreak = _storage?.getLongestStreak() ?? 0;
    _completedCourses = _storage?.getCompletedCourses() ?? 0;
    _totalStudyMinutes = _storage?.getTotalStudyMinutes() ?? 0;
    _completedQuestions = _storage?.getCompletedQuestions() ?? 0;
    _unlockedAchievements = _storage?.getUnlockedAchievements() ?? [];
    notifyListeners();
  }

  Future<void> _checkAndUpdateStreak() async {
    final lastStudyDate = _storage?.getLastStudyDate();
    if (lastStudyDate != null) {
      final last = DateTime.parse(lastStudyDate);
      final now = DateTime.now();
      final diff = now.difference(last).inDays;

      if (diff > 1) {
        // Learning streak interrupted
        _streak = 0;
        await _storage?.saveStreak(0);
      }
    }
    notifyListeners();
  }

  /// Login
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    final result = await SupabaseService.signIn(
      email: email,
      password: password,
    );

    if (result.success && SupabaseService.currentUser != null) {
      _user = _userDataFromSupabase(SupabaseService.currentUser!);
      await _storage?.saveUser(_user!.toJson());
      _isLoggedIn = true;
    } else {
      _errorMessage = result.message;
    }

    _isLoading = false;
    notifyListeners();
    return result.success;
  }

  /// Register
  Future<bool> register(String name, String email, String password) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    final result = await SupabaseService.signUp(
      email: email,
      password: password,
      displayName: name,
    );

    if (result.success && SupabaseService.currentUser != null) {
      _user = _userDataFromSupabase(SupabaseService.currentUser!);
      await _storage?.saveUser(_user!.toJson());
      _isLoggedIn = true;
    } else if (result.success) {
      // Sign-up succeeded but no session yet (email confirmation required)
      _errorMessage = 'Please check your email to confirm your account.';
    } else {
      _errorMessage = result.message;
    }

    _isLoading = false;
    notifyListeners();
    return result.success;
  }

  /// Logout
  Future<void> logout() async {
    await SupabaseService.signOut();
    await _storage?.clearUser();
    _user = null;
    _isLoggedIn = false;
    notifyListeners();
  }

  /// Reset password
  Future<AuthResult> resetPassword(String email) async {
    return SupabaseService.resetPassword(email: email);
  }

  /// Record study
  Future<void> recordStudy(int minutes) async {
    await _storage?.addStudyTime(minutes);
    _totalStudyMinutes += minutes;

    // Update learning streak
    final lastStudyDate = _storage?.getLastStudyDate();
    final now = DateTime.now();

    if (lastStudyDate != null) {
      final last = DateTime.parse(lastStudyDate);
      final diff = now.difference(last).inDays;

      if (diff >= 1) {
        _streak++;
        if (_streak > _longestStreak) {
          _longestStreak = _streak;
          await _storage?.saveLongestStreak(_longestStreak);
        }
      }
    } else {
      _streak = 1;
    }

    await _storage?.saveStreak(_streak);
    await AudioService.getInstance().playStreak();

    // Check achievements
    await _checkAchievements();

    notifyListeners();
  }

  /// Complete question
  Future<void> completeQuestion() async {
    await _storage?.incrementCompletedQuestions();
    _completedQuestions++;
    notifyListeners();
  }

  /// Complete course
  Future<void> completeCourse(String courseId) async {
    await _storage?.incrementCompletedCourses();
    _completedCourses++;
    await _checkAchievements();
    notifyListeners();
  }

  /// Check and unlock achievements
  Future<void> _checkAchievements() async {
    final newAchievements = <String>[];

    // Streak achievements
    if (_streak >= 7 && !_unlockedAchievements.contains('streak_7')) {
      newAchievements.add('streak_7');
    }
    if (_streak >= 30 && !_unlockedAchievements.contains('streak_30')) {
      newAchievements.add('streak_30');
    }

    // Course completion achievements
    if (_completedCourses >= 1 &&
        !_unlockedAchievements.contains('first_course')) {
      newAchievements.add('first_course');
    }
    if (_completedCourses >= 10 &&
        !_unlockedAchievements.contains('courses_10')) {
      newAchievements.add('courses_10');
    }

    // Question completion achievements
    if (_completedQuestions >= 100 &&
        !_unlockedAchievements.contains('questions_100')) {
      newAchievements.add('questions_100');
    }

    if (newAchievements.isNotEmpty) {
      _unlockedAchievements.addAll(newAchievements);
      await _storage?.saveUnlockedAchievements(_unlockedAchievements);
      await AudioService.getInstance().playAchievement();
    }
  }

  /// Upgrade to Pro
  Future<void> upgradeToPro() async {
    if (_user != null) {
      _user = UserData(
        id: _user!.id,
        name: _user!.name,
        email: _user!.email,
        avatarUrl: _user!.avatarUrl,
        isPro: true,
        joinedAt: _user!.joinedAt,
      );
      await _storage?.saveUser(_user!.toJson());
      notifyListeners();
    }
  }
}
