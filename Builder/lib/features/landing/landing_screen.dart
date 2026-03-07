import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../providers/builder_access_provider.dart';
import '../../theme/design_tokens.dart';
import '../../services/supabase_service.dart';

// ─── Color tokens matching the HTML template's CSS variables ───
class _C {
  _C._();
  static const bg = Color(0xFFF6FBFF);
  static const text = Color(0xFF1C2B33);
  static const muted = Color(0xFF607086);
  static const primary = Color(0xFF58CC02);
  static const accent = Color(0xFF4D7CFF);
  static const accentYellow = Color(0xFFFFD43B);
}

/// Landing / index page – mirrors Builder_temple/index.html
class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(_fadeAnim);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));

    return ListenableBuilder(
      listenable: builderAccessNotifier,
      builder: (context, _) {
        final access = builderAccessNotifier.state;
        final deniedMessage = builderAccessNotifier.deniedMessage;

        // ── Checking: session restored but role not yet verified ──
        if (SupabaseService.isLoggedIn && access == AccessState.checking) {
          return _buildCheckingScreen();
        }

        // ── Normal landing page (with optional access-denied banner) ──
        return Scaffold(
          backgroundColor: _C.bg,
          body: Stack(
            children: [
              const Positioned.fill(child: _AmbientBackground()),
              Positioned(
                top: -140,
                left: -130,
                child: _BlurBlob(color: _C.accent.withValues(alpha: 0.30)),
              ),
              Positioned(
                bottom: -150,
                right: -120,
                child: _BlurBlob(color: _C.primary.withValues(alpha: 0.34)),
              ),

              // Scrollable content
              SafeArea(
                child: SingleChildScrollView(
                  padding: EdgeInsets.zero,
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: SlideTransition(
                      position: _slideAnim,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Push content down when the denied banner is shown
                          if (deniedMessage != null) const SizedBox(height: 56),
                          _buildHeader(),
                          _buildHero(context, t),
                          const SizedBox(height: 40),
                          _buildFeatureRow(t),
                          const SizedBox(height: 28),
                          _buildWorkflowBand(t),
                          const SizedBox(height: 40),
                          _buildCtaBand(context, t),
                          const SizedBox(height: 80),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Access-denied banner — floats above content
              if (deniedMessage != null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: _buildAccessDeniedBanner(deniedMessage),
                ),
            ],
          ),
        );
      },
    );
  }

  // ─── Verifying session screen ────────────────────────────────────────────
  Widget _buildCheckingScreen() {
    return Scaffold(
      backgroundColor: _C.bg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/imgs/logo32.png',
              width: 52,
              height: 52,
              errorBuilder: (_, __, ___) =>
                  const Icon(Icons.school, size: 52, color: _C.accent),
            ),
            const SizedBox(height: 28),
            const SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: _C.accent,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Verifying access…',
              style: TextStyle(fontSize: 15, color: _C.muted),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Access-denied banner ────────────────────────────────────────────────
  Widget _buildAccessDeniedBanner(String message) {
    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        decoration: const BoxDecoration(
          color: Color(0xFFFFF3CD),
          border: Border(bottom: BorderSide(color: Color(0x55D4A017))),
          boxShadow: [
            BoxShadow(
              color: Color(0x18000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              size: 20,
              color: Color(0xFF996600),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF664D00),
                ),
              ),
            ),
            GestureDetector(
              onTap: builderAccessNotifier.clearDeniedMessage,
              child: const Padding(
                padding: EdgeInsets.only(left: 10),
                child: Icon(
                  Icons.close_rounded,
                  size: 18,
                  color: Color(0xFF996600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  //  Header – logo + brand
  // ═══════════════════════════════════════════════════
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      child: InkWell(
        onTap: () => context.go('/dashboard'),
        borderRadius: BorderRadius.circular(10),
        child: Row(
          children: [
            Image.asset(
              'assets/imgs/logo32.png',
              width: 32,
              height: 32,
              errorBuilder: (_, __, ___) =>
                  const Icon(Icons.school, color: AppColors.primary500),
            ),
            const SizedBox(width: 12),
            const Text(
              'Primoria',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
                color: _C.text,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  //  Hero section
  // ═══════════════════════════════════════════════════
  Widget _buildHero(BuildContext context, BuilderLocalizations t) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth > 900;
        final gutter = _gutter(constraints.maxWidth);
        final capabilityTags = _heroCapabilityTags(t);
        final creatorsHint = t.isZh
            ? '2,300+ 教师本月已发布课程'
            : '2,300+ creators shipped courses this month';
        final speedHint = t.isZh
            ? '从构想到上线 < 30 分钟'
            : 'From idea to live in < 30 min';

        final leftColumn = Padding(
          padding: EdgeInsets.only(left: gutter, right: wide ? 14 : gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _GlassTag(
                    label: t.landingTagline,
                    icon: Icons.auto_awesome_rounded,
                    background: _C.primary.withValues(alpha: 0.16),
                    borderColor: _C.primary.withValues(alpha: 0.35),
                    foreground: const Color(0xFF1E6D00),
                  ),
                  _GlassTag(
                    label: t.isZh ? 'AI 原生工作流' : 'AI-native workflow',
                    icon: Icons.memory_rounded,
                    background: _C.accent.withValues(alpha: 0.12),
                    borderColor: _C.accent.withValues(alpha: 0.35),
                    foreground: const Color(0xFF315BC7),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                t.landingHeadline,
                style: TextStyle(
                  fontSize: wide ? 58 : 40,
                  fontWeight: FontWeight.w800,
                  height: 1.04,
                  color: _C.text,
                  letterSpacing: -0.8,
                ),
              ),
              const SizedBox(height: 18),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 620),
                child: Text(
                  t.landingSubtitle,
                  style: const TextStyle(
                    fontSize: 18,
                    color: _C.muted,
                    height: 1.62,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: capabilityTags
                    .map(
                      (tag) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: Colors.white.withValues(alpha: 0.72),
                          border: Border.all(color: const Color(0x1F4D7CFF)),
                        ),
                        child: Text(
                          tag,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF30455D),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFFEBF1FF),
                      Colors.white.withValues(alpha: 0.9),
                    ],
                  ),
                  border: Border.all(color: const Color(0x2D4D7CFF)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A2C3D5F),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.landingQuote,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: _C.text,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Richard Feynman',
                      style: TextStyle(fontSize: 13, color: _C.muted),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _TrustHintPill(label: creatorsHint),
                        _TrustHintPill(label: speedHint),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _PillButton(
                    label: t.landingApplyNow,
                    filled: true,
                    icon: Icons.rocket_launch_rounded,
                    onTap: () => context.go('/login'),
                  ),
                  _PillButton(
                    label: t.landingAlreadyQualified,
                    filled: false,
                    icon: Icons.verified_rounded,
                    onTap: () => context.go('/login'),
                  ),
                  _PillButton(
                    label: t.landingStartCreating,
                    filled: false,
                    icon: Icons.dashboard_customize_rounded,
                    onTap: () => context.go('/builder'),
                  ),
                ],
              ),
            ],
          ),
        );

        final rightColumn = Padding(
          padding: EdgeInsets.only(right: gutter, left: wide ? 14 : gutter),
          child: _HeroCard(t: t),
        );

        if (wide) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 40),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: leftColumn),
                const SizedBox(width: 40),
                Expanded(child: rightColumn),
              ],
            ),
          );
        }

        return Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: Column(
            children: [leftColumn, const SizedBox(height: 32), rightColumn],
          ),
        );
      },
    );
  }

  List<String> _heroCapabilityTags(BuilderLocalizations t) {
    if (t.isZh) {
      return const ['拖拽式课程编排', 'AI 一句话生成结构', '实时预览与发布', '学员反馈自动聚合'];
    }
    return const [
      'Drag-and-drop course flow',
      'AI one-line course drafting',
      'Live preview and publish',
      'Learner feedback insights',
    ];
  }

  // ═══════════════════════════════════════════════════
  //  Feature cards row
  // ═══════════════════════════════════════════════════
  Widget _buildFeatureRow(BuilderLocalizations t) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final gutter = _gutter(constraints.maxWidth);
        final wide = constraints.maxWidth > 900;

        final cards = [
          _FeatureCard(
            badge: t.featureBadge1,
            title: t.featureTitle1,
            subtitle: t.featureSubtitle1,
            icon: Icons.widgets_rounded,
            accent: const Color(0xFF4D7CFF),
          ),
          _FeatureCard(
            badge: t.featureBadge2,
            title: t.featureTitle2,
            subtitle: t.featureSubtitle2,
            icon: Icons.mark_chat_read_rounded,
            accent: const Color(0xFF00A86B),
          ),
          _FeatureCard(
            badge: t.featureBadge3,
            title: t.featureTitle3,
            subtitle: t.featureSubtitle3,
            icon: Icons.bolt_rounded,
            accent: const Color(0xFFFF9F0A),
          ),
        ];

        if (wide) {
          return Padding(
            padding: EdgeInsets.symmetric(horizontal: gutter),
            child: Row(
              children: cards
                  .map(
                    (c) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: c,
                      ),
                    ),
                  )
                  .toList(),
            ),
          );
        }

        return Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: Column(
            children: cards
                .map(
                  (c) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: c,
                  ),
                )
                .toList(),
          ),
        );
      },
    );
  }

  Widget _buildWorkflowBand(BuilderLocalizations t) {
    final steps = [
      _WorkflowStepData(
        step: '01',
        icon: Icons.account_tree_rounded,
        title: t.isZh ? '搭建课程结构' : 'Compose Course Graph',
        subtitle: t.isZh
            ? '从模板开始，快速拖拽模块形成知识路径。'
            : 'Start from templates and map lessons with visual blocks.',
      ),
      _WorkflowStepData(
        step: '02',
        icon: Icons.auto_awesome_rounded,
        title: t.isZh ? 'AI 补全内容' : 'AI Expands Content',
        subtitle: t.isZh
            ? '智能补全讲解、练习、动画建议与难度梯度。'
            : 'Generate scripts, exercises, and difficulty progression.',
      ),
      _WorkflowStepData(
        step: '03',
        icon: Icons.rocket_launch_rounded,
        title: t.isZh ? '发布并追踪' : 'Ship and Track',
        subtitle: t.isZh
            ? '一键发布到 Viewer，实时查看学习完成率和互动。'
            : 'Publish to Viewer and monitor completion plus engagement.',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final gutter = _gutter(constraints.maxWidth);
        final wide = constraints.maxWidth > 980;

        final panel = Container(
          padding: const EdgeInsets.all(26),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0D1A2B), Color(0xFF102936)],
            ),
            border: Border.all(color: const Color(0x2E8FB5D6)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x40162035),
                blurRadius: 40,
                offset: Offset(0, 22),
              ),
            ],
          ),
          child: wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 5,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            t.isZh ? 'Builder 工作流' : 'Builder Workflow',
                            style: const TextStyle(
                              fontSize: 14,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF84D1FF),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            t.isZh
                                ? '从灵感到上线，一次完成。'
                                : 'From concept to publishing in one flow.',
                            style: const TextStyle(
                              fontSize: 30,
                              height: 1.2,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            t.isZh
                                ? '把课程设计、内容生产、发布反馈压缩到同一工作台，减少切换成本。'
                                : 'Unify planning, production, and analytics to reduce tool switching.',
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.55,
                              color: Color(0xBBD6E5F6),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 22),
                    Expanded(
                      flex: 7,
                      child: Column(
                        children: steps
                            .map(
                              (step) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _WorkflowStepCard(step: step),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.isZh ? 'Builder 工作流' : 'Builder Workflow',
                      style: const TextStyle(
                        fontSize: 13,
                        letterSpacing: 1.1,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF84D1FF),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t.isZh
                          ? '从灵感到上线，一次完成。'
                          : 'From concept to publishing in one flow.',
                      style: const TextStyle(
                        fontSize: 24,
                        height: 1.2,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...steps.map(
                      (step) => Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: _WorkflowStepCard(step: step),
                      ),
                    ),
                  ],
                ),
        );

        return Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: panel,
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════
  //  CTA band
  // ═══════════════════════════════════════════════════
  Widget _buildCtaBand(BuildContext context, BuilderLocalizations t) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final gutter = _gutter(constraints.maxWidth);
        final wide = constraints.maxWidth > 640;

        return Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 30),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF111A2B), Color(0xFF1A2038)],
              ),
              border: Border.all(color: const Color(0x33517CFF)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x401E2B4A),
                  blurRadius: 36,
                  offset: Offset(0, 20),
                ),
              ],
            ),
            child: wide
                ? Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t.landingReadyTitle,
                              style: TextStyle(
                                fontSize: wide ? 28 : 22,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t.landingReadySubtitle,
                              style: const TextStyle(
                                color: Color(0xB7D4E5FF),
                                fontSize: 15,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 24),
                      _PillButton(
                        label: t.landingStartCreating,
                        filled: true,
                        icon: Icons.auto_awesome_motion_rounded,
                        onTap: () => context.go('/builder'),
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t.landingReadyTitle,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        t.landingReadySubtitle,
                        style: const TextStyle(
                          color: Color(0xB7D4E5FF),
                          fontSize: 15,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _PillButton(
                        label: t.landingStartCreating,
                        filled: true,
                        icon: Icons.auto_awesome_motion_rounded,
                        onTap: () => context.go('/builder'),
                      ),
                    ],
                  ),
          ),
        );
      },
    );
  }

  double _gutter(double width) => (width * 0.03).clamp(16, 32);
}

// ═══════════════════════════════════════════════════════
//  Reusable components
// ═══════════════════════════════════════════════════════

class _AmbientBackground extends StatelessWidget {
  const _AmbientBackground();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF4F8FF), Color(0xFFF2F7FC), Color(0xFFF7FBF8)],
        ),
      ),
      child: CustomPaint(
        painter: _GridPatternPainter(),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _GridPatternPainter extends CustomPainter {
  const _GridPatternPainter();

  @override
  void paint(Canvas canvas, Size size) {
    const gap = 42.0;
    final paint = Paint()
      ..color = const Color(0x144D7CFF)
      ..strokeWidth = 1;

    for (double x = 0; x <= size.width; x += gap) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += gap) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Decorative animated blur blob
class _BlurBlob extends StatefulWidget {
  final Color color;
  const _BlurBlob({required this.color});

  @override
  State<_BlurBlob> createState() => _BlurBlobState();
}

class _BlurBlobState extends State<_BlurBlob>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final dy = sin(_ctrl.value * 2 * pi) * 18;
        return Transform.translate(offset: Offset(0, dy), child: child);
      },
      child: Container(
        width: 420,
        height: 420,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [widget.color, widget.color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }
}

/// Hero screenshot + metrics panel
class _HeroCard extends StatelessWidget {
  final BuilderLocalizations t;
  const _HeroCard({required this.t});

  @override
  Widget build(BuildContext context) {
    final metrics = [
      _MetricData(
        value: '48 min',
        label: t.statAvgBuild,
        delta: t.isZh ? '-12%' : '-12%',
        positive: true,
      ),
      _MetricData(
        value: '92%',
        label: t.statLearnerCompletion,
        delta: t.isZh ? '+8.4%' : '+8.4%',
        positive: true,
      ),
      _MetricData(
        value: '132',
        label: t.statNewLearners,
        delta: t.isZh ? '+26' : '+26',
        positive: true,
      ),
      _MetricData(
        value: '4x',
        label: t.statBoostedIncome,
        delta: t.isZh ? '+1.2x' : '+1.2x',
        positive: true,
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xF7FCFFFF), Color(0xF2F5FFFF)],
        ),
        border: Border.all(color: const Color(0x24506E96)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2A253862),
            blurRadius: 44,
            offset: Offset(0, 24),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.landingTodaysSprint,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: _C.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      t.landingSprintSubtitle,
                      style: const TextStyle(fontSize: 14, color: _C.muted),
                    ),
                  ],
                ),
              ),
              const _GlassTag(
                label: 'Live Sync',
                icon: Icons.circle,
                background: Color(0x1434D399),
                borderColor: Color(0x3834D399),
                foreground: Color(0xFF0B7A56),
                compact: true,
              ),
            ],
          ),
          const SizedBox(height: 18),
          const _BuilderWorkbenchMock(),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossCount = constraints.maxWidth > 390 ? 2 : 1;
              return GridView.builder(
                itemCount: metrics.length,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossCount,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: crossCount == 2 ? 2.4 : 3.1,
                ),
                itemBuilder: (context, index) =>
                    _StatTile(data: metrics[index]),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _BuilderWorkbenchMock extends StatelessWidget {
  const _BuilderWorkbenchMock();

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 10,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF101B31), Color(0xFF1A2645)],
          ),
          border: Border.all(color: const Color(0x334D7CFF)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x40354A7C),
              blurRadius: 30,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Stack(
            children: [
              Positioned.fill(
                top: 40,
                child: Row(
                  children: [
                    Container(
                      width: 84,
                      color: const Color(0xFF0D1630),
                      padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          _MockSidebarTag(text: 'Flows'),
                          SizedBox(height: 8),
                          _MockSidebarTag(text: 'Quiz'),
                          SizedBox(height: 8),
                          _MockSidebarTag(text: 'Code'),
                          SizedBox(height: 8),
                          _MockSidebarTag(text: 'Media'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        color: const Color(0xFF172441),
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FBFF),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0x1C4D7CFF)),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 112,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDEE6FF),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                  const Spacer(),
                                  const _MockChip(
                                    text: 'Draft',
                                    color: Color(0xFFEFF4FF),
                                    textColor: Color(0xFF4563B5),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const _MockFlowNode(
                                title: 'Intro Module',
                                subtitle: 'Animation + Quick Quiz',
                                tone: Color(0xFF4D7CFF),
                              ),
                              const SizedBox(height: 8),
                              const _MockFlowNode(
                                title: 'Practice Stage',
                                subtitle: 'Code Task + Hints',
                                tone: Color(0xFF22C55E),
                              ),
                              const SizedBox(height: 8),
                              const _MockFlowNode(
                                title: 'Assessment',
                                subtitle: 'Adaptive Challenge',
                                tone: Color(0xFFF59E0B),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Container(
                      width: 136,
                      padding: const EdgeInsets.fromLTRB(10, 14, 10, 10),
                      color: const Color(0xFF121E37),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'AI Co-Pilot',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFAFC3F5),
                            ),
                          ),
                          SizedBox(height: 8),
                          _MockAssistCard(
                            title: 'Rewrite intro',
                            subtitle: 'More playful tone',
                          ),
                          SizedBox(height: 8),
                          _MockAssistCard(
                            title: 'Add challenge',
                            subtitle: '2-step coding task',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: const BoxDecoration(
                  color: Color(0xD40B1430),
                  border: Border(bottom: BorderSide(color: Color(0x2D82A5FF))),
                ),
                child: Row(
                  children: [
                    const _WindowDot(color: Color(0xFFFA5F56)),
                    const SizedBox(width: 6),
                    const _WindowDot(color: Color(0xFFFDBC2E)),
                    const SizedBox(width: 6),
                    const _WindowDot(color: Color(0xFF28C840)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        height: 24,
                        decoration: BoxDecoration(
                          color: const Color(0xFF172849),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0x1F8FB5D6)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        alignment: Alignment.centerLeft,
                        child: const Text(
                          'frontend-basics / module-01',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF9AB0DA),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                right: 12,
                bottom: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    color: const Color(0xEE0B1731),
                    border: Border.all(color: const Color(0x3358CC02)),
                  ),
                  child: const Text(
                    'Publish-ready 92%',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF8CF189),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Single stat tile inside the hero card
class _StatTile extends StatelessWidget {
  final _MetricData data;
  const _StatTile({required this.data});

  @override
  Widget build(BuildContext context) {
    final deltaColor = data.positive
        ? const Color(0xFF0E9F6E)
        : const Color(0xFFDC2626);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xF8FFFFFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F4D7CFF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A1E2E50),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            data.value,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            data.label,
            style: const TextStyle(fontSize: 12, color: _C.muted),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: deltaColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              data.delta,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: deltaColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Feature card
class _FeatureCard extends StatelessWidget {
  final String badge;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accent;

  const _FeatureCard({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      constraints: const BoxConstraints(minHeight: 176),
      decoration: BoxDecoration(
        color: const Color(0xF8FFFFFF),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F1E2E50),
            blurRadius: 32,
            offset: Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: accent),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _C.accentYellow.withValues(alpha: 0.22),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _C.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 14, color: _C.muted, height: 1.55),
          ),
        ],
      ),
    );
  }
}

/// Pill-shaped button
class _PillButton extends StatelessWidget {
  final String label;
  final bool filled;
  final IconData? icon;
  final VoidCallback onTap;

  const _PillButton({
    required this.label,
    required this.filled,
    this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (filled) {
      return ElevatedButton.icon(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF58CC02),
          foregroundColor: const Color(0xFF123300),
          elevation: 6,
          shadowColor: const Color(0x333A7A00),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
        icon: Icon(icon ?? Icons.arrow_forward_rounded, size: 18),
        label: Text(label),
      );
    }

    return OutlinedButton.icon(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: _C.text,
        backgroundColor: Colors.white.withValues(alpha: 0.65),
        side: const BorderSide(color: Color(0x33506E96)),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
      icon: Icon(icon ?? Icons.arrow_outward_rounded, size: 18),
      label: Text(label),
    );
  }
}

class _MetricData {
  final String value;
  final String label;
  final String delta;
  final bool positive;

  const _MetricData({
    required this.value,
    required this.label,
    required this.delta,
    required this.positive,
  });
}

class _MockSidebarTag extends StatelessWidget {
  final String text;
  const _MockSidebarTag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0x1A9AB5E6),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          color: Color(0xFF9AB0DA),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MockFlowNode extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color tone;

  const _MockFlowNode({
    required this.title,
    required this.subtitle,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: tone.withValues(alpha: 0.26)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: tone, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF253246),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF5F7186),
                    height: 1.3,
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

class _MockAssistCard extends StatelessWidget {
  final String title;
  final String subtitle;
  const _MockAssistCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(9),
        color: const Color(0xFF1B2B50),
        border: Border.all(color: const Color(0x265D83FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFFD3E1FF),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 9, color: Color(0xFFA3B6DE)),
          ),
        ],
      ),
    );
  }
}

class _MockChip extends StatelessWidget {
  final String text;
  final Color color;
  final Color textColor;

  const _MockChip({
    required this.text,
    required this.color,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: textColor,
        ),
      ),
    );
  }
}

class _WindowDot extends StatelessWidget {
  final Color color;
  const _WindowDot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _GlassTag extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color background;
  final Color borderColor;
  final Color foreground;
  final bool compact;

  const _GlassTag({
    required this.label,
    required this.icon,
    required this.background,
    required this.borderColor,
    required this.foreground,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 9 : 12,
        vertical: compact ? 5 : 7,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: compact ? 11 : 14, color: foreground),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: compact ? 11 : 13,
              fontWeight: FontWeight.w700,
              color: foreground,
            ),
          ),
        ],
      ),
    );
  }
}

class _TrustHintPill extends StatelessWidget {
  final String label;
  const _TrustHintPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: const Color(0xFFF4F8FF),
        border: Border.all(color: const Color(0x28517CFF)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFF3D5575),
        ),
      ),
    );
  }
}

class _WorkflowStepData {
  final String step;
  final IconData icon;
  final String title;
  final String subtitle;

  const _WorkflowStepData({
    required this.step,
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

class _WorkflowStepCard extends StatelessWidget {
  final _WorkflowStepData step;
  const _WorkflowStepCard({required this.step});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: const Color(0x1AE1ECFF),
        border: Border.all(color: const Color(0x338FB5D6)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0x243EA8FF),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(step.icon, color: const Color(0xFFCDE1FF), size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  step.subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: Color(0xC6D6E5F6),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            step.step,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF87B8E8),
            ),
          ),
        ],
      ),
    );
  }
}
