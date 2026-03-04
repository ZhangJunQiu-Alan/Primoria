/// Router configuration
/// Define /, /dashboard, /builder and /viewer routes
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import '../services/supabase_service.dart';
import '../providers/builder_access_provider.dart';
import '../features/auth/auth_callback_screen.dart';
import '../features/landing/landing_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/builder/builder_screen.dart';
import '../features/viewer/viewer_screen.dart';

final _routerRefresh = Listenable.merge([
  _GoRouterRefreshStream(SupabaseService.authStateChanges),
  builderAccessNotifier,
]);

final appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: _routerRefresh,
  redirect: (context, state) {
    final loggedIn = SupabaseService.isLoggedIn;
    final location = state.matchedLocation;
    final access = builderAccessNotifier.state;

    const protectedRoutes = {'/dashboard', '/builder'};
    final isProtected = protectedRoutes.contains(location);

    // Don't redirect away from the callback screen — let it process first
    if (location == '/auth/callback') return null;

    // Not logged in → bounce from protected routes
    if (!loggedIn && isProtected) {
      SupabaseService.pendingRedirect = state.uri.toString();
      return '/';
    }

    // Session restored but role check still in progress →
    // hold the user on landing (which shows a loading screen) instead of
    // letting them through to a protected route.
    if (loggedIn && access == AccessState.checking) {
      return isProtected ? '/' : null;
    }

    // Role check failed → stay on landing; the notifier already signed them out
    if (access == AccessState.denied && isProtected) {
      return '/';
    }

    // Logged in + role verified → advance from landing to dashboard
    if (loggedIn && access == AccessState.allowed && location == '/') {
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
        final addLesson = state.uri.queryParameters['addLesson'] == '1';
        final draftId = state.uri.queryParameters['draftId'];
        final lessonIndex = int.tryParse(
          state.uri.queryParameters['lessonIndex'] ?? '',
        );
        final lessonTitle = state.uri.queryParameters['lessonTitle'];
        final courseTitle = state.uri.queryParameters['courseTitle'];
        return BuilderScreen(
          courseId: courseId,
          addLesson: addLesson,
          draftId: draftId,
          lessonIndex: lessonIndex,
          lessonTitle: lessonTitle,
          parentCourseTitle: courseTitle,
        );
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
        final addLesson = state.uri.queryParameters['addLesson'] == '1';
        final draftId = state.uri.queryParameters['draftId'];
        final pageIndex = int.tryParse(
          state.uri.queryParameters['pageIndex'] ?? '',
        );
        final singlePage = state.uri.queryParameters['singlePage'] == '1';
        return ViewerScreen(
          courseId: courseId,
          addLesson: addLesson,
          draftId: draftId,
          pageIndex: pageIndex,
          singlePage: singlePage,
        );
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
