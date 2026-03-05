import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

/// Stub for non-web platforms: shows a placeholder instead of the iframe.
class HtmlAnimationWidget extends StatelessWidget {
  final String htmlContent;
  final double height;

  const HtmlAnimationWidget({
    super.key,
    required this.htmlContent,
    this.height = 300,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.neutral100,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral200),
      ),
      child: const Center(
        child: Text(
          'HTML animation preview is only available on Web.',
          style: TextStyle(
            fontSize: AppFontSize.sm,
            color: AppColors.neutral500,
          ),
        ),
      ),
    );
  }
}
