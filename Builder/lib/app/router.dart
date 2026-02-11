/// Router configuration
/// Define /, /dashboard, /builder and /viewer routes
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import '../services/supabase_service.dart';
import '../features/auth/auth_callback_screen.dart';
import '../features/landing/landing_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/builder/builder_screen.dart';
import '../features/viewer/viewer_screen.dart';

final _routerRefresh = _GoRouterRefreshStream(SupabaseService.authStateChanges);

final appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: _routerRefresh,
  redirect: (context, state) {
    final loggedIn = SupabaseService.isLoggedIn;
    final location = state.matchedLocation;

    const protectedRoutes = {'/dashboard', '/builder'};
    final isProtected = protectedRoutes.contains(location);

    // Don't redirect away from the callback screen — let it process first
    if (location == '/auth/callback') return null;

    if (!loggedIn && isProtected) {
      // Store the intended destination so OAuth callback can restore it
      SupabaseService.pendingRedirect = state.uri.toString();
      return '/';
    }

    if (loggedIn && location == '/') {
      return '/dashboard';
    }

    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      name: 'landing',
      builder: (context, state) => const LandingScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      name: 'dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/builder',
      name: 'builder',
      builder: (context, state) {
        final courseId = state.uri.queryParameters['courseId'];
        return BuilderScreen(courseId: courseId);
      },
    ),
    GoRoute(
      path: '/auth/callback',
      name: 'authCallback',
      builder: (context, state) => const AuthCallbackScreen(),
    ),
    GoRoute(
      path: '/viewer',
      name: 'viewer',
      builder: (context, state) {
        final courseId = state.uri.queryParameters['courseId'];
        return ViewerScreen(courseId: courseId);
      },
    ),
  ],
);

class _GoRouterRefreshStream extends ChangeNotifier {
  _GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
