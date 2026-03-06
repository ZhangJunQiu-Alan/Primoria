import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/theme.dart';
import 'screens/landing_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/course_screen.dart';
import 'screens/lesson_screen.dart';
import 'screens/parent_dashboard_screen.dart';
import 'providers/theme_provider.dart';
import 'providers/user_provider.dart';
import 'providers/language_provider.dart';
import 'services/storage_service.dart';
import 'services/audio_service.dart';
import 'services/notification_service.dart';
import 'utils/role_routes.dart';

const supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://rygafvlzzkvqhhenajzi.supabase.co',
);
const supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Fmdmx6emt2cWhoZW5hanppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDg5NzgsImV4cCI6MjA4NTQyNDk3OH0.8oRsXVtdb3DnDEusJzHao3P4w-6D_-i-z9S787D8BWo',
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  // Initialize Supabase
  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(autoRefreshToken: true),
  );

  // Initialize services
  await StorageService.getInstance();
  await AudioService.getInstance().initialize();
  await NotificationService.getInstance().initialize();

  runApp(const PrimoriaApp());
}

class PrimoriaApp extends StatelessWidget {
  const PrimoriaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => UserProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => LanguageProvider()..initialize()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'Primoria',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            initialRoute: '/',
            routes: {
              '/': (context) => const LandingScreen(),
              '/login': (context) => const LoginScreen(),
              '/register': (context) => const RegisterScreen(),
              '/home': (context) => const _AuthGuard(child: HomeScreen()),
              '/parent': (context) => const _AuthGuard(
                parentOnly: true,
                child: ParentDashboardScreen(),
              ),
              '/course': (context) => const _AuthGuard(child: CourseScreen()),
              '/lesson': (context) => const _AuthGuard(child: LessonScreen()),
            },
          );
        },
      ),
    );
  }
}

/// Route guard: redirects unauthenticated users to /login.
/// Shows a loading indicator while [UserProvider] is still initializing
/// (e.g., restoring a Supabase session on cold start).
class _AuthGuard extends StatelessWidget {
  final Widget child;
  final bool parentOnly;

  const _AuthGuard({required this.child, this.parentOnly = false});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, up, _) {
        // Still restoring session — show a blank loading screen
        if (!up.isInitialized) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        // No active session — redirect to login
        if (!up.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(context).pushReplacementNamed(RoleRoutes.login);
          });
          return const Scaffold(body: SizedBox.shrink());
        }

        final isParent = RoleRoutes.isParentRole(up.user?.role);
        if (parentOnly && !isParent) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(context).pushReplacementNamed(RoleRoutes.home);
          });
          return const Scaffold(body: SizedBox.shrink());
        }
        if (!parentOnly && isParent) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(
              context,
            ).pushReplacementNamed(RoleRoutes.parentDashboard);
          });
          return const Scaffold(body: SizedBox.shrink());
        }
        return child;
      },
    );
  }
}
