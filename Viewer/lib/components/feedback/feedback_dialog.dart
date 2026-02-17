import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/theme.dart';

/// Feedback type
enum FeedbackType { success, failure }

/// Feedback dialog component
class FeedbackDialog extends StatefulWidget {
  final FeedbackType type;
  final String title;
  final String message;
  final String? explanation;
  final String primaryButtonText;
  final String? secondaryButtonText;
  final VoidCallback onPrimaryTap;
  final VoidCallback? onSecondaryTap;
  final bool showConfetti;

  const FeedbackDialog({
    super.key,
    required this.type,
    required this.title,
    required this.message,
    this.explanation,
    required this.primaryButtonText,
    this.secondaryButtonText,
    required this.onPrimaryTap,
    this.onSecondaryTap,
    this.showConfetti = true,
  });

  /// Show feedback dialog
  static Future<void> show(
    BuildContext context, {
    required FeedbackType type,
    required String title,
    required String message,
    String? explanation,
    required String primaryButtonText,
    String? secondaryButtonText,
    required VoidCallback onPrimaryTap,
    VoidCallback? onSecondaryTap,
    bool showConfetti = true,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, animation, secondaryAnimation) {
        return FeedbackDialog(
          type: type,
          title: title,
          message: message,
          explanation: explanation,
          primaryButtonText: primaryButtonText,
          secondaryButtonText: secondaryButtonText,
          onPrimaryTap: onPrimaryTap,
          onSecondaryTap: onSecondaryTap,
          showConfetti: showConfetti,
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero)
              .animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
              ),
          child: FadeTransition(opacity: animation, child: child),
        );
      },
    );
  }

  @override
  State<FeedbackDialog> createState() => _FeedbackDialogState();
}

class _FeedbackDialogState extends State<FeedbackDialog>
    with TickerProviderStateMixin {
  late AnimationController _iconController;
  late AnimationController _shakeController;
  late Animation<double> _iconScale;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();

    // Icon animation
    _iconController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _iconScale = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _iconController, curve: Curves.elasticOut),
    );

    // Shake animation (used on failure)
    _shakeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _shakeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticOut),
    );

    // Trigger animation and haptic feedback
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _iconController.forward();
      if (widget.type == FeedbackType.success) {
        HapticFeedback.mediumImpact();
      } else {
        _shakeController.forward();
        HapticFeedback.heavyImpact();
      }
    });
  }

  @override
  void dispose() {
    _iconController.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  Color get _primaryColor => widget.type == FeedbackType.success
      ? AppColors.success
      : AppColors.warning;

  IconData get _iconData =>
      widget.type == FeedbackType.success ? Icons.check_circle : Icons.cancel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _shakeAnimation,
        builder: (context, child) {
          final shakeOffset = widget.type == FeedbackType.failure
              ? (1 - _shakeAnimation.value) *
                    10 *
                    _shakeWave(_shakeAnimation.value)
              : 0.0;

          return Transform.translate(
            offset: Offset(shakeOffset, 0),
            child: child,
          );
        },
        child: Container(
          margin: AppSpacing.horizontalLg,
          constraints: const BoxConstraints(maxWidth: 340),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: AppRadius.borderRadiusXxl,
            boxShadow: AppShadows.lg,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon
                ScaleTransition(
                  scale: _iconScale,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _primaryColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_iconData, size: 48, color: _primaryColor),
                  ),
                ),
                AppSpacing.verticalGapLg,

                // Title
                Text(
                  widget.title,
                  style: AppTypography.feedbackTitle,
                  textAlign: TextAlign.center,
                ),
                AppSpacing.verticalGapMd,

                // Message
                Text(
                  widget.message,
                  style: AppTypography.feedbackMessage,
                  textAlign: TextAlign.center,
                ),

                // Explanation
                if (widget.explanation != null) ...[
                  AppSpacing.verticalGapMd,
                  Container(
                    padding: AppSpacing.paddingMd,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: AppRadius.borderRadiusMd,
                    ),
                    child: Text(
                      widget.explanation!,
                      style: AppTypography.body2,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
                AppSpacing.verticalGapLg,

                // Primary button - 3D green style
                SizedBox(
                  width: double.infinity,
                  child: _Duo3DButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      widget.onPrimaryTap();
                    },
                    color: _primaryColor,
                    child: Text(
                      widget.primaryButtonText,
                      style: AppTypography.button,
                    ),
                  ),
                ),

                // Secondary button
                if (widget.secondaryButtonText != null) ...[
                  AppSpacing.verticalGapSm,
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        widget.onSecondaryTap?.call();
                      },
                      child: Text(
                        widget.secondaryButtonText!,
                        style: AppTypography.button.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Shake wave function
  double _shakeWave(double t) {
    return (1 - t) * (1 - t) * (2 * t - 1) * 8;
  }
}

/// Duolingo-style 3D raised button
class _Duo3DButton extends StatefulWidget {
  final VoidCallback onPressed;
  final Color color;
  final Widget child;

  const _Duo3DButton({
    required this.onPressed,
    required this.color,
    required this.child,
  });

  @override
  State<_Duo3DButton> createState() => _Duo3DButtonState();
}

class _Duo3DButtonState extends State<_Duo3DButton> {
  bool _isPressed = false;

  Color get _shadowColor {
    final hsl = HSLColor.fromColor(widget.color);
    return hsl.withLightness((hsl.lightness - 0.15).clamp(0.0, 1.0)).toColor();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onPressed();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 80),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
        margin: EdgeInsets.only(
          top: _isPressed ? 4 : 0,
          bottom: _isPressed ? 0 : 4,
        ),
        decoration: BoxDecoration(
          color: widget.color,
          borderRadius: AppRadius.borderRadiusFull,
          border: Border(
            bottom: BorderSide(
              color: _isPressed ? widget.color : _shadowColor,
              width: _isPressed ? 0 : 4,
            ),
          ),
        ),
        child: Center(child: widget.child),
      ),
    );
  }
}

/// Convenience methods for feedback
extension FeedbackDialogExtension on BuildContext {
  /// Show success feedback
  Future<void> showSuccessFeedback({
    String title = 'Awesome!',
    required String message,
    String? explanation,
    String buttonText = 'Continue',
    required VoidCallback onContinue,
  }) {
    return FeedbackDialog.show(
      this,
      type: FeedbackType.success,
      title: title,
      message: message,
      explanation: explanation,
      primaryButtonText: buttonText,
      onPrimaryTap: onContinue,
    );
  }

  /// Show failure feedback
  Future<void> showFailureFeedback({
    String title = 'Try Again',
    required String message,
    String? explanation,
    String retryButtonText = 'Retry',
    String? hintButtonText,
    required VoidCallback onRetry,
    VoidCallback? onHint,
  }) {
    return FeedbackDialog.show(
      this,
      type: FeedbackType.failure,
      title: title,
      message: message,
      explanation: explanation,
      primaryButtonText: retryButtonText,
      secondaryButtonText: hintButtonText,
      onPrimaryTap: onRetry,
      onSecondaryTap: onHint,
    );
  }
}
