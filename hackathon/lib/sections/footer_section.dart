import 'package:flutter/material.dart';
import '../theme.dart';

class FooterSection extends StatelessWidget {
  const FooterSection({super.key});

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 700;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(gradient: HColors.heroGradient),
      padding: EdgeInsets.symmetric(
        vertical: 56,
        horizontal: isNarrow ? 24 : 48,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: HSpacing.maxWidth),
          child: isNarrow ? _VerticalFooter() : _HorizontalFooter(),
        ),
      ),
    );
  }
}

class _HorizontalFooter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: _BrandBlock()),
        const SizedBox(width: 80),
        _LinkColumn(
          title: 'Project',
          links: ['GitHub Repo', 'Demo App', 'Builder Tool', 'Viewer App'],
        ),
        const SizedBox(width: 60),
        _LinkColumn(
          title: 'Hackathon',
          links: ['HackaStone 2026', 'Theme: Agentic AI', 'Submission'],
        ),
        const SizedBox(width: 60),
        _LinkColumn(
          title: 'Contact',
          links: ['Email Team', 'GitHub Issues'],
        ),
      ],
    );
  }
}

class _VerticalFooter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _BrandBlock(),
        const SizedBox(height: 40),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _LinkColumn(
                title: 'Project',
                links: ['GitHub Repo', 'Demo App'],
              ),
            ),
            Expanded(
              child: _LinkColumn(
                title: 'Hackathon',
                links: ['HackaStone 2026', 'Submission'],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _BrandBlock extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: HColors.accentGradient,
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'Primoria',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Agentic AI for Education.\nBuilt for HackaStone 2026.',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.55),
            fontSize: 14,
            height: 1.65,
          ),
        ),
        const SizedBox(height: 20),
        // TODO: Replace # with your actual GitHub URL
        _FooterLink(label: 'View on GitHub →', url: 'https://github.com'),
      ],
    );
  }
}

class _FooterLink extends StatelessWidget {
  final String label;
  final String url;
  const _FooterLink({required this.label, required this.url});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // TODO: url_launcher
      },
      child: Text(
        label,
        style: const TextStyle(
          color: HColors.primary,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          decoration: TextDecoration.underline,
          decorationColor: HColors.primary,
        ),
      ),
    );
  }
}

class _LinkColumn extends StatelessWidget {
  final String title;
  final List<String> links;
  const _LinkColumn({required this.title, required this.links});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 16),
        ...links.map(
          (link) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              link,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 14,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
