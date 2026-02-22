import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/section_headers.dart';

class FeaturesSection extends StatelessWidget {
  const FeaturesSection({super.key});

  static const _features = [
    _FeatureData(
      icon: Icons.picture_as_pdf_rounded,
      color: HColors.feat1,
      title: 'PDF → Course Generation',
      subtitle: 'Upload. Done.',
      description:
          'Upload any PDF textbook or research paper. Gemini AI reads the structure, identifies chapters, and auto-generates lesson pages, quizzes, and interactive exercises.',
      tag: 'Powered by Gemini',
    ),
    _FeatureData(
      icon: Icons.auto_awesome_rounded,
      color: HColors.feat2,
      title: 'AI Block Generator',
      subtitle: 'One prompt, one block.',
      description:
          'Describe what you need — animations, code playgrounds, fill-in-the-blank exercises. The AI Agent generates a fully functional interactive block in seconds.',
      tag: 'Multi-modal',
    ),
    _FeatureData(
      icon: Icons.route_rounded,
      color: HColors.feat3,
      title: 'Smart Learning Paths',
      subtitle: 'Adapts in real time.',
      description:
          "Based on quiz scores and engagement patterns, the system automatically adjusts the difficulty and order of lessons to match each learner's pace.",
      tag: 'Adaptive AI',
    ),
    _FeatureData(
      icon: Icons.chat_bubble_rounded,
      color: HColors.feat4,
      title: 'Course Q&A Agent',
      subtitle: 'Ask. Get context.',
      description:
          'Students ask questions directly in the lesson. An AI Agent searches the course knowledge base and returns precise, context-aware answers grounded in the lesson content.',
      tag: 'RAG-based',
    ),
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
              const SectionLabel(label: 'AI CAPABILITIES'),
              const SizedBox(height: 12),
              SectionTitle(
                title: 'Four ways AI\nreinvents STEM learning',
                isNarrow: isNarrow,
              ),
              const SizedBox(height: 16),
              Text(
                'Each feature is an autonomous AI Agent — it plans, executes, and validates without manual steps.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  color: HColors.textSecondary,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 60),
              _FeatureGrid(isNarrow: isNarrow, features: _features),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureData {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String description;
  final String tag;

  const _FeatureData({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.tag,
  });
}

class _FeatureGrid extends StatelessWidget {
  final bool isNarrow;
  final List<_FeatureData> features;
  const _FeatureGrid({required this.isNarrow, required this.features});

  @override
  Widget build(BuildContext context) {
    if (isNarrow) {
      return Column(
        children: features
            .map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: _FeatureCard(data: f),
                ))
            .toList(),
      );
    }
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 20,
      mainAxisSpacing: 20,
      childAspectRatio: 1.5,
      children: features.map((f) => _FeatureCard(data: f)).toList(),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final _FeatureData data;
  const _FeatureCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: data.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(data.icon, color: data.color, size: 24),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: data.color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  data.tag,
                  style: TextStyle(
                    fontSize: 11,
                    color: data.color,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            data.title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: HColors.textPrimary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.subtitle,
            style: TextStyle(
              fontSize: 13,
              color: data.color,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            data.description,
            style: const TextStyle(
              fontSize: 14,
              color: HColors.textSecondary,
              height: 1.65,
            ),
          ),
        ],
      ),
    );
  }
}

