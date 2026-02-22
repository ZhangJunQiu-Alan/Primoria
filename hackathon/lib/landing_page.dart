import 'package:flutter/material.dart';
import 'theme.dart';
import 'sections/hero_section.dart';
import 'sections/features_section.dart';
import 'sections/how_it_works_section.dart';
import 'sections/tech_stack_section.dart';
import 'sections/team_section.dart';
import 'sections/footer_section.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final ScrollController _scrollController = ScrollController();
  bool _navScrolled = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      final scrolled = _scrollController.offset > 60;
      if (scrolled != _navScrolled) {
        setState(() => _navScrolled = scrolled);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HColors.bg,
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scrollController,
            slivers: [
              const SliverToBoxAdapter(child: HeroSection()),
              const SliverToBoxAdapter(child: FeaturesSection()),
              const SliverToBoxAdapter(child: HowItWorksSection()),
              const SliverToBoxAdapter(child: TechStackSection()),
              const SliverToBoxAdapter(child: TeamSection()),
              const SliverToBoxAdapter(child: FooterSection()),
            ],
          ),
          _NavBar(scrolled: _navScrolled),
        ],
      ),
    );
  }
}

class _NavBar extends StatelessWidget {
  final bool scrolled;
  const _NavBar({required this.scrolled});

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 700;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color:
            scrolled
                ? Colors.white.withValues(alpha: 0.95)
                : Colors.transparent,
        boxShadow:
            scrolled
                ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.07),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ]
                : [],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                _Logo(light: !scrolled),
                const Spacer(),
                if (!isNarrow) ...[
                  _NavLink(
                    'Features',
                    light: !scrolled,
                  ),
                  const SizedBox(width: 8),
                  _NavLink(
                    'Team',
                    light: !scrolled,
                  ),
                  const SizedBox(width: 16),
                ],
                _GitHubButton(scrolled: scrolled),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  final bool light;
  const _Logo({required this.light});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            gradient: HColors.accentGradient,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
        ),
        const SizedBox(width: 10),
        Text(
          'Primoria',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: light ? Colors.white : HColors.textPrimary,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: HColors.purple.withValues(alpha: light ? 0.25 : 0.12),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: HColors.purple.withValues(alpha: light ? 0.4 : 0.3),
            ),
          ),
          child: Text(
            'HackaStone 2026',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: light ? Colors.white.withValues(alpha: 0.9) : HColors.purple,
              letterSpacing: 0.3,
            ),
          ),
        ),
      ],
    );
  }
}

class _NavLink extends StatelessWidget {
  final String label;
  final bool light;
  const _NavLink(this.label, {required this.light});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () {},
      child: Text(
        label,
        style: TextStyle(
          color:
              light ? Colors.white.withValues(alpha: 0.8) : HColors.textSecondary,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _GitHubButton extends StatelessWidget {
  final bool scrolled;
  const _GitHubButton({required this.scrolled});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.code, size: 16),
      label: const Text('GitHub'),
      style: OutlinedButton.styleFrom(
        foregroundColor: scrolled ? HColors.textPrimary : Colors.white,
        side: BorderSide(
          color: scrolled
              ? HColors.border
              : Colors.white.withValues(alpha: 0.4),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
