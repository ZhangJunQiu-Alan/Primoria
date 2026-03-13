import 'package:flutter/material.dart';

import '../../theme/design_tokens.dart';

/// Non-web fallback for video previews.
class VideoEmbedWidget extends StatelessWidget {
  final String url;
  final String? title;
  final double height;

  const VideoEmbedWidget({
    super.key,
    required this.url,
    this.title,
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.neutral800,
        borderRadius: BorderRadius.circular(AppBorderRadius.sm),
        border: Border.all(color: AppColors.neutral700),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.play_circle_outline,
              size: 44,
              color: AppColors.neutral300,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              title?.trim().isNotEmpty == true
                  ? title!.trim()
                  : 'Video preview is available on Web.',
              style: const TextStyle(
                fontSize: AppFontSize.sm,
                color: AppColors.neutral300,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
