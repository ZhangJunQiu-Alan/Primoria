import 'package:flutter/material.dart';
import '../theme/theme.dart';
import 'lesson_screen.dart';

/// Level map screen — ported from Figma LevelMapScreen template
class LevelMapScreen extends StatelessWidget {
  const LevelMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F9FF),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              children: [
                _buildHeader(context),
                Expanded(child: _buildLevelMap(context)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      color: const Color(0xFFF0F9FF).withValues(alpha: 0.9),
      child: Row(
        children: [
          // Back button
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x08000000),
                    blurRadius: 4,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
              child: const Icon(
                Icons.chevron_left,
                size: 24,
                color: Color(0xFF334155),
              ),
            ),
          ),
          const Spacer(),
          const Text(
            'Module 1',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 18,
              color: Color(0xFF1E293B),
            ),
          ),
          const Spacer(),
          // Star counter
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x08000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.star_rounded,
                  size: 16,
                  color: Color(0xFFFBBF24),
                ),
                const SizedBox(width: 4),
                Text(
                  '5',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF475569),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelMap(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        children: [
          // Completed node 1 (offset right)
          _buildLevelNode(status: _NodeStatus.completed, offset: 40.0),
          const SizedBox(height: 48),
          // Completed node 2 (offset left)
          _buildLevelNode(status: _NodeStatus.completed, offset: -40.0),
          const SizedBox(height: 48),
          // Current active node (centered, with card)
          _buildCurrentLevelCard(context),
          const SizedBox(height: 48),
          // Locked node 1
          _buildLevelNode(status: _NodeStatus.locked, offset: 50.0),
          const SizedBox(height: 48),
          // Locked node 2
          _buildLevelNode(status: _NodeStatus.locked, offset: -30.0),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildLevelNode({
    required _NodeStatus status,
    required double offset,
  }) {
    final isLocked = status == _NodeStatus.locked;
    return Transform.translate(
      offset: Offset(offset, 0),
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: isLocked ? const Color(0xFFE2E8F0) : const Color(0xFF34D399),
          shape: BoxShape.circle,
          border: Border(
            bottom: BorderSide(
              color: isLocked
                  ? const Color(0xFFCBD5E1)
                  : const Color(0xFF059669),
              width: 4,
            ),
          ),
          boxShadow: isLocked
              ? null
              : [
                  BoxShadow(
                    color: const Color(0xFF34D399).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Icon(
          isLocked ? Icons.lock : Icons.check,
          color: isLocked ? const Color(0xFF94A3B8) : Colors.white,
          size: 28,
          weight: 700,
        ),
      ),
    );
  }

  Widget _buildCurrentLevelCard(BuildContext context) {
    return Column(
      children: [
        // Popover tip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text(
            'Learn Strings!',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
        // Arrow
        CustomPaint(size: const Size(12, 6), painter: _ArrowPainter()),
        const SizedBox(height: 4),
        // Glow + card
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF818CF8).withValues(alpha: 0.3),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Container(
            width: 256,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.indigo50, width: 2),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A000000),
                  blurRadius: 20,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                // Icon
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.terminal,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                // Title
                const Text(
                  'Variables & Types',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Lesson 3 of 5',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 16),
                // Start button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const LessonScreen(
                            lessonId: 'variables',
                            lessonTitle: 'Variables & Types',
                            gradient: AppColors.indigoGradient,
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.indigo600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Start Coding',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

enum _NodeStatus { completed, locked }

class _ArrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF1E293B);
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
