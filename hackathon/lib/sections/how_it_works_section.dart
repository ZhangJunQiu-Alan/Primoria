import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/section_headers.dart';

class HowItWorksSection extends StatelessWidget {
  const HowItWorksSection({super.key});

  static const _steps = [
    _StepData(
      step: '01',
      icon: Icons.upload_file_rounded,
      title: 'Upload Content',
      description: 'Teacher uploads a PDF textbook, slides, or raw notes.',
      color: HColors.feat1,
    ),
    _StepData(
      step: '02',
      icon: Icons.psychology_rounded,
      title: 'AI Analyzes',
      description:
          'Gemini Agent reads structure, identifies chapters, learning objectives, and key concepts.',
      color: HColors.feat2,
    ),
    _StepData(
      step: '03',
      icon: Icons.dashboard_rounded,
      title: 'Course Created',
      description:
          'Pages, blocks, quizzes, and animations are generated and published to Supabase.',
      color: HColors.feat3,
    ),
    _StepData(
      step: '04',
      icon: Icons.school_rounded,
      title: 'Students Learn',
      description:
          'Learners access an interactive course with AI Q&A and adaptive paths on any device.',
      color: HColors.feat4,
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
              const SectionLabel(label: 'HOW IT WORKS'),
              const SizedBox(height: 12),
              SectionTitle(
                title: 'From PDF to lesson\nin four steps',
                isNarrow: isNarrow,
              ),
              const SizedBox(height: 60),
              isNarrow ? _VerticalFlow(steps: _steps) : _HorizontalFlow(steps: _steps),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepData {
  final String step;
  final IconData icon;
  final String title;
  final String description;
  final Color color;

  const _StepData({
    required this.step,
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });
}

class _HorizontalFlow extends StatelessWidget {
  final List<_StepData> steps;
  const _HorizontalFlow({required this.steps});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          Expanded(child: _StepCard(data: steps[i])),
          if (i < steps.length - 1)
            Padding(
              padding: const EdgeInsets.only(top: 36),
              child: Icon(
                Icons.arrow_forward_rounded,
                color: HColors.textSecondary.withValues(alpha: 0.3),
                size: 28,
              ),
            ),
        ],
      ],
    );
  }
}

class _VerticalFlow extends StatelessWidget {
  final List<_StepData> steps;
  const _VerticalFlow({required this.steps});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          _StepCard(data: steps[i]),
          if (i < steps.length - 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Icon(
                Icons.arrow_downward_rounded,
                color: HColors.textSecondary.withValues(alpha: 0.3),
                size: 24,
              ),
            ),
        ],
      ],
    );
  }
}

class _StepCard extends StatelessWidget {
  final _StepData data;
  const _StepCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Step number + icon
        Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: data.color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: data.color.withValues(alpha: 0.25),
                  width: 1.5,
                ),
              ),
              child: Icon(data.icon, color: data.color, size: 30),
            ),
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: data.color,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  data.step,
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          data.title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: HColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Text(
            data.description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: HColors.textSecondary,
              height: 1.6,
            ),
          ),
        ),
      ],
    );
  }
}
