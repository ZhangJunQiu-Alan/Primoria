import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';

enum AccessState { checking, allowed, denied }

/// Singleton ChangeNotifier that tracks whether the current Supabase session
/// has Builder access (role = 'author' | 'admin').
///
/// Lifecycle:
///   - Created lazily when first accessed (after Supabase.initialize()).
///   - Immediately calls [_check] if a session is already restored (cold start).
///   - Re-checks on every Supabase auth-state change (sign-in / sign-out).
///
/// The router merges this into its refreshListenable so the GoRouter
/// re-evaluates the redirect whenever access state changes.
class BuilderAccessNotifier extends ChangeNotifier {
  AccessState _state;
  String? _deniedMessage;

  /// Whether an access check is in progress (used to distinguish
  /// role-check-triggered sign-outs from explicit user sign-outs).
  bool _isCheckingAccess = false;

  AccessState get state => _state;

  /// Non-null after a failed role check; null after explicit sign-out or
  /// a new sign-in attempt resets the flow.
  String? get deniedMessage => _deniedMessage;

  late final StreamSubscription<AuthState> _sub;

  BuilderAccessNotifier()
    : _state = SupabaseService.isLoggedIn
          ? AccessState.checking
          : AccessState.denied {
    _sub = SupabaseService.authStateChanges.listen(_onAuthState);
    // Check immediately if a session was already restored (cold start).
    if (SupabaseService.isLoggedIn) _check();
  }

  void _onAuthState(AuthState authState) {
    switch (authState.event) {
      case AuthChangeEvent.signedIn:
        _state = AccessState.checking;
        _deniedMessage = null;
        notifyListeners();
        _check();

      case AuthChangeEvent.signedOut:
        // Only clear the denied message when it's an explicit user sign-out,
        // not the sign-out triggered by our own role check.
        if (!_isCheckingAccess) {
          _deniedMessage = null;
        }
        _state = AccessState.denied;
        notifyListeners();

      default:
        break;
    }
  }

  Future<void> _check() async {
    if (!SupabaseService.isLoggedIn) {
      _state = AccessState.denied;
      notifyListeners();
      return;
    }

    _isCheckingAccess = true;
    final hasAccess = await SupabaseService.ensureBuilderAccess(
      signOutIfDenied: true,
    );
    _isCheckingAccess = false;

    _state = hasAccess ? AccessState.allowed : AccessState.denied;
    if (!hasAccess) {
      _deniedMessage = SupabaseService.builderAccessDeniedMessage;
    }
    notifyListeners();
  }

  /// Dismiss the access-denied banner without triggering a sign-out.
  void clearDeniedMessage() {
    if (_deniedMessage == null) return;
    _deniedMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

/// Top-level singleton — created lazily after [Supabase.initialize()].
final builderAccessNotifier = BuilderAccessNotifier();
