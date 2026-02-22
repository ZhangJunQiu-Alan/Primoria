import 'package:flutter/material.dart';
import '../theme.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isNarrow = size.width < 700;

    return Container(
      width: double.infinity,
      constraints: BoxConstraints(minHeight: size.height),
      decoration: const BoxDecoration(gradient: HColors.heroGradient),
      child: Stack(
        children: [
          // Decorative glows
          Positioned(
            top: -100,
            right: -100,
            child: _Glow(color: HColors.primary.withValues(alpha: 0.18), size: 500),
          ),
          Positioned(
            bottom: 0,
            left: -150,
            child: _Glow(color: HColors.purple.withValues(alpha: 0.15), size: 600),
          ),
          Positioned(
            top: 300,
            left: size.width * 0.4,
            child: _Glow(color: HColors.primary.withValues(alpha: 0.08), size: 300),
          ),
          // Grid pattern overlay
          Positioned.fill(child: _GridOverlay()),
          // Content
          Center(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                isNarrow ? 24 : 48,
                120,
                isNarrow ? 24 : 48,
                80,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 860),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _HackathonBadge(),
                    const SizedBox(height: 32),
                    _Headline(isNarrow: isNarrow),
                    const SizedBox(height: 24),
                    _SubText(isNarrow: isNarrow),
                    const SizedBox(height: 48),
                    _CtaRow(isNarrow: isNarrow),
                    const SizedBox(height: 72),
                    _StatsRow(isNarrow: isNarrow),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Glow extends StatelessWidget {
  final Color color;
  final double size;
  const _Glow({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(colors: [color, Colors.transparent]),
      ),
    );
  }
}

class _GridOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: 0.03,
      child: CustomPaint(painter: _GridPainter()),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1;
    const step = 60.0;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _HackathonBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            HColors.primary.withValues(alpha: 0.2),
            HColors.purple.withValues(alpha: 0.2),
          ],
        ),
        borderRadius: BorderRadius.circular(40),
        border: Border.all(
          color: HColors.primary.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: HColors.primary,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: HColors.primary.withValues(alpha: 0.6),
                  blurRadius: 6,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          const Text(
            'HackaStone 2026 · Agentic AI for Education',
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _Headline extends StatelessWidget {
  final bool isNarrow;
  const _Headline({required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback:
          (bounds) => const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.white, Color(0xFFB2EBF2)],
          ).createShader(bounds),
      child: Text(
        'Agentic AI\nfor Education',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: isNarrow ? 44 : 64,
          fontWeight: FontWeight.w800,
          letterSpacing: -2,
          height: 1.08,
          color: Colors.white,
        ),
      ),
    );
  }
}

class _SubText extends StatelessWidget {
  final bool isNarrow;
  const _SubText({required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    return Text(
      'Transform any textbook into dynamic, interactive STEM lessons.\nAI Agents handle course creation, content generation, and adaptive learning — automatically.',
      textAlign: TextAlign.center,
      style: TextStyle(
        fontSize: isNarrow ? 16 : 19,
        color: Colors.white.withValues(alpha: 0.65),
        height: 1.65,
      ),
    );
  }
}

class _CtaRow extends StatelessWidget {
  final bool isNarrow;
  const _CtaRow({required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    final buttons = [
      _PrimaryButton(label: 'Explore Demo', onTap: () {}),
      const SizedBox(width: 16, height: 16),
      _SecondaryButton(label: 'View on GitHub', onTap: () {}),
    ];

    if (isNarrow) {
      return Column(children: buttons);
    }
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: buttons);
  }
}

class _PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _PrimaryButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: HColors.accentGradient,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: HColors.primary.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _SecondaryButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
      child: Text(label),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final bool isNarrow;
  const _StatsRow({required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    final stats = [
      ('10+', 'Interactive Block Types'),
      ('< 2 min', 'Course Generation'),
      ('4', 'Agentic AI Features'),
      ('2', 'Platforms (Web + Mobile)'),
    ];

    final divider = Container(
      width: 1,
      height: 40,
      color: Colors.white.withValues(alpha: 0.12),
    );

    if (isNarrow) {
      return Wrap(
        spacing: 24,
        runSpacing: 16,
        alignment: WrapAlignment.center,
        children: stats
            .map(
              (s) => _StatItem(value: s.$1, label: s.$2),
            )
            .toList(),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (int i = 0; i < stats.length; i++) ...[
            _StatItem(value: stats[i].$1, label: stats[i].$2),
            if (i < stats.length - 1) ...[
              const SizedBox(width: 40),
              divider,
              const SizedBox(width: 40),
            ],
          ],
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (bounds) => HColors.accentGradient.createShader(bounds),
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withValues(alpha: 0.5),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
