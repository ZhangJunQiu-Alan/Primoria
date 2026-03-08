import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
                _navLink('Features', () => _scrollTo(_featuresKey)),
                const SizedBox(width: 28),
                _navLink('How It Works', () => _scrollTo(_howItWorksKey)),
                const SizedBox(width: 28),
                _navLink('AI Tutor', () => _scrollTo(_aiKey)),
                const SizedBox(width: 28),
                _navLink('Community', () => _scrollTo(_communityKey)),
                const SizedBox(width: 36),
                _outlineButton('Log In', _goToLogin),
                const SizedBox(width: 12),
                _filledButton('Get Started', _goToRegister, small: true),
              ] else ...[
                const Spacer(),
                _filledButton('Start Free', _goToRegister, small: true),
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
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(9),
          ),
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
          padding: EdgeInsets.fromLTRB(hPad, wide ? 72 : 48, hPad, wide ? 88 : 56),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(flex: 6, child: _buildHeroCopy(wide: true)),
                    const SizedBox(width: 48),
                    Expanded(
                      flex: 5,
                      child: _HeroMockup(isWide: true),
                    ),
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
              const Icon(Icons.auto_awesome_rounded, size: 14, color: _C.accent),
              const SizedBox(width: 6),
              Text(
                'AI-Powered Learning — Now Available',
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
              const TextSpan(text: 'Master Any\nSubject — '),
              TextSpan(
                text: 'Level Up\nEvery Day',
                style: _headlineStyle(hs).copyWith(color: _C.accent),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: wide ? 520 : 400),
          child: Text(
            'Interactive STEM lessons, real-time AI guidance, and a community of study buddies. '
            'Stop watching — start doing.',
            style: _bodyStyle(wide ? 18 : 16),
          ),
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            _filledButton('Start Learning Free', _goToRegister),
            const SizedBox(width: 14),
            _outlineButton('Explore Courses', _goToLogin),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            _heroPill(Icons.check_circle_rounded, 'Free to start'),
            const SizedBox(width: 16),
            _heroPill(Icons.check_circle_rounded, 'No credit card'),
            const SizedBox(width: 16),
            _heroPill(Icons.check_circle_rounded, 'Cancel anytime'),
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
      _StatData('10,000+', 'Active Learners', Icons.people_alt_rounded),
      _StatData('200+', 'Interactive Courses', Icons.school_rounded),
      _StatData('4.9 / 5', 'Average Rating', Icons.star_rounded),
      _StatData('50+', 'Countries Reached', Icons.public_rounded),
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
                  children: stats
                      .map((s) => _StatBadge(data: s))
                      .toList(),
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
        title: 'Learn By Doing',
        subtitle: 'Interactive, not passive',
        bullets: [
          'Tap-to-reveal explanations',
          'Interactive sliders & simulations',
          'Code playgrounds — run & debug',
          'Fill-in-the-blank challenges',
          'Instant right/wrong feedback',
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat2A, _C.feat2B],
        ),
        icon: Icons.smart_toy_rounded,
        title: 'AI Personal Tutor',
        subtitle: 'Powered by Gemini AI',
        bullets: [
          'Ask anything, get instant answers',
          'Step-by-step problem solving',
          'Auto-generated mind maps',
          'Practice quiz generation',
          'Available 24 / 7, never judging',
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat3A, _C.feat3B],
        ),
        icon: Icons.group_rounded,
        title: 'Study Buddy Match',
        subtitle: 'Learning is better together',
        bullets: [
          'Match with same-level learners',
          'Shared progress accountability',
          'Community leaderboards',
          'Peer encouragement system',
          'Group challenges & missions',
        ],
      ),
      _FeatureData(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.feat4A, _C.feat4B],
        ),
        icon: Icons.emoji_events_rounded,
        title: 'Level Up & Earn',
        subtitle: 'Gamified from start to finish',
        bullets: [
          'Earn XP for every lesson',
          'Daily quests & bonus rewards',
          'Streak system — keep the fire',
          'Unlock achievement badges',
          'Profile levels & ranked tiers',
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
              _sectionLabel('Features'),
              const SizedBox(height: 8),
              Text(
                'Everything You Need\nto Succeed',
                style: _headlineStyle(wide ? 56 : 40),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Text(
                  'Four pillars that make Primoria the most engaging way to learn STEM.',
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
        title: 'Choose Your Path',
        body:
            'Browse 200+ expert-crafted courses across physics, math, computer science, and more. Filter by topic, difficulty, or duration.',
      ),
      _StepData(
        number: '02',
        color: _C.step2,
        icon: Icons.auto_fix_high_rounded,
        title: 'Learn Interactively',
        body:
            'Every lesson is hands-on. Solve problems, run code, drag sliders — no passive video watching. Your AI tutor explains anything you\'re stuck on.',
      ),
      _StepData(
        number: '03',
        color: _C.step3,
        icon: Icons.trending_up_rounded,
        title: 'Track & Level Up',
        body:
            'Earn XP, build daily streaks, unlock achievements, and climb the leaderboard. Watch your progress heatmap fill up week by week.',
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
              _sectionLabel('How It Works'),
              const SizedBox(height: 8),
              Text(
                'From Zero to Expert\nin 3 Steps',
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
      'Ask questions in plain English — no jargon needed',
      'Get step-by-step breakdowns of complex topics',
      'Request practice quizzes tailored to your level',
      'Generate mind maps to visualize any concept',
      'Review and replay key moments from lessons',
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
                'Powered by Gemini AI',
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
          'Your Personal AI\nTutor, Always On',
          style: GoogleFonts.sora(
            fontSize: wide ? 48 : 36,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            height: 1.05,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Stuck on a concept at 2 AM? Your AI tutor never sleeps. '
          'Ask anything, get clear explanations, and keep your momentum going.',
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
        _filledButton('Try AI Tutor Free', _goToRegister),
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
                    Expanded(flex: 5, child: _buildGamificationCopy(wide: true)),
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
        _sectionLabel('Gamification', color: _C.streakFire),
        const SizedBox(height: 8),
        Text(
          'Make Every Lesson\nCount',
          style: _headlineStyle(wide ? 48 : 36),
        ),
        const SizedBox(height: 16),
        Text(
          'Science says rewards wire your brain to love learning. '
          'Primoria is built on that insight — every lesson earns '
          'XP, every day extends your streak, and every milestone '
          'unlocks a new achievement.',
          style: _bodyStyle(wide ? 17 : 15),
        ),
        const SizedBox(height: 28),
        _gamStat(Icons.local_fire_department_rounded, _C.streakFire,
            'Daily Streak', 'Build momentum with unbroken learning days'),
        const SizedBox(height: 14),
        _gamStat(Icons.star_rounded, _C.xpGold, 'Experience Points (XP)',
            'Every lesson, quiz, and activity earns XP'),
        const SizedBox(height: 14),
        _gamStat(Icons.emoji_events_rounded, const Color(0xFF6D40E7),
            'Achievement Badges', 'Unlock rare badges for reaching milestones'),
        const SizedBox(height: 14),
        _gamStat(Icons.task_alt_rounded, const Color(0xFF11D9A8), 'Daily Quests',
            'Fresh missions every day to keep things interesting'),
      ],
    );
  }

  Widget _gamStat(IconData icon, Color color, String title, String sub) =>
      Row(
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
              _sectionLabel('Community', color: Colors.white.withValues(alpha: 0.7)),
              const SizedBox(height: 8),
              Text(
                'Find Your Study Buddy',
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
                  'Learning alone is tough. Our smart matching algorithm '
                  'connects you with learners at the same level, in the same topic. '
                  'Motivate each other, compete on leaderboards, and hit goals together.',
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
                          'Smart Matching',
                          'Paired by skill level and topic interest',
                        ),
                        const SizedBox(width: 24),
                        _communityCard(
                          Icons.leaderboard_rounded,
                          'Leaderboards',
                          'Weekly rankings to spark healthy competition',
                        ),
                        const SizedBox(width: 24),
                        _communityCard(
                          Icons.groups_rounded,
                          'Group Challenges',
                          'Tackle special missions with your squad',
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _communityCard(
                          Icons.connect_without_contact_rounded,
                          'Smart Matching',
                          'Paired by skill level and topic interest',
                        ),
                        const SizedBox(height: 16),
                        _communityCard(
                          Icons.leaderboard_rounded,
                          'Leaderboards',
                          'Weekly rankings to spark healthy competition',
                        ),
                        const SizedBox(height: 16),
                        _communityCard(
                          Icons.groups_rounded,
                          'Group Challenges',
                          'Tackle special missions with your squad',
                        ),
                      ],
                    ),
              const SizedBox(height: 40),
              _filledButton('Join the Community', _goToRegister),
            ],
          ),
        );
      },
    );
  }

  Widget _communityCard(IconData icon, String title, String sub) =>
      Flexible(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 280),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.22),
              ),
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
        quote:
            'I used to dread physics. After two weeks on Primoria, I actually look forward to it. The interactive sliders make abstract concepts click instantly.',
        name: 'Aisha K.',
        role: 'High School Student',
        rating: 5,
        initials: 'AK',
        color: const Color(0xFF8B5CF6),
      ),
      _TestimonialData(
        quote:
            'The AI tutor is a game-changer. I asked about quantum entanglement at midnight and got a step-by-step explanation with a quiz to test my understanding.',
        name: 'Marcus T.',
        role: 'University Sophomore',
        rating: 5,
        initials: 'MT',
        color: const Color(0xFF11D9A8),
      ),
      _TestimonialData(
        quote:
            'My streak is at 47 days and counting! The daily quests make it hard to stop. I have learned more calculus in a month than I did in a whole semester.',
        name: 'Lingyun W.',
        role: 'Self-taught Learner',
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
              _sectionLabel('Testimonials'),
              const SizedBox(height: 8),
              Text(
                'Learners Love Primoria',
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
                'Ready to Start Your\nLearning Journey?',
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
                'Join 10,000+ learners who chose to learn by doing, not just watching.',
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
                      child: const Text('Create Free Account'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton(
                    onPressed: _goToLogin,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(
                        color: Colors.white,
                        width: 2,
                      ),
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
                    child: const Text('Log In'),
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
                              heading: 'Learn',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  'Features',
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  'How It Works',
                                  () => _scrollTo(_howItWorksKey),
                                ),
                                _FooterLink(
                                  'AI Tutor',
                                  () => _scrollTo(_aiKey),
                                ),
                                _FooterLink(
                                  'Community',
                                  () => _scrollTo(_communityKey),
                                ),
                              ],
                            ),
                            const SizedBox(width: 72),
                            _buildFooterColumn(
                              heading: 'Company',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                const _FooterLink('About', null),
                                const _FooterLink('Blog', null),
                                _FooterLink(
                                  'Pricing',
                                  () => Navigator.of(
                                    context,
                                  ).pushNamed('/register'),
                                ),
                                _FooterLink(
                                  'Contact',
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
                              heading: 'Learn',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  'Features',
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  'How It Works',
                                  () => _scrollTo(_howItWorksKey),
                                ),
                                _FooterLink(
                                  'AI Tutor',
                                  () => _scrollTo(_aiKey),
                                ),
                              ],
                            ),
                            const SizedBox(height: 22),
                            _buildFooterColumn(
                              heading: 'Company',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                const _FooterLink('About', null),
                                const _FooterLink('Blog', null),
                                _FooterLink(
                                  'Contact',
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
                    'Copyright \u00a9 2026 PRIMORIA. All rights reserved. '
                    'No part of this website or any of its contents may be reproduced, '
                    'copied, modified, or adapted without prior written consent of the author.',
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
            'Interactive STEM learning, powered by AI.\nJoin thousands mastering science the fun way.',
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
          BoxShadow(
            color: Color(0x5620C6FF),
            blurRadius: 56,
            spreadRadius: 12,
          ),
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
                          'Physics 101',
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
                        valueColor:
                            const AlwaysStoppedAnimation<Color>(_C.accent),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '65% \u00b7 Lesson 7 of 11',
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
                    const Text(
                      '\uD83D\uDD25',
                      style: TextStyle(fontSize: 26),
                    ),
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
                          'Day Streak',
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
                      'Why does E = mc\u00b2?',
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
                  const Icon(
                    Icons.star_rounded,
                    color: Colors.white,
                    size: 13,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '+50 XP',
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

  const _MockCard({
    required this.width,
    required this.child,
    this.bgColor,
  });

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
                    'Primoria AI Tutor',
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
                        'Always online',
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
            text: "Why does water expand when it freezes? That seems counterintuitive.",
          ),
          const SizedBox(height: 12),
          _chatMsg(
            isUser: false,
            text:
                "Great question! Water molecules form a rigid hexagonal lattice in ice, which actually takes up more space than the liquid arrangement. That\u2019s why ice floats!",
          ),
          const SizedBox(height: 12),
          _chatMsg(
            isUser: true,
            text: "Can you quiz me on this?",
          ),
          const SizedBox(height: 12),
          _chatMsg(
            isUser: false,
            text: "Sure! Here\u2019s a quick question: Ice is less dense than water. True or False?",
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
                    'Ask me anything\u2026',
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                ),
                Icon(
                  Icons.send_rounded,
                  size: 18,
                  color: _C.aiPurple,
                ),
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
                    '47-Day Streak',
                    style: GoogleFonts.sora(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: _C.streakFire,
                    ),
                  ),
                  Text(
                    'You\'re on fire! Keep it up.',
                    style: GoogleFonts.manrope(
                      fontSize: 12,
                      color: _C.body,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Week dots
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
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
                'XP Progress',
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
            'Recent Achievements',
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
              _AchBadge('\uD83C\uDF1F', 'First Lesson', const Color(0xFF8B5CF6)),
              _AchBadge('\uD83D\uDD25', '7-Day Streak', _C.streakFire),
              _AchBadge('\uD83E\uDDE0', 'Quiz Master', const Color(0xFF11D9A8)),
              _AchBadge('\uD83C\uDFC6', 'Top 10%', _C.xpGold),
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
            border: isToday
                ? Border.all(color: _C.streakFire, width: 2)
                : null,
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
          child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
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
