/// Router configuration
/// Define /, /dashboard, /builder and /viewer routes
library;

import 'package:go_router/go_router.dart';
import '../features/landing/landing_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/builder/builder_screen.dart';
import '../features/viewer/viewer_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
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
      builder: (context, state) => const BuilderScreen(),
    ),
    GoRoute(
      path: '/viewer',
      name: 'viewer',
      builder: (context, state) => const ViewerScreen(),
    ),
  ],
);
