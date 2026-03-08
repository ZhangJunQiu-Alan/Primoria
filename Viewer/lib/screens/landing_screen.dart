import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/language_provider.dart';

class _C {
  const _C._();

  // Base
  static const page = Color(0xFFF5F7FF);
  static const ink = Color(0xFF0A0E1A);
  static const body = Color(0xFF4A5168);
  static const bodyMuted = Color(0xFF8891AA);
  static const surface = Color(0xFFFFFFFF);
  static const sectionAlt = Color(0xFFF0F4FF);

  // Brand accent
  static const accent = Color(0xFF11B4FF);
  static const accentDeep = Color(0xFF0D7DEB);

  // Feature card gradients
  static const feat1A = Color(0xFF11D9A8);
  static const feat1B = Color(0xFF0DA8B4);
  static const feat2A = Color(0xFF8B5CF6);
  static const feat2B = Color(0xFF6D40E7);
  static const feat3A = Color(0xFFFF7875);
  static const feat3B = Color(0xFFE85A57);
  static const feat4A = Color(0xFFFFAB40);
  static const feat4B = Color(0xFFFF7043);

  // Step accent colors
  static const step1 = Color(0xFF11B4FF);
  static const step2 = Color(0xFF8B5CF6);
  static const step3 = Color(0xFF58CC02);

  // AI dark section
  static const aiDark = Color(0xFF080D28);
  static const aiSurface = Color(0xFF111839);
  static const aiPurple = Color(0xFF8B5CF6);

  // Gamification
  static const xpGold = Color(0xFFFFB347);
  static const streakFire = Color(0xFFFF6B00);

  // Community
  static const communityA = Color(0xFF0D7DEB);
  static const communityB = Color(0xFF0B5CBA);

  // Footer
  static const footer = Color(0xFF060E2A);
}

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _featuresKey = GlobalKey();
  final GlobalKey _howItWorksKey = GlobalKey();
  final GlobalKey _aiKey = GlobalKey();
  final GlobalKey _communityKey = GlobalKey();
  final GlobalKey _contactKey = GlobalKey();

  late final AnimationController _introCtrl;
  late final Animation<double> _fade;
  late final Animation<Offset> _liftIn;

  static const Map<String, String> _zhTexts = {
    'Features': '功能',
    'How It Works': '学习流程',
    'AI Tutor': 'AI导师',
    'Community': '社区',
    'Log In': '登录',
    'Get Started': '立即开始',
    'Start Free': '免费开始',
    'AI-Powered Learning — Now Available': 'AI驱动学习，现已上线',
    'Master Any\nSubject — ': '掌握任何\n学科 — ',
    'Level Up\nEvery Day': '每天都能\n升级进步',
    'Interactive STEM lessons, real-time AI guidance, and a community of study buddies. Stop watching — start doing.':
        '互动式 STEM 课程、实时 AI 指导，以及学习伙伴社区。别再只看视频，现在就动手学习。',
    'Start Learning Free': '免费开始学习',
    'Explore Courses': '探索课程',
    'Free to start': '免费起步',
    'No credit card': '无需信用卡',
    'Cancel anytime': '随时取消',
    'Active Learners': '活跃学习者',
    'Interactive Courses': '互动课程',
    'Average Rating': '平均评分',
    'Countries Reached': '覆盖国家',
    'Learn By Doing': '动手学',
    'Interactive, not passive': '互动学习，拒绝被动',
    'Tap-to-reveal explanations': '点击展开讲解',
    'Interactive sliders & simulations': '交互滑杆与模拟',
    'Code playgrounds — run & debug': '代码练习场：运行与调试',
    'Fill-in-the-blank challenges': '填空挑战',
    'Instant right/wrong feedback': '即时对错反馈',
    'AI Personal Tutor': 'AI 个性导师',
    'Powered by Gemini AI': '由 Gemini AI 提供支持',
    'Ask anything, get instant answers': '随时提问，立即解答',
    'Step-by-step problem solving': '分步骤问题求解',
    'Auto-generated mind maps': '自动生成思维导图',
    'Practice quiz generation': '自动生成练习测验',
    'Available 24 / 7, never judging': '7×24 全天在线，始终耐心',
    'Study Buddy Match': '学习搭子匹配',
    'Learning is better together': '一起学习更高效',
    'Match with same-level learners': '匹配同水平学习者',
    'Shared progress accountability': '共享进度与监督',
    'Community leaderboards': '社区排行榜',
    'Peer encouragement system': '同伴激励机制',
    'Group challenges & missions': '小组挑战与任务',
    'Level Up & Earn': '升级并赢奖励',
    'Gamified from start to finish': '全程游戏化学习',
    'Earn XP for every lesson': '每节课都能获得 XP',
    'Daily quests & bonus rewards': '每日任务与额外奖励',
    'Streak system — keep the fire': '连击系统，保持热度',
    'Unlock achievement badges': '解锁成就徽章',
    'Profile levels & ranked tiers': '个人等级与段位体系',
    'Everything You Need\nto Succeed': '成功所需，一应俱全',
    'Four pillars that make Primoria the most engaging way to learn STEM.':
        '四大核心能力，让 Primoria 成为最有沉浸感的 STEM 学习方式。',
    'Choose Your Path': '选择你的路径',
    'Browse 200+ expert-crafted courses across physics, math, computer science, and more. Filter by topic, difficulty, or duration.':
        '浏览 200+ 专家打造课程，覆盖物理、数学、计算机等领域。可按主题、难度、时长筛选。',
    'Learn Interactively': '互动式学习',
    'Every lesson is hands-on. Solve problems, run code, drag sliders — no passive video watching. Your AI tutor explains anything you\'re stuck on.':
        '每节课都强调动手实践。解题、跑代码、拖动滑杆，不再被动看视频。遇到卡点，AI 导师会立即讲解。',
    'Track & Level Up': '追踪进度并升级',
    'Earn XP, build daily streaks, unlock achievements, and climb the leaderboard. Watch your progress heatmap fill up week by week.':
        '赚取 XP、保持每日连击、解锁成就并冲击排行榜。看着你的学习热力图一周周点亮。',
    'From Zero to Expert\nin 3 Steps': '从零到高手\n只需 3 步',
    'Ask questions in plain English — no jargon needed': '用自然语言提问，无需术语',
    'Get step-by-step breakdowns of complex topics': '复杂知识点分步拆解',
    'Request practice quizzes tailored to your level': '按你的水平生成练习题',
    'Generate mind maps to visualize any concept': '把任意概念可视化为思维导图',
    'Review and replay key moments from lessons': '复盘并回放课程关键节点',
    'Your Personal AI\nTutor, Always On': '你的专属 AI\n导师，始终在线',
    'Stuck on a concept at 2 AM? Your AI tutor never sleeps. Ask anything, get clear explanations, and keep your momentum going.':
        '凌晨两点遇到难点？你的 AI 导师从不下线。随时提问，获得清晰讲解，保持学习势头。',
    'Try AI Tutor Free': '免费体验 AI 导师',
    'Gamification': '成长体系',
    'Make Every Lesson\nCount': '让每一节课\n都有价值',
    'Science says rewards wire your brain to love learning. Primoria is built on that insight — every lesson earns XP, every day extends your streak, and every milestone unlocks a new achievement.':
        '科学研究表明，奖励机制能让大脑更爱学习。Primoria 基于这一点打造：每节课赚 XP，每天延续连击，每个里程碑解锁新成就。',
    'Daily Streak': '每日连击',
    'Build momentum with unbroken learning days': '用连续学习天数建立惯性',
    'Experience Points (XP)': '经验值（XP）',
    'Every lesson, quiz, and activity earns XP': '课程、测验、活动都能获得 XP',
    'Achievement Badges': '成就徽章',
    'Unlock rare badges for reaching milestones': '达成里程碑可解锁稀有徽章',
    'Daily Quests': '每日任务',
    'Fresh missions every day to keep things interesting': '每天新任务，保持新鲜感',
    'Find Your Study Buddy': '找到你的学习搭子',
    'Learning alone is tough. Our smart matching algorithm connects you with learners at the same level, in the same topic. Motivate each other, compete on leaderboards, and hit goals together.':
        '一个人学习并不容易。我们的智能匹配算法会把你与同水平、同主题学习者连接起来。互相激励、排行榜竞争、一起达成目标。',
    'Smart Matching': '智能匹配',
    'Paired by skill level and topic interest': '按能力水平与主题兴趣匹配',
    'Leaderboards': '排行榜',
    'Weekly rankings to spark healthy competition': '每周排名激发良性竞争',
    'Group Challenges': '组队挑战',
    'Tackle special missions with your squad': '和小队一起完成特别任务',
    'Join the Community': '加入社区',
    'Testimonials': '用户评价',
    'Learners Love Primoria': '学习者喜爱 Primoria',
    'High School Student': '高中生',
    'University Sophomore': '大学二年级',
    'Self-taught Learner': '自学者',
    'Ready to Start Your\nLearning Journey?': '准备开启你的\n学习旅程了吗？',
    'Join 10,000+ learners who chose to learn by doing, not just watching.':
        '加入 10,000+ 位学习者，选择动手学习，而不只是观看。',
    'Create Free Account': '免费创建账号',
    'Learn': '学习',
    'Company': '公司',
    'About': '关于我们',
    'Blog': '博客',
    'Pricing': '价格方案',
    'Contact': '联系我们',
    'Copyright © 2026 PRIMORIA. All rights reserved. No part of this website or any of its contents may be reproduced, copied, modified, or adapted without prior written consent of the author.':
        '版权所有 © 2026 PRIMORIA。保留所有权利。未经作者事先书面同意，不得复制、修改或传播本网站及其任何内容。',
    'Interactive STEM learning, powered by AI.\nJoin thousands mastering science the fun way.':
        'AI 驱动的互动式 STEM 学习。\n加入成千上万学习者，以更有趣的方式掌握科学。',
    'Physics 101': '物理 101',
    '65% · Lesson 7 of 11': '65% · 第 7 / 11 课',
    'Day Streak': '天连击',
    'Why does E = mc²?': '为什么 E = mc²？',
    '+50 XP': '+50 XP',
    'Primoria AI Tutor': 'Primoria AI 导师',
    'Always online': '始终在线',
    'Why does water expand when it freezes? That seems counterintuitive.':
        '水在结冰时为什么会膨胀？这听起来有点反直觉。',
    'Great question! Water molecules form a rigid hexagonal lattice in ice, which actually takes up more space than the liquid arrangement. That’s why ice floats!':
        '好问题！水分子在冰中会形成刚性的六边形晶格，这种结构比液态排列占据更大体积，所以冰会浮起来。',
    'Can you quiz me on this?': '你可以就这个给我出几道题吗？',
    'Sure! Here’s a quick question: Ice is less dense than water. True or False?':
        '当然！先来个小问题：冰的密度比水低。对还是错？',
    'Ask me anything…': '随便问我...',
    '47-Day Streak': '47 天连击',
    'You\'re on fire! Keep it up.': '状态火热！继续保持。',
    'XP Progress': 'XP 进度',
    'Recent Achievements': '最近成就',
    'First Lesson': '第一节课',
    '7-Day Streak': '7 天连击',
    'Quiz Master': '测验达人',
    'Top 10%': '前 10%',
  };

  bool get _isZh => context.read<LanguageProvider>().t.isZh;
  String _s(String en) => _isZh ? (_zhTexts[en] ?? en) : en;

  @override
  void initState() {
    super.initState();
    _introCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 780),
    )..forward();
    _fade = CurvedAnimation(parent: _introCtrl, curve: Curves.easeOutCubic);
    _liftIn = Tween<Offset>(
      begin: const Offset(0, 0.03),
      end: Offset.zero,
    ).animate(_fade);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _introCtrl.dispose();
    super.dispose();
  }

  void _scrollTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx == null) return;
    Scrollable.ensureVisible(
      ctx,
      duration: const Duration(milliseconds: 550),
      curve: Curves.easeInOutCubic,
    );
  }

  void _goToLogin() => Navigator.of(context).pushNamed('/login');
  void _goToRegister() => Navigator.of(context).pushNamed('/register');

  TextStyle _headlineStyle(double size) => GoogleFonts.sora(
    fontSize: size,
    fontWeight: FontWeight.w700,
    height: 0.98,
    color: _C.ink,
  );

  TextStyle _bodyStyle(double size, {Color? color, FontWeight? weight}) =>
      GoogleFonts.manrope(
        fontSize: size,
        height: 1.55,
        color: color ?? _C.body,
        fontWeight: weight ?? FontWeight.w500,
      );

  @override
  Widget build(BuildContext context) {
    context.watch<LanguageProvider>().t;
    return Scaffold(
      backgroundColor: _C.page,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fade,
          child: SlideTransition(
            position: _liftIn,
            child: ListView(
              controller: _scrollController,
              children: [
                _buildHeader(),
                _buildHero(),
                _buildStatsBar(),
                _buildFeatures(),
                _buildHowItWorks(),
                _buildAiTutor(),
                _buildGamification(),
                _buildCommunity(),
                _buildTestimonials(),
                _buildCtaBanner(),
                _buildFooter(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Header
  // ─────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 860;
        return Container(
          color: _C.surface,
          padding: EdgeInsets.fromLTRB(wide ? 48 : 20, 14, wide ? 48 : 20, 14),
          child: Row(
            children: [
              const _BrandMark(size: 22, withGlow: false),
              const SizedBox(width: 10),
              Text(
                'PRIMORIA',
                style: GoogleFonts.sora(
                  color: _C.accent,
                  fontSize: 22,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (wide) ...[
                const Spacer(),
                _navLink(_s('Features'), () => _scrollTo(_featuresKey)),
                const SizedBox(width: 28),
                _navLink(_s('How It Works'), () => _scrollTo(_howItWorksKey)),
                const SizedBox(width: 28),
                _navLink(_s('AI Tutor'), () => _scrollTo(_aiKey)),
                const SizedBox(width: 28),
                _navLink(_s('Community'), () => _scrollTo(_communityKey)),
                const SizedBox(width: 36),
                _outlineButton(_s('Log In'), _goToLogin),
                const SizedBox(width: 12),
                _filledButton(_s('Get Started'), _goToRegister, small: true),
              ] else ...[
                const Spacer(),
                _filledButton(_s('Start Free'), _goToRegister, small: true),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _navLink(String label, VoidCallback onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(6),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
      child: Text(
        label,
        style: GoogleFonts.manrope(
          fontSize: 15,
          color: _C.body,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );

  Widget _outlineButton(String label, VoidCallback onTap) => OutlinedButton(
    onPressed: onTap,
    style: OutlinedButton.styleFrom(
      foregroundColor: _C.accentDeep,
      side: const BorderSide(color: _C.accentDeep, width: 1.5),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      textStyle: GoogleFonts.sora(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.4,
      ),
    ),
    child: Text(label),
  );

  Widget _filledButton(
    String label,
    VoidCallback onTap, {
    bool small = false,
    double? minWidth,
  }) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(9),
        gradient: const LinearGradient(
          colors: [_C.accentDeep, Color(0xFF14D7E8)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3210A6E3),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: TextButton(
        onPressed: onTap,
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          padding: EdgeInsets.symmetric(
            horizontal: small ? 20 : 32,
            vertical: small ? 10 : 16,
          ),
          minimumSize: minWidth != null ? Size(minWidth, 0) : null,
          textStyle: GoogleFonts.sora(
            fontSize: small ? 13 : 15,
            letterSpacing: 0.6,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
        ),
        child: Text(label),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Hero
  // ─────────────────────────────────────────────────────────────
  Widget _buildHero() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 980;
        final hPad = wide ? 86.0 : 28.0;

        return Container(
          color: _C.surface,
          padding: EdgeInsets.fromLTRB(
            hPad,
            wide ? 72 : 48,
            hPad,
            wide ? 88 : 56,
          ),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 6, child: _buildHeroCopy(wide: true)),
                    const SizedBox(width: 48),
                    Expanded(flex: 5, child: _HeroMockup(isWide: true)),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeroCopy(wide: false),
                    const SizedBox(height: 40),
                    Center(child: _HeroMockup(isWide: false)),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildHeroCopy({required bool wide}) {
    final hs = wide ? 60.0 : 40.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: _C.accent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _C.accent.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.auto_awesome_rounded,
                size: 14,
                color: _C.accent,
              ),
              const SizedBox(width: 6),
              Text(
                _s('AI-Powered Learning — Now Available'),
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  color: _C.accentDeep,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        RichText(
          text: TextSpan(
            style: _headlineStyle(hs),
            children: [
              TextSpan(text: _s('Master Any\nSubject — ')),
              TextSpan(
                text: _s('Level Up\nEvery Day'),
                style: _headlineStyle(hs).copyWith(color: _C.accent),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: wide ? 520 : 400),
          child: Text(
            _s(
              'Interactive STEM lessons, real-time AI guidance, and a community of study buddies. Stop watching — start doing.',
            ),
            style: _bodyStyle(wide ? 18 : 16),
          ),
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            _filledButton(_s('Start Learning Free'), _goToRegister),
            const SizedBox(width: 14),
            _outlineButton(_s('Explore Courses'), _goToLogin),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            _heroPill(Icons.check_circle_rounded, _s('Free to start')),
            const SizedBox(width: 16),
            _heroPill(Icons.check_circle_rounded, _s('No credit card')),
            const SizedBox(width: 16),
            _heroPill(Icons.check_circle_rounded, _s('Cancel anytime')),
          ],
        ),
      ],
    );
  }

  Widget _heroPill(IconData icon, String label) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 15, color: const Color(0xFF58CC02)),
      const SizedBox(width: 5),
      Text(label, style: _bodyStyle(13, color: _C.bodyMuted)),
    ],
  );

  // ─────────────────────────────────────────────────────────────
  // Stats Bar
  // ─────────────────────────────────────────────────────────────
  Widget _buildStatsBar() {
    final stats = [
      _StatData('10,000+', _s('Active Learners'), Icons.people_alt_rounded),
      _StatData('200+', _s('Interactive Courses'), Icons.school_rounded),
      _StatData('4.9 / 5', _s('Average Rating'), Icons.star_rounded),
      _StatData('50+', _s('Countries Reached'), Icons.public_rounded),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 700;
        return Container(
          decoration: BoxDecoration(
            color: _C.surface,
            border: Border(
              top: BorderSide(color: _C.accent.withValues(alpha: 0.12)),
              bottom: BorderSide(color: _C.accent.withValues(alpha: 0.12)),
            ),
          ),
          padding: EdgeInsets.symmetric(
            horizontal: wide ? 48 : 20,
            vertical: wide ? 36 : 24,
          ),
          child: wide
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: stats.map((s) => _StatBadge(data: s)).toList(),
                )
              : GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 2.2,
                  children: stats.map((s) => _StatBadge(data: s)).toList(),
                ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Features
  // ─────────────────────────────────────────────────────────────
  Widget _buildFeatures() {
    final cards = [
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat1A, _C.feat1B],
        ),
        icon: Icons.touch_app_rounded,
        title: _s('Learn By Doing'),
        subtitle: _s('Interactive, not passive'),
        bullets: [
          _s('Tap-to-reveal explanations'),
          _s('Interactive sliders & simulations'),
          _s('Code playgrounds — run & debug'),
          _s('Fill-in-the-blank challenges'),
          _s('Instant right/wrong feedback'),
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat2A, _C.feat2B],
        ),
        icon: Icons.smart_toy_rounded,
        title: _s('AI Personal Tutor'),
        subtitle: _s('Powered by Gemini AI'),
        bullets: [
          _s('Ask anything, get instant answers'),
          _s('Step-by-step problem solving'),
          _s('Auto-generated mind maps'),
          _s('Practice quiz generation'),
          _s('Available 24 / 7, never judging'),
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat3A, _C.feat3B],
        ),
        icon: Icons.group_rounded,
        title: _s('Study Buddy Match'),
        subtitle: _s('Learning is better together'),
        bullets: [
          _s('Match with same-level learners'),
          _s('Shared progress accountability'),
          _s('Community leaderboards'),
          _s('Peer encouragement system'),
          _s('Group challenges & missions'),
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat4A, _C.feat4B],
        ),
        icon: Icons.emoji_events_rounded,
        title: _s('Level Up & Earn'),
        subtitle: _s('Gamified from start to finish'),
        bullets: [
          _s('Earn XP for every lesson'),
          _s('Daily quests & bonus rewards'),
          _s('Streak system — keep the fire'),
          _s('Unlock achievement badges'),
          _s('Profile levels & ranked tiers'),
        ],
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 72.0 : 24.0;

        return Container(
          key: _featuresKey,
          color: _C.page,
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionLabel(_s('Features')),
              const SizedBox(height: 8),
              Text(
                _s('Everything You Need\nto Succeed'),
                style: _headlineStyle(wide ? 56 : 40),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Text(
                  _s(
                    'Four pillars that make Primoria the most engaging way to learn STEM.',
                  ),
                  style: _bodyStyle(wide ? 17 : 15),
                ),
              ),
              const SizedBox(height: 44),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: _FeatureCard(data: cards[0])),
                        const SizedBox(width: 24),
                        Expanded(child: _FeatureCard(data: cards[1])),
                        const SizedBox(width: 24),
                        Expanded(child: _FeatureCard(data: cards[2])),
                        const SizedBox(width: 24),
                        Expanded(child: _FeatureCard(data: cards[3])),
                      ],
                    )
                  : Column(
                      children: cards
                          .map(
                            (c) => Padding(
                              padding: const EdgeInsets.only(bottom: 20),
                              child: _FeatureCard(data: c),
                            ),
                          )
                          .toList(),
                    ),
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // How It Works
  // ─────────────────────────────────────────────────────────────
  Widget _buildHowItWorks() {
    final steps = [
      _StepData(
        number: '01',
        color: _C.step1,
        icon: Icons.explore_rounded,
        title: _s('Choose Your Path'),
        body: _s(
          'Browse 200+ expert-crafted courses across physics, math, computer science, and more. Filter by topic, difficulty, or duration.',
        ),
      ),
      _StepData(
        number: '02',
        color: _C.step2,
        icon: Icons.auto_fix_high_rounded,
        title: _s('Learn Interactively'),
        body: _s(
          'Every lesson is hands-on. Solve problems, run code, drag sliders — no passive video watching. Your AI tutor explains anything you\'re stuck on.',
        ),
      ),
      _StepData(
        number: '03',
        color: _C.step3,
        icon: Icons.trending_up_rounded,
        title: _s('Track & Level Up'),
        body: _s(
          'Earn XP, build daily streaks, unlock achievements, and climb the leaderboard. Watch your progress heatmap fill up week by week.',
        ),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 860;
        final hPad = wide ? 72.0 : 24.0;

        return Container(
          key: _howItWorksKey,
          color: _C.surface,
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionLabel(_s('How It Works')),
              const SizedBox(height: 8),
              Text(
                _s('From Zero to Expert\nin 3 Steps'),
                style: _headlineStyle(wide ? 52 : 38),
              ),
              const SizedBox(height: 48),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: steps
                          .expand(
                            (s) => [
                              Expanded(child: _HowItWorksStep(data: s)),
                              if (s != steps.last) ...[
                                const SizedBox(width: 16),
                                Padding(
                                  padding: const EdgeInsets.only(top: 40),
                                  child: Icon(
                                    Icons.arrow_forward_rounded,
                                    color: _C.bodyMuted.withValues(alpha: 0.4),
                                    size: 28,
                                  ),
                                ),
                                const SizedBox(width: 16),
                              ],
                            ],
                          )
                          .toList(),
                    )
                  : Column(
                      children: steps
                          .map(
                            (s) => Padding(
                              padding: const EdgeInsets.only(bottom: 28),
                              child: _HowItWorksStep(data: s),
                            ),
                          )
                          .toList(),
                    ),
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // AI Tutor Spotlight
  // ─────────────────────────────────────────────────────────────
  Widget _buildAiTutor() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 72.0 : 28.0;

        return Container(
          key: _aiKey,
          color: _C.aiDark,
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 5, child: _buildAiTutorCopy(wide: true)),
                    const SizedBox(width: 60),
                    Expanded(flex: 4, child: _AiChatMockup()),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildAiTutorCopy(wide: false),
                    const SizedBox(height: 40),
                    _AiChatMockup(),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildAiTutorCopy({required bool wide}) {
    final bulletStyle = GoogleFonts.manrope(
      fontSize: 15,
      color: Colors.white.withValues(alpha: 0.85),
      fontWeight: FontWeight.w500,
      height: 1.5,
    );

    final bullets = [
      _s('Ask questions in plain English — no jargon needed'),
      _s('Get step-by-step breakdowns of complex topics'),
      _s('Request practice quizzes tailored to your level'),
      _s('Generate mind maps to visualize any concept'),
      _s('Review and replay key moments from lessons'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: _C.aiPurple.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _C.aiPurple.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.smart_toy_rounded, size: 14, color: _C.aiPurple),
              const SizedBox(width: 6),
              Text(
                _s('Powered by Gemini AI'),
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  color: _C.aiPurple,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _s('Your Personal AI\nTutor, Always On'),
          style: GoogleFonts.sora(
            fontSize: wide ? 48 : 36,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _s(
            'Stuck on a concept at 2 AM? Your AI tutor never sleeps. Ask anything, get clear explanations, and keep your momentum going.',
          ),
          style: GoogleFonts.manrope(
            fontSize: 16,
            color: Colors.white.withValues(alpha: 0.7),
            height: 1.6,
          ),
        ),
        const SizedBox(height: 28),
        ...bullets.map(
          (b) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: _C.aiPurple.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    size: 12,
                    color: _C.aiPurple,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(child: Text(b, style: bulletStyle)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 32),
        _filledButton(_s('Try AI Tutor Free'), _goToRegister),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Gamification
  // ─────────────────────────────────────────────────────────────
  Widget _buildGamification() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 72.0 : 28.0;

        return Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFFFF8F0), Color(0xFFFFF3E8)],
            ),
          ),
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 5, child: _GamificationMockup()),
                    const SizedBox(width: 60),
                    Expanded(
                      flex: 5,
                      child: _buildGamificationCopy(wide: true),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildGamificationCopy(wide: false),
                    const SizedBox(height: 40),
                    _GamificationMockup(),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildGamificationCopy({required bool wide}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(_s('Gamification'), color: _C.streakFire),
        const SizedBox(height: 8),
        Text(
          _s('Make Every Lesson\nCount'),
          style: _headlineStyle(wide ? 48 : 36),
        ),
        const SizedBox(height: 16),
        Text(
          _s(
            'Science says rewards wire your brain to love learning. Primoria is built on that insight — every lesson earns XP, every day extends your streak, and every milestone unlocks a new achievement.',
          ),
          style: _bodyStyle(wide ? 17 : 15),
        ),
        const SizedBox(height: 28),
        _gamStat(
          Icons.local_fire_department_rounded,
          _C.streakFire,
          _s('Daily Streak'),
          _s('Build momentum with unbroken learning days'),
        ),
        const SizedBox(height: 14),
        _gamStat(
          Icons.star_rounded,
          _C.xpGold,
          _s('Experience Points (XP)'),
          _s('Every lesson, quiz, and activity earns XP'),
        ),
        const SizedBox(height: 14),
        _gamStat(
          Icons.emoji_events_rounded,
          const Color(0xFF6D40E7),
          _s('Achievement Badges'),
          _s('Unlock rare badges for reaching milestones'),
        ),
        const SizedBox(height: 14),
        _gamStat(
          Icons.task_alt_rounded,
          const Color(0xFF11D9A8),
          _s('Daily Quests'),
          _s('Fresh missions every day to keep things interesting'),
        ),
      ],
    );
  }

  Widget _gamStat(IconData icon, Color color, String title, String sub) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      const SizedBox(width: 14),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.sora(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: _C.ink,
              ),
            ),
            const SizedBox(height: 2),
            Text(sub, style: _bodyStyle(13, color: _C.body)),
          ],
        ),
      ),
    ],
  );

  // ─────────────────────────────────────────────────────────────
  // Community
  // ─────────────────────────────────────────────────────────────
  Widget _buildCommunity() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 72.0 : 28.0;

        return Container(
          key: _communityKey,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_C.communityA, _C.communityB],
            ),
          ),
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: Column(
            children: [
              _sectionLabel(
                _s('Community'),
                color: Colors.white.withValues(alpha: 0.7),
              ),
              const SizedBox(height: 8),
              Text(
                _s('Find Your Study Buddy'),
                style: GoogleFonts.sora(
                  fontSize: wide ? 52 : 38,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  height: 1.05,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Text(
                  _s(
                    'Learning alone is tough. Our smart matching algorithm connects you with learners at the same level, in the same topic. Motivate each other, compete on leaderboards, and hit goals together.',
                  ),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.manrope(
                    fontSize: wide ? 17 : 15,
                    color: Colors.white.withValues(alpha: 0.85),
                    height: 1.6,
                  ),
                ),
              ),
              const SizedBox(height: 48),
              wide
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _communityCard(
                          Icons.connect_without_contact_rounded,
                          _s('Smart Matching'),
                          _s('Paired by skill level and topic interest'),
                        ),
                        const SizedBox(width: 24),
                        _communityCard(
                          Icons.leaderboard_rounded,
                          _s('Leaderboards'),
                          _s('Weekly rankings to spark healthy competition'),
                        ),
                        const SizedBox(width: 24),
                        _communityCard(
                          Icons.groups_rounded,
                          _s('Group Challenges'),
                          _s('Tackle special missions with your squad'),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _communityCard(
                          Icons.connect_without_contact_rounded,
                          _s('Smart Matching'),
                          _s('Paired by skill level and topic interest'),
                        ),
                        const SizedBox(height: 16),
                        _communityCard(
                          Icons.leaderboard_rounded,
                          _s('Leaderboards'),
                          _s('Weekly rankings to spark healthy competition'),
                        ),
                        const SizedBox(height: 16),
                        _communityCard(
                          Icons.groups_rounded,
                          _s('Group Challenges'),
                          _s('Tackle special missions with your squad'),
                        ),
                      ],
                    ),
              const SizedBox(height: 40),
              _filledButton(_s('Join the Community'), _goToRegister),
            ],
          ),
        );
      },
    );
  }

  Widget _communityCard(IconData icon, String title, String sub) => Flexible(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 280),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        ),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.sora(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              sub,
              style: GoogleFonts.manrope(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.8),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ),
  );

  // ─────────────────────────────────────────────────────────────
  // Testimonials
  // ─────────────────────────────────────────────────────────────
  Widget _buildTestimonials() {
    final items = [
      _TestimonialData(
        quote: _s(
          'I used to dread physics. After two weeks on Primoria, I actually look forward to it. The interactive sliders make abstract concepts click instantly.',
        ),
        name: 'Aisha K.',
        role: _s('High School Student'),
        rating: 5,
        initials: 'AK',
        color: const Color(0xFF8B5CF6),
      ),
      _TestimonialData(
        quote: _s(
          'The AI tutor is a game-changer. I asked about quantum entanglement at midnight and got a step-by-step explanation with a quiz to test my understanding.',
        ),
        name: 'Marcus T.',
        role: _s('University Sophomore'),
        rating: 5,
        initials: 'MT',
        color: const Color(0xFF11D9A8),
      ),
      _TestimonialData(
        quote: _s(
          'My streak is at 47 days and counting! The daily quests make it hard to stop. I have learned more calculus in a month than I did in a whole semester.',
        ),
        name: 'Lingyun W.',
        role: _s('Self-taught Learner'),
        rating: 5,
        initials: 'LW',
        color: const Color(0xFFFFAB40),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 860;
        final hPad = wide ? 72.0 : 24.0;

        return Container(
          color: _C.sectionAlt,
          padding: EdgeInsets.fromLTRB(hPad, 80, hPad, 80),
          child: Column(
            children: [
              _sectionLabel(_s('Testimonials')),
              const SizedBox(height: 8),
              Text(
                _s('Learners Love Primoria'),
                style: _headlineStyle(wide ? 48 : 36),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 44),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: items
                          .map(
                            (t) => Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                ),
                                child: _TestimonialCard(data: t),
                              ),
                            ),
                          )
                          .toList(),
                    )
                  : Column(
                      children: items
                          .map(
                            (t) => Padding(
                              padding: const EdgeInsets.only(bottom: 20),
                              child: _TestimonialCard(data: t),
                            ),
                          )
                          .toList(),
                    ),
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CTA Banner
  // ─────────────────────────────────────────────────────────────
  Widget _buildCtaBanner() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 700;
        return Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0D7DEB), Color(0xFF14D7E8)],
            ),
          ),
          padding: EdgeInsets.symmetric(
            horizontal: wide ? 72 : 28,
            vertical: wide ? 80 : 60,
          ),
          child: Column(
            children: [
              Text(
                _s('Ready to Start Your\nLearning Journey?'),
                textAlign: TextAlign.center,
                style: GoogleFonts.sora(
                  fontSize: wide ? 52 : 36,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _s(
                  'Join 10,000+ learners who chose to learn by doing, not just watching.',
                ),
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(
                  fontSize: 17,
                  color: Colors.white.withValues(alpha: 0.85),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 36),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(9),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: TextButton(
                      onPressed: _goToRegister,
                      style: TextButton.styleFrom(
                        foregroundColor: _C.accentDeep,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 36,
                          vertical: 16,
                        ),
                        textStyle: GoogleFonts.sora(
                          fontSize: 15,
                          letterSpacing: 0.5,
                          fontWeight: FontWeight.w700,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9),
                        ),
                      ),
                      child: Text(_s('Create Free Account')),
                    ),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(
                    onPressed: _goToLogin,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white, width: 2),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 16,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                      textStyle: GoogleFonts.sora(
                        fontSize: 15,
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: Text(_s('Log In')),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Footer
  // ─────────────────────────────────────────────────────────────
  Widget _buildFooter() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 56.0 : 22.0;
        final headingStyle = GoogleFonts.sora(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        );
        final linkStyle = GoogleFonts.manrope(
          fontSize: 15,
          color: Colors.white.withValues(alpha: 0.82),
          fontWeight: FontWeight.w500,
        );

        return Container(
          key: _contactKey,
          color: _C.footer,
          padding: EdgeInsets.fromLTRB(hPad, 56, hPad, 32),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1160),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  wide
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 3,
                              child: _buildFooterBrand(wide: true),
                            ),
                            const SizedBox(width: 80),
                            _buildFooterColumn(
                              heading: _s('Learn'),
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  _s('Features'),
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  _s('How It Works'),
                                  () => _scrollTo(_howItWorksKey),
                                ),
                                _FooterLink(
                                  _s('AI Tutor'),
                                  () => _scrollTo(_aiKey),
                                ),
                                _FooterLink(
                                  _s('Community'),
                                  () => _scrollTo(_communityKey),
                                ),
                              ],
                            ),
                            const SizedBox(width: 72),
                            _buildFooterColumn(
                              heading: _s('Company'),
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(_s('About'), null),
                                _FooterLink(_s('Blog'), null),
                                _FooterLink(
                                  _s('Pricing'),
                                  () => Navigator.of(
                                    context,
                                  ).pushNamed('/register'),
                                ),
                                _FooterLink(
                                  _s('Contact'),
                                  () => _scrollTo(_contactKey),
                                ),
                              ],
                            ),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildFooterBrand(wide: false),
                            const SizedBox(height: 28),
                            _buildFooterColumn(
                              heading: _s('Learn'),
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  _s('Features'),
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  _s('How It Works'),
                                  () => _scrollTo(_howItWorksKey),
                                ),
                                _FooterLink(
                                  _s('AI Tutor'),
                                  () => _scrollTo(_aiKey),
                                ),
                              ],
                            ),
                            const SizedBox(height: 22),
                            _buildFooterColumn(
                              heading: _s('Company'),
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(_s('About'), null),
                                _FooterLink(_s('Blog'), null),
                                _FooterLink(
                                  _s('Contact'),
                                  () => _scrollTo(_contactKey),
                                ),
                              ],
                            ),
                          ],
                        ),
                  const SizedBox(height: 44),
                  Divider(color: Colors.white.withValues(alpha: 0.1)),
                  const SizedBox(height: 20),
                  Text(
                    _s(
                      'Copyright © 2026 PRIMORIA. All rights reserved. No part of this website or any of its contents may be reproduced, copied, modified, or adapted without prior written consent of the author.',
                    ),
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.5),
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFooterBrand({required bool wide}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const _BrandMark(size: 22, withGlow: false),
            const SizedBox(width: 10),
            Text(
              'PRIMORIA',
              style: GoogleFonts.sora(
                color: Colors.white,
                fontSize: 26,
                letterSpacing: 1,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: wide ? 360 : double.infinity),
          child: Text(
            _s(
              'Interactive STEM learning, powered by AI.\nJoin thousands mastering science the fun way.',
            ),
            style: GoogleFonts.manrope(
              fontSize: 15,
              color: Colors.white.withValues(alpha: 0.7),
              height: 1.6,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Icon(
              Icons.mail_outline_rounded,
              size: 16,
              color: Colors.white.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 7),
            Text(
              'hello@primoria.example',
              style: GoogleFonts.manrope(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.7),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFooterColumn({
    required String heading,
    required TextStyle headingStyle,
    required TextStyle linkStyle,
    required List<_FooterLink> links,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(heading, style: headingStyle),
        const SizedBox(height: 14),
        ...links.map(
          (link) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: link.onTap,
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(link.label, style: linkStyle),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Shared helpers
  // ─────────────────────────────────────────────────────────────
  Widget _sectionLabel(String text, {Color? color}) => Text(
    text.toUpperCase(),
    style: GoogleFonts.sora(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.4,
      color: color ?? _C.accent,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data models
// ─────────────────────────────────────────────────────────────────────────────

class _StatData {
  final String value;
  final String label;
  final IconData icon;
  const _StatData(this.value, this.label, this.icon);
}

class _FeatureData {
  final Gradient gradient;
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> bullets;
  const _FeatureData({
    required this.gradient,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.bullets,
  });
}

class _StepData {
  final String number;
  final Color color;
  final IconData icon;
  final String title;
  final String body;
  const _StepData({
    required this.number,
    required this.color,
    required this.icon,
    required this.title,
    required this.body,
  });
}

class _TestimonialData {
  final String quote;
  final String name;
  final String role;
  final int rating;
  final String initials;
  final Color color;
  const _TestimonialData({
    required this.quote,
    required this.name,
    required this.role,
    required this.rating,
    required this.initials,
    required this.color,
  });
}

class _FooterLink {
  final String label;
  final VoidCallback? onTap;
  const _FooterLink(this.label, this.onTap);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Helper Widgets
// ─────────────────────────────────────────────────────────────────────────────

class _BrandMark extends StatelessWidget {
  final double size;
  final bool withGlow;
  const _BrandMark({required this.size, required this.withGlow});

  @override
  Widget build(BuildContext context) {
    final icon = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.accent, _C.accentDeep],
        ),
      ),
      child: Center(
        child: Text(
          'P',
          style: GoogleFonts.sora(
            fontSize: size * 0.56,
            height: 1,
            color: Colors.white,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );

    if (!withGlow) return icon;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: const [
          BoxShadow(color: Color(0x5620C6FF), blurRadius: 56, spreadRadius: 12),
        ],
      ),
      child: icon,
    );
  }
}

/// Floating UI mockup cards in the Hero section
class _HeroMockup extends StatelessWidget {
  final bool isWide;
  const _HeroMockup({required this.isWide});

  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String s(String en) => isZh ? (_LandingScreenState._zhTexts[en] ?? en) : en;
    final w = isWide ? 360.0 : 300.0;
    final h = isWide ? 380.0 : 320.0;

    return SizedBox(
      width: w,
      height: h,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Course progress card
          Positioned(
            left: 0,
            top: isWide ? 40 : 30,
            child: Transform.rotate(
              angle: -0.04,
              child: _MockCard(
                width: isWide ? 220 : 180,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: _C.feat2A.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.science_rounded,
                            size: 16,
                            color: _C.feat2A,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          s('Physics 101'),
                          style: GoogleFonts.sora(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _C.ink,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: 0.65,
                        minHeight: 6,
                        backgroundColor: _C.accent.withValues(alpha: 0.15),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          _C.accent,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      s('65% \u00b7 Lesson 7 of 11'),
                      style: GoogleFonts.manrope(
                        fontSize: 11,
                        color: _C.bodyMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Streak card
          Positioned(
            right: 0,
            top: 0,
            child: Transform.rotate(
              angle: 0.05,
              child: _MockCard(
                width: 130,
                bgColor: const Color(0xFFFFF3E0),
                child: Row(
                  children: [
                    const Text('\uD83D\uDD25', style: TextStyle(fontSize: 26)),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '12',
                          style: GoogleFonts.sora(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: _C.streakFire,
                          ),
                        ),
                        Text(
                          s('Day Streak'),
                          style: GoogleFonts.manrope(
                            fontSize: 11,
                            color: _C.body,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // AI chat bubble card
          Positioned(
            right: 16,
            bottom: isWide ? 40 : 30,
            child: _MockCard(
              width: isWide ? 200 : 170,
              bgColor: _C.aiDark,
              child: Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [_C.aiPurple, Color(0xFF6D40E7)],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.smart_toy_rounded,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      s('Why does E = mc\u00b2?'),
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // XP earned pill
          Positioned(
            left: 24,
            bottom: isWide ? 80 : 65,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_C.accent, _C.accentDeep],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: _C.accent.withValues(alpha: 0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star_rounded, color: Colors.white, size: 13),
                  const SizedBox(width: 4),
                  Text(
                    s('+50 XP'),
                    style: GoogleFonts.sora(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MockCard extends StatelessWidget {
  final double width;
  final Widget child;
  final Color? bgColor;

  const _MockCard({required this.width, required this.child, this.bgColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor ?? _C.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _StatBadge extends StatelessWidget {
  final _StatData data;
  const _StatBadge({required this.data});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: _C.accent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(data.icon, color: _C.accent, size: 22),
        ),
        const SizedBox(height: 8),
        Text(
          data.value,
          style: GoogleFonts.sora(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: _C.ink,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          data.label,
          style: GoogleFonts.manrope(
            fontSize: 13,
            color: _C.body,
            fontWeight: FontWeight.w500,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final _FeatureData data;
  const _FeatureCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 280),
      decoration: BoxDecoration(
        gradient: data.gradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2A0B1834),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned(
            right: -28,
            top: 16,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 22, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(data.icon, color: Colors.white, size: 22),
                ),
                const SizedBox(height: 14),
                Text(
                  data.title,
                  style: GoogleFonts.sora(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  data.subtitle,
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.7),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 14),
                ...data.bullets.map(
                  (b) => Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Container(
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            b,
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              color: Colors.white.withValues(alpha: 0.9),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HowItWorksStep extends StatelessWidget {
  final _StepData data;
  const _HowItWorksStep({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _C.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: data.color.withValues(alpha: 0.15)),
        boxShadow: [
          BoxShadow(
            color: data.color.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: data.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(data.icon, color: data.color, size: 22),
              ),
              const Spacer(),
              Text(
                data.number,
                style: GoogleFonts.sora(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: data.color.withValues(alpha: 0.15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data.title,
            style: GoogleFonts.sora(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _C.ink,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            data.body,
            style: GoogleFonts.manrope(
              fontSize: 14,
              color: _C.body,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

/// Decorative AI chat mockup for the AI Tutor section
class _AiChatMockup extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String s(String en) => isZh ? (_LandingScreenState._zhTexts[en] ?? en) : en;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _C.aiSurface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [_C.aiPurple, Color(0xFF6D40E7)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.smart_toy_rounded,
                  size: 18,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s('Primoria AI Tutor'),
                    style: GoogleFonts.sora(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF58CC02),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        s('Always online'),
                        style: GoogleFonts.manrope(
                          fontSize: 11,
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          _chatMsg(
            isUser: true,
            text: s(
              "Why does water expand when it freezes? That seems counterintuitive.",
            ),
          ),
          const SizedBox(height: 12),
          _chatMsg(
            isUser: false,
            text: s(
              "Great question! Water molecules form a rigid hexagonal lattice in ice, which actually takes up more space than the liquid arrangement. That\u2019s why ice floats!",
            ),
          ),
          const SizedBox(height: 12),
          _chatMsg(isUser: true, text: s("Can you quiz me on this?")),
          const SizedBox(height: 12),
          _chatMsg(
            isUser: false,
            text: s(
              "Sure! Here\u2019s a quick question: Ice is less dense than water. True or False?",
            ),
          ),
          const SizedBox(height: 16),
          // Input bar mockup
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    s('Ask me anything\u2026'),
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                ),
                Icon(Icons.send_rounded, size: 18, color: _C.aiPurple),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _chatMsg({required bool isUser, required String text}) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 280),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isUser
                ? _C.aiPurple.withValues(alpha: 0.8)
                : Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(14),
              topRight: const Radius.circular(14),
              bottomLeft: Radius.circular(isUser ? 14 : 4),
              bottomRight: Radius.circular(isUser ? 4 : 14),
            ),
          ),
          child: Text(
            text,
            style: GoogleFonts.manrope(
              fontSize: 13,
              color: Colors.white.withValues(alpha: isUser ? 1.0 : 0.8),
              height: 1.5,
            ),
          ),
        ),
      ),
    );
  }
}

/// Gamification UI mockup
class _GamificationMockup extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String s(String en) => isZh ? (_LandingScreenState._zhTexts[en] ?? en) : en;
    final week = isZh
        ? const ['一', '二', '三', '四', '五', '六', '日']
        : const ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: _C.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _C.streakFire.withValues(alpha: 0.1),
            blurRadius: 30,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Streak header
          Row(
            children: [
              const Text('\uD83D\uDD25', style: TextStyle(fontSize: 28)),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    s('47-Day Streak'),
                    style: GoogleFonts.sora(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: _C.streakFire,
                    ),
                  ),
                  Text(
                    s('You\'re on fire! Keep it up.'),
                    style: GoogleFonts.manrope(fontSize: 12, color: _C.body),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Week dots
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: week
                .asMap()
                .entries
                .map(
                  (e) => _StreakDot(
                    label: e.value,
                    isLit: e.key < 6,
                    isToday: e.key == 5,
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 20),
          Divider(color: _C.accent.withValues(alpha: 0.1)),
          const SizedBox(height: 14),
          // XP bar
          Row(
            children: [
              const Icon(Icons.star_rounded, color: _C.xpGold, size: 18),
              const SizedBox(width: 6),
              Text(
                s('XP Progress'),
                style: GoogleFonts.sora(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: _C.ink,
                ),
              ),
              const Spacer(),
              Text(
                '1,240 / 2,000',
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  color: _C.bodyMuted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: 0.62,
              minHeight: 10,
              backgroundColor: _C.xpGold.withValues(alpha: 0.15),
              valueColor: const AlwaysStoppedAnimation<Color>(_C.xpGold),
            ),
          ),
          const SizedBox(height: 20),
          // Achievements row
          Text(
            s('Recent Achievements'),
            style: GoogleFonts.sora(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _C.ink,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _AchBadge(
                '\uD83C\uDF1F',
                s('First Lesson'),
                const Color(0xFF8B5CF6),
              ),
              _AchBadge('\uD83D\uDD25', s('7-Day Streak'), _C.streakFire),
              _AchBadge(
                '\uD83E\uDDE0',
                s('Quiz Master'),
                const Color(0xFF11D9A8),
              ),
              _AchBadge('\uD83C\uDFC6', s('Top 10%'), _C.xpGold),
            ],
          ),
        ],
      ),
    );
  }
}

class _StreakDot extends StatelessWidget {
  final String label;
  final bool isLit;
  final bool isToday;

  const _StreakDot({
    required this.label,
    required this.isLit,
    required this.isToday,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isLit
                ? (isToday ? _C.streakFire : _C.xpGold)
                : _C.accent.withValues(alpha: 0.08),
            border: isToday ? Border.all(color: _C.streakFire, width: 2) : null,
          ),
          child: Center(
            child: Text(
              isLit ? '\u2713' : label,
              style: TextStyle(
                fontSize: isLit ? 14 : 11,
                color: isLit ? Colors.white : _C.bodyMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 10,
            color: _C.bodyMuted,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _AchBadge extends StatelessWidget {
  final String emoji;
  final String label;
  final Color color;

  const _AchBadge(this.emoji, this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.25)),
          ),
          child: Center(
            child: Text(emoji, style: const TextStyle(fontSize: 22)),
          ),
        ),
        const SizedBox(height: 5),
        SizedBox(
          width: 56,
          child: Text(
            label,
            style: GoogleFonts.manrope(
              fontSize: 10,
              color: _C.body,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class _TestimonialCard extends StatelessWidget {
  final _TestimonialData data;
  const _TestimonialCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _C.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0B1834),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stars
          Row(
            children: List.generate(
              data.rating,
              (_) => const Padding(
                padding: EdgeInsets.only(right: 2),
                child: Icon(
                  Icons.star_rounded,
                  color: Color(0xFFFFB347),
                  size: 16,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '\u201c${data.quote}\u201d',
            style: GoogleFonts.manrope(
              fontSize: 14,
              color: _C.body,
              height: 1.65,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: data.color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    data.initials,
                    style: GoogleFonts.sora(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: data.color,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.name,
                    style: GoogleFonts.sora(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: _C.ink,
                    ),
                  ),
                  Text(
                    data.role,
                    style: GoogleFonts.manrope(
                      fontSize: 12,
                      color: _C.bodyMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
