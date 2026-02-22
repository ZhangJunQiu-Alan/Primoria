import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/section_headers.dart';

class TechStackSection extends StatelessWidget {
  const TechStackSection({super.key});

  static const _techs = [
    _TechData(icon: Icons.flutter_dash, label: 'Flutter', sub: 'Web + Mobile'),
    _TechData(icon: Icons.storage_rounded, label: 'Supabase', sub: 'Auth + DB'),
    _TechData(
        icon: Icons.auto_awesome_rounded, label: 'Google Gemini', sub: 'AI Engine'),
    _TechData(
        icon: Icons.table_chart_rounded, label: 'PostgreSQL', sub: 'Relational DB'),
    _TechData(icon: Icons.cloud_rounded, label: 'GitHub Pages', sub: 'Web Hosting'),
    _TechData(
        icon: Icons.lock_rounded, label: 'Row-Level Security', sub: 'Data Privacy'),
  ];

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.of(context).size.width < 700;
    return Container(
      color: HColors.surface,
      padding: EdgeInsets.symmetric(
        vertical: HSpacing.sectionV,
        horizontal: isNarrow ? 24 : 48,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: HSpacing.maxWidth),
          child: Column(
            children: [
              const SectionLabel(label: 'TECHNOLOGY'),
              const SizedBox(height: 12),
              SectionTitle(title: 'Built on proven,\nscalable tools', isNarrow: isNarrow),
              const SizedBox(height: 60),
              _TechGrid(techs: _techs, isNarrow: isNarrow),
              const SizedBox(height: 56),
              _ArchitectureDiagram(),
            ],
          ),
        ),
      ),
    );
  }
}

class _TechData {
  final IconData icon;
  final String label;
  final String sub;
  const _TechData({required this.icon, required this.label, required this.sub});
}

class _TechGrid extends StatelessWidget {
  final List<_TechData> techs;
  final bool isNarrow;
  const _TechGrid({required this.techs, required this.isNarrow});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      alignment: WrapAlignment.center,
      children: techs.map((t) => _TechBadge(data: t)).toList(),
    );
  }
}

class _TechBadge extends StatelessWidget {
  final _TechData data;
  const _TechBadge({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: HColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(data.icon, color: HColors.primary, size: 22),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                data.label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: HColors.textPrimary,
                ),
              ),
              Text(
                data.sub,
                style: const TextStyle(
                  fontSize: 11,
                  color: HColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ArchitectureDiagram extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0F172A),
            const Color(0xFF1A1040),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Text(
            'System Architecture',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 32),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _ArchNode(label: 'Builder', sub: 'Flutter Web\nCourse Editor', color: HColors.feat1),
              _ArchArrow(label: 'export JSON'),
              _ArchNode(label: 'Supabase', sub: 'PostgreSQL\nAuth + Storage', color: HColors.feat2),
              _ArchArrow(label: 'fetch course'),
              _ArchNode(label: 'Viewer', sub: 'Flutter App\nStudent Experience', color: HColors.feat3),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            height: 1,
            color: Colors.white.withValues(alpha: 0.1),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 24,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            children: [
              _ArchFooterItem(icon: Icons.auto_awesome_rounded, label: 'Gemini AI Agent'),
              _ArchFooterItem(icon: Icons.shield_rounded, label: 'Row-Level Security'),
              _ArchFooterItem(icon: Icons.sync_rounded, label: 'Real-time Sync'),
            ],
          ),
        ],
      ),
    );
  }
}

class _ArchNode extends StatelessWidget {
  final String label;
  final String sub;
  final Color color;
  const _ArchNode({required this.label, required this.sub, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            sub,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 11,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _ArchArrow extends StatelessWidget {
  final String label;
  const _ArchArrow({required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Icon(
          Icons.arrow_forward_rounded,
          color: Colors.white38,
          size: 20,
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.3),
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _ArchFooterItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ArchFooterItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: HColors.primary, size: 14),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.6),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
