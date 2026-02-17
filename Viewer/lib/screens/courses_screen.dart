import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/theme.dart';

/// Community screen — ported from Figma FriendsScreen template
/// (file kept as courses_screen.dart for routing compatibility)
class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen>
    with TickerProviderStateMixin {
  String _view = 'find'; // 'find' or 'message'
  bool _showMenu = false;

  // Galaxy user data
  static const _galaxyUsers = [
    _GalaxyUser(1, '大清话', 50, 45, Color(0xFF22D3EE), 'large', 0),
    _GalaxyUser(2, 'Mia小夏', 48, 50, Color(0xFFF472B6), 'large', 0.3),
    _GalaxyUser(3, 'xX', 52, 48, Colors.white, 'medium', 0.6),
    _GalaxyUser(4, '抹茶', 40, 45, Color(0xFF22D3EE), 'medium', 0.2),
    _GalaxyUser(5, '沈术士', 45, 38, Color(0xFFF9A8D4), 'medium', 0.5),
    _GalaxyUser(6, '无限星消风', 55, 38, Color(0xFF34D399), 'medium', 0.8),
    _GalaxyUser(7, '一起吃冬瓜', 60, 45, Color(0xFFF9A8D4), 'medium', 1.1),
    _GalaxyUser(8, '墓放独主', 55, 55, Color(0xFF22D3EE), 'medium', 1.4),
    _GalaxyUser(9, '侣人', 45, 55, Color(0xFFF9A8D4), 'medium', 1.7),
    _GalaxyUser(10, 'bsh', 40, 52, Color(0xFFF9A8D4), 'medium', 2.0),
    _GalaxyUser(11, '爱吃香菜 🍀', 50, 58, Color(0xFFF9A8D4), 'medium', 2.3),
    _GalaxyUser(12, '跨的透明人', 35, 30, Color(0xFFCBD5E1), 'small', 0.4),
    _GalaxyUser(13, 'dragon', 42, 25, Color(0xFF94A3B8), 'small', 0.7),
    _GalaxyUser(14, '野', 50, 23, Color(0xFFF9A8D4), 'small', 1.0),
    _GalaxyUser(15, '&dnajaj', 58, 25, Color(0xFF94A3B8), 'small', 1.3),
    _GalaxyUser(16, 'rainbow', 65, 30, Color(0xFF94A3B8), 'small', 1.6),
    _GalaxyUser(17, '越自由', 70, 40, Color(0xFFF87171), 'small', 0.9),
    _GalaxyUser(18, '城边配', 72, 48, Color(0xFF94A3B8), 'small', 1.2),
    _GalaxyUser(19, '汉音夜飘', 70, 55, Color(0xFF94A3B8), 'small', 1.5),
    _GalaxyUser(20, 'momo', 65, 62, Color(0xFFF9A8D4), 'small', 1.8),
    _GalaxyUser(21, '小小', 58, 68, Color(0xFFF9A8D4), 'small', 2.1),
    _GalaxyUser(22, '心碎小狗', 50, 70, Color(0xFF22D3EE), 'small', 2.4),
    _GalaxyUser(23, '爱吃生蚝', 42, 68, Color(0xFF34D399), 'small', 2.7),
    _GalaxyUser(24, 'DN', 35, 62, Color(0xFF22D3EE), 'small', 3.0),
    _GalaxyUser(25, '电灯泡', 28, 48, Color(0xFFF9A8D4), 'small', 0.6),
    _GalaxyUser(26, 'Souler', 30, 40, Color(0xFF34D399), 'small', 1.1),
    _GalaxyUser(27, '喔过阴花', 32, 35, Color(0xFFF9A8D4), 'small', 1.9),
  ];

  static const _conversations = [
    _Conversation(
      1,
      'Sarah Connor',
      'Python functions are so interesting!',
      '10:30',
      true,
    ),
    _Conversation(
      2,
      'Mike Chen',
      'Want to practice coding together tomorrow?',
      '09:15',
      true,
    ),
    _Conversation(
      3,
      'Jessica Lee',
      'Thank you for your help!',
      'Yesterday',
      false,
    ),
    _Conversation(
      4,
      'Python Study Group',
      "Alex: Today's homework is too hard...",
      'Yesterday',
      false,
    ),
    _Conversation(5, 'David Park', 'See you this weekend!', 'Wed', false),
  ];

  late final List<AnimationController> _floatControllers;

  @override
  void initState() {
    super.initState();
    _floatControllers = List.generate(
      _galaxyUsers.length,
      (i) => AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 3000 + (i * 200 % 2000)),
      )..repeat(reverse: true),
    );
  }

  @override
  void dispose() {
    for (final c in _floatControllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _view == 'find' ? _buildFindView() : _buildMessageView(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
      color: Colors.white,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),
          // Find tab
          GestureDetector(
            onTap: () => setState(() => _view = 'find'),
            child: Column(
              children: [
                Text(
                  'find',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _view == 'find'
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  height: 2,
                  width: 30,
                  color: _view == 'find'
                      ? const Color(0xFF0F172A)
                      : Colors.transparent,
                ),
              ],
            ),
          ),
          const SizedBox(width: 32),
          // Message tab
          GestureDetector(
            onTap: () => setState(() => _view = 'message'),
            child: Column(
              children: [
                Text(
                  'message',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _view == 'message'
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  height: 2,
                  width: 50,
                  color: _view == 'message'
                      ? const Color(0xFF0F172A)
                      : Colors.transparent,
                ),
              ],
            ),
          ),
          const Spacer(),
          // Add friend button
          GestureDetector(
            onTap: () => setState(() => _showMenu = !_showMenu),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.person_add_outlined,
                size: 20,
                color: Color(0xFF334155),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFindView() {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.galaxyGradient),
      child: Column(
        children: [
          // Galaxy area
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  children: [
                    for (int i = 0; i < _galaxyUsers.length; i++)
                      _buildPlanet(_galaxyUsers[i], i, constraints),
                  ],
                );
              },
            ),
          ),
          // Find button
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: AppColors.galaxyGradient,
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFCBD5E1),
                  side: const BorderSide(color: Color(0xFFCBD5E1), width: 2),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Find',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanet(_GalaxyUser user, int index, BoxConstraints constraints) {
    final controller = _floatControllers[index];
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final yOffset = math.sin(controller.value * math.pi) * 8;
        final xOffset = math.cos(controller.value * math.pi * 0.7) * 4;
        return Positioned(
          left: constraints.maxWidth * user.x / 100 - 20 + xOffset,
          top: constraints.maxHeight * user.y / 100 - 20 + yOffset,
          child: child!,
        );
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Planet dot
          Container(
            width: _planetSize(user.size),
            height: _planetSize(user.size),
            decoration: BoxDecoration(
              color: user.color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: user.color.withValues(alpha: 0.6),
                  blurRadius: 12,
                  spreadRadius: 4,
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          // Name label
          Text(
            user.name,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w500,
              color: const Color(0xFFCBD5E1),
            ),
          ),
        ],
      ),
    );
  }

  double _planetSize(String size) {
    switch (size) {
      case 'large':
        return 20;
      case 'medium':
        return 16;
      default:
        return 12;
    }
  }

  Widget _buildMessageView() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'search box',
                  hintStyle: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  prefixIcon: const Icon(
                    Icons.search,
                    color: Color(0xFF94A3B8),
                    size: 20,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
          // Conversation list
          Expanded(
            child: ListView.builder(
              itemCount: _conversations.length,
              itemBuilder: (context, index) {
                return _buildConversationItem(_conversations[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationItem(_Conversation conv) {
    return InkWell(
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
        ),
        child: Row(
          children: [
            // Avatar
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFE2E8F0),
                  child: Text(
                    conv.name[0],
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF64748B),
                      fontSize: 18,
                    ),
                  ),
                ),
                if (conv.unread)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Center(
                        child: Text(
                          '1',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 16),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        conv.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        conv.time,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conv.message,
                    style: TextStyle(
                      fontSize: 14,
                      color: conv.unread
                          ? const Color(0xFF0F172A)
                          : const Color(0xFF64748B),
                      fontWeight: conv.unread
                          ? FontWeight.w500
                          : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GalaxyUser {
  final int id;
  final String name;
  final double x;
  final double y;
  final Color color;
  final String size;
  final double floatDelay;
  const _GalaxyUser(
    this.id,
    this.name,
    this.x,
    this.y,
    this.color,
    this.size,
    this.floatDelay,
  );
}

class _Conversation {
  final int id;
  final String name;
  final String message;
  final String time;
  final bool unread;
  const _Conversation(this.id, this.name, this.message, this.time, this.unread);
}
