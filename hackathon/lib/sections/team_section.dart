import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/section_headers.dart';

class TeamSection extends StatelessWidget {
  const TeamSection({super.key});

  // TODO: Replace with actual team info
  static const _members = [
    _MemberData(
      name: 'Your Name',
      role: 'Full-Stack & AI Engineer',
      initials: 'YN',
      color: HColors.feat1,
    ),
    _MemberData(
      name: 'Your Name',
      role: 'Flutter Developer',
      initials: 'YN',
      color: HColors.feat2,
    ),
    _MemberData(
      name: 'Your Name',
      role: 'Product & UX Design',
      initials: 'YN',
      color: HColors.feat3,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 700;
    return Container(
      color: HColors.bg,
      padding: EdgeInsets.symmetric(
        vertical: HSpacing.sectionV,
        horizontal: isNarrow ? 24 : 48,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: HSpacing.maxWidth),
          child: Column(
            children: [
              const SectionLabel(label: 'OUR TEAM'),
              const SizedBox(height: 12),
              SectionTitle(title: 'The builders\nbehind Primoria', isNarrow: isNarrow),
              const SizedBox(height: 16),
              const Text(
                'A passionate team of engineers and educators united by one goal:\nmake STEM learning accessible and engaging for everyone.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: HColors.textSecondary,
                  height: 1.65,
                ),
              ),
              const SizedBox(height: 56),
              _MemberGrid(members: _members, isNarrow: isNarrow),
            ],
          ),
        ),
      ),
    );
  }
}

class _MemberData {
  final String name;
  final String role;
  final String initials;
  final Color color;

  const _MemberData({
    required this.name,
    required this.role,
    required this.initials,
    required this.color,
  });
}

class _MemberGrid extends StatelessWidget {
  final List<_MemberData> members;
  final bool isNarrow;
  const _MemberGrid({required this.members, required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    if (isNarrow) {
      return Column(
        children: members
            .map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _MemberCard(data: m),
              ),
            )
            .toList(),
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: members.asMap().entries.map((entry) {
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              left: entry.key > 0 ? 16 : 0,
            ),
            child: _MemberCard(data: entry.value),
          ),
        );
      }).toList(),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final _MemberData data;
  const _MemberCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: HColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: HColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  data.color,
                  data.color.withValues(alpha: 0.6),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                data.initials,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            data.name,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: HColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.role,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: HColors.textSecondary,
              fontWeight: FontWeight.w500,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
