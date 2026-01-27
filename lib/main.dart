import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'theme/theme.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/course_screen.dart';
import 'screens/lesson_screen.dart';
import 'providers/theme_provider.dart';
import 'providers/user_provider.dart';
import 'services/storage_service.dart';
import 'services/audio_service.dart';
import 'services/notification_service.dart';

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
              '/': (context) => const AppEntryPoint(),
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const HomeScreen(),
              '/course': (context) => const CourseScreen(),
              '/lesson': (context) => const LessonScreen(),
            },
          );
        },
      ),
    );
  }
}

/// App entry point - decides which page to show based on login status
class AppEntryPoint extends StatelessWidget {
  const AppEntryPoint({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        // If user is logged in, show home page
        // If user is not logged in, show login page
        // Guest mode is allowed, so show home page by default
        return const HomeScreen();
      },
    );
  }
}
