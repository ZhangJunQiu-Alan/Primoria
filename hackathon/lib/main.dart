import 'package:flutter/material.dart';
import 'landing_page.dart';

void main() => runApp(const PrimoriaHackApp());

class PrimoriaHackApp extends StatelessWidget {
  const PrimoriaHackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Primoria — HackaStone 2026',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF00BCD4)),
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 58,
            fontWeight: FontWeight.w800,
            letterSpacing: -2.0,
            height: 1.05,
          ),
          displayMedium: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.w700,
            letterSpacing: -1.0,
            height: 1.15,
          ),
          headlineLarge: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
          headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: TextStyle(fontSize: 18, height: 1.7),
          bodyMedium: TextStyle(fontSize: 16, height: 1.7),
          labelLarge: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
        ),
      ),
      home: const LandingPage(),
    );
  }
}
