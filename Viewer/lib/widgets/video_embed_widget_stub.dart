import 'package:flutter/material.dart';
import '../theme/theme.dart';

/// Non-web fallback for video playback.
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
        color: AppColors.backgroundDark,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.play_circle_outline,
              size: 44,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              title?.trim().isNotEmpty == true
                  ? title!.trim()
                  : 'Video playback is available on Web.',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
