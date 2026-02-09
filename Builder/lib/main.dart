import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app/router.dart';
import 'theme/theme.dart';

const supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'http://127.0.0.1:54321',
);
const supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: BuilderApp(),
    ),
  );
}

class BuilderApp extends StatelessWidget {
  const BuilderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'STEM Course Builder',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.light,
      routerConfig: appRouter,
    );
  }
}
