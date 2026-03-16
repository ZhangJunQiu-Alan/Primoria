/// Runtime widget for interactive-visual blocks.
/// Renders AI-generated HTML/JS canvas animations via a sandboxed iframe.
library;

import 'package:flutter/material.dart';
import '../../models/block.dart' show InteractiveVisualContent;
import '../../theme/design_tokens.dart';
import 'html_animation_widget.dart';

class InteractiveVisualWidget extends StatelessWidget {
  final InteractiveVisualContent content;
  final bool isPreview;
  final double? forcedHeight;

  const InteractiveVisualWidget({
    super.key,
    required this.content,
    this.isPreview = false,
    this.forcedHeight,
  });

  @override
  Widget build(BuildContext context) {
    final height = forcedHeight ?? 320.0;
    final html = content.legacyCustomHtml;

    if (html != null && html.isNotEmpty) {
      return HtmlAnimationWidget(htmlContent: html, height: height);
    }

    // Empty state — no HTML generated yet
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.auto_awesome, color: AppColors.neutral400, size: 28),
            SizedBox(height: AppSpacing.sm),
            Text(
              'Interactive Visual',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.neutral500,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Use AI Generation to create a simulation',
              style: TextStyle(fontSize: 11, color: AppColors.neutral400),
            ),
          ],
        ),
      ),
    );
  }
}
