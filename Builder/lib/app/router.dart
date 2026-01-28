/// 路由配置
/// 定义 /builder 和 /viewer 路由入口

import 'package:go_router/go_router.dart';
import '../features/builder/builder_screen.dart';
import '../features/viewer/viewer_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/builder',
  routes: [
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
