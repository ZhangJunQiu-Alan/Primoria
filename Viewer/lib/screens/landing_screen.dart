import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class _C {
  const _C._();

  static const page = Color(0xFFF3F3F6);
  static const ink = Color(0xFF05070C);
  static const body = Color(0xFF4A4D56);
  static const accent = Color(0xFF11B4FF);
  static const accentDeep = Color(0xFF0D7DEB);

  static const featureBuilderStart = Color(0xFF1AE86B);
  static const featureBuilderEnd = Color(0xFF008FE8);
  static const featureViewerStart = Color(0xFF1682F8);
  static const featureViewerEnd = Color(0xFF6B48D9);

  static const advantagesTop = Color(0xFF0E86E3);
  static const advantagesBottom = Color(0xFF0C9DB7);
  static const footer = Color(0xFF0E4AA7);
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
  final GlobalKey _advantagesKey = GlobalKey();
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
    final targetContext = key.currentContext;
    if (targetContext == null) return;
    Scrollable.ensureVisible(
      targetContext,
      duration: const Duration(milliseconds: 550),
      curve: Curves.easeInOutCubic,
    );
  }

  void _goToLogin() => Navigator.of(context).pushNamed('/login');

  TextStyle _headlineStyle(double size) => GoogleFonts.sora(
    fontSize: size,
    fontWeight: FontWeight.w700,
    height: 0.98,
    color: _C.ink,
  );

  TextStyle _bodyStyle(double size, {Color? color, FontWeight? weight}) =>
      GoogleFonts.manrope(
        fontSize: size,
        height: 1.25,
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
                _buildFeatures(),
                _buildAdvantages(),
                _buildCommunity(),
                _buildFooter(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 14),
      child: Row(
        children: [
          const _BrandMark(size: 22, withGlow: false),
          const SizedBox(width: 10),
          Text(
            'PRIMORIA',
            style: GoogleFonts.sora(
              color: _C.accent,
              fontSize: 24,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHero() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 980;
        final hPad = wide ? 86.0 : 24.0;

        return Container(
          padding: EdgeInsets.fromLTRB(hPad, 16, hPad, wide ? 112 : 78),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                top: wide ? -8 : 36,
                right: wide ? 170 : 6,
                child: IgnorePointer(child: _GearBackdrop(isWide: wide)),
              ),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 7, child: _buildHeroCopy(wide: true)),
                        const SizedBox(width: 60),
                        Padding(
                          padding: const EdgeInsets.only(top: 74),
                          child: _buildGetStartedButton(fullWidth: false),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildHeroCopy(wide: false),
                        const SizedBox(height: 30),
                        _buildGetStartedButton(fullWidth: true),
                      ],
                    ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeroCopy({required bool wide}) {
    final headlineSize = wide ? 68.0 : 46.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            style: _headlineStyle(headlineSize),
            children: [
              const TextSpan(text: 'Learn by '),
              TextSpan(
                text: 'Thinking',
                style: _headlineStyle(headlineSize).copyWith(color: _C.accent),
              ),
              const TextSpan(text: '\nnot just Watching'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: wide ? 610 : 420),
          child: Text(
            'Build and learn interactive STEM courses - from drag and drop '
            'authoring to brilliant-like lessons',
            style: _bodyStyle(wide ? 19 : 17),
          ),
        ),
      ],
    );
  }

  Widget _buildGetStartedButton({required bool fullWidth}) {
    return SizedBox(
      width: fullWidth ? double.infinity : 260,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(9),
          gradient: const LinearGradient(
            colors: [_C.accentDeep, Color(0xFF14D7E8)],
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x3210A6E3),
              blurRadius: 20,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: TextButton(
          onPressed: _goToLogin,
          style: TextButton.styleFrom(
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            textStyle: GoogleFonts.sora(
              fontSize: 12,
              letterSpacing: 0.7,
              fontWeight: FontWeight.w700,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(9),
            ),
          ),
          child: const Text('GET STARTED'),
        ),
      ),
    );
  }

  Widget _buildFeatures() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 1020;
        final hPad = wide ? 86.0 : 24.0;

        final builderItems = const [
          'Drag and drop lesson blocks',
          'Instant preview while editing',
          'Export/Import as Course JSON schema',
          'Cloud save & publish (Supabase-ready)',
          'AI Assisted course drafting (Placeholder)',
        ];
        final viewerItems = const [
          'Light/Dark Themes',
          'Progress tracking and profiles',
          'Interactive lessons (Sliders, Feedback, ...)',
          'Learn by doing flows (Not passive video)',
          'Search & Course discovery (Placeholder)',
        ];

        return Container(
          key: _featuresKey,
          padding: EdgeInsets.fromLTRB(hPad, 0, hPad, wide ? 92 : 72),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Features',
                style: GoogleFonts.sora(
                  fontSize: wide ? 32 : 28,
                  fontWeight: FontWeight.w700,
                  color: _C.accent,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Everything You Need.',
                style: _headlineStyle(wide ? 64 : 48),
              ),
              const SizedBox(height: 34),
              wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _FeatureCard(
                            title: 'Builder',
                            lines: builderItems,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                _C.featureBuilderStart,
                                _C.featureBuilderEnd,
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 44),
                        Expanded(
                          child: _FeatureCard(
                            title: 'Viewer',
                            lines: viewerItems,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                _C.featureViewerStart,
                                _C.featureViewerEnd,
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        _FeatureCard(
                          title: 'Builder',
                          lines: builderItems,
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              _C.featureBuilderStart,
                              _C.featureBuilderEnd,
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        _FeatureCard(
                          title: 'Viewer',
                          lines: viewerItems,
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              _C.featureViewerStart,
                              _C.featureViewerEnd,
                            ],
                          ),
                        ),
                      ],
                    ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAdvantages() {
    final items = const [
      _AdvantageData(
        icon: Icons.flash_on_rounded,
        title: 'Faster Authoring',
        subtitle: 'Compose Lessons in Minutes',
      ),
      _AdvantageData(
        icon: Icons.track_changes_rounded,
        title: 'Better Retention',
        subtitle: 'Active Learning over passive watching',
      ),
      _AdvantageData(
        icon: Icons.description_rounded,
        title: 'Portable Content',
        subtitle: 'JSON decouples content from UI',
      ),
      _AdvantageData(
        icon: Icons.public_rounded,
        title: 'Web-First',
        subtitle: 'Works Across Devices',
      ),
      _AdvantageData(
        icon: Icons.design_services_rounded,
        title: 'Consistent Design',
        subtitle: 'Across Builder & Viewer',
      ),
      _AdvantageData(
        icon: Icons.storage_rounded,
        title: 'Scalable Backend Path',
        subtitle: 'Auth/Storage/Search with Supabase',
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final sideHeading = constraints.maxWidth >= 1220;
        final hPad = sideHeading ? 36.0 : 18.0;

        return Container(
          key: _advantagesKey,
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_C.advantagesTop, _C.advantagesBottom],
            ),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              hPad,
              sideHeading ? 64 : 50,
              hPad,
              sideHeading ? 66 : 56,
            ),
            child: sideHeading
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildAdvantageCards(items, wide: true)),
                      const SizedBox(width: 36),
                      SizedBox(
                        width: 390,
                        child: _buildAdvantageHeading(wide: true),
                      ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildAdvantageHeading(wide: false),
                      const SizedBox(height: 26),
                      _buildAdvantageCards(items, wide: false),
                    ],
                  ),
          ),
        );
      },
    );
  }

  Widget _buildAdvantageHeading({required bool wide}) {
    return Padding(
      padding: EdgeInsets.only(left: wide ? 4 : 8, top: wide ? 8 : 0),
      child: Column(
        crossAxisAlignment: wide
            ? CrossAxisAlignment.start
            : CrossAxisAlignment.center,
        children: [
          Text(
            'Advantages',
            softWrap: false,
            style: GoogleFonts.sora(
              color: Colors.white,
              fontSize: wide ? 62 : 48,
              fontWeight: FontWeight.w700,
              height: 1,
            ),
            textAlign: wide ? TextAlign.start : TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'WHY CHOOSE US',
            softWrap: false,
            style: GoogleFonts.sora(
              color: Colors.white.withValues(alpha: 0.55),
              fontSize: wide ? 30 : 24,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
            textAlign: wide ? TextAlign.start : TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAdvantageCards(
    List<_AdvantageData> items, {
    required bool wide,
  }) {
    const offsets = [0.0, 64.0, 126.0, 188.0, 250.0, 312.0];

    if (!wide) {
      return Column(
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _AdvantageCard(data: item, maxWidth: double.infinity),
              ),
            )
            .toList(),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(
        items.length,
        (index) => Padding(
          padding: EdgeInsets.only(left: offsets[index], bottom: 14),
          child: _AdvantageCard(data: items[index], maxWidth: 420),
        ),
      ),
    );
  }

  Widget _buildCommunity() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        return Container(
          key: _communityKey,
          padding: EdgeInsets.fromLTRB(20, wide ? 94 : 70, 20, wide ? 94 : 70),
          child: Column(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: wide ? 430 : 320,
                    height: wide ? 430 : 320,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          _C.accent.withValues(alpha: 0.44),
                          _C.accent.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                  const _BrandMark(size: 148, withGlow: true),
                ],
              ),
              const SizedBox(height: 26),
              RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  style: _headlineStyle(wide ? 62 : 44),
                  children: [
                    const TextSpan(text: 'Join the '),
                    TextSpan(
                      text: 'community',
                      style: _headlineStyle(
                        wide ? 62 : 44,
                      ).copyWith(color: _C.accentDeep),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Be part of the future of interactive learning',
                textAlign: TextAlign.center,
                style: _bodyStyle(wide ? 18 : 16),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFooter() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 900;
        final hPad = wide ? 56.0 : 22.0;
        final headingStyle = GoogleFonts.sora(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        );
        final linkStyle = GoogleFonts.manrope(
          fontSize: 16,
          color: Colors.white.withValues(alpha: 0.86),
          fontWeight: FontWeight.w500,
        );

        return Container(
          key: _contactKey,
          color: _C.footer,
          padding: EdgeInsets.fromLTRB(hPad, 46, hPad, 28),
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
                              flex: 2,
                              child: _buildFooterBrand(wide: true),
                            ),
                            const SizedBox(width: 90),
                            _buildFooterColumn(
                              heading: 'Product',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  'Features',
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  'Advantages',
                                  () => _scrollTo(_advantagesKey),
                                ),
                                _FooterLink(
                                  'Pricing',
                                  () => Navigator.of(
                                    context,
                                  ).pushNamed('/register'),
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
                            const SizedBox(height: 24),
                            _buildFooterColumn(
                              heading: 'Product',
                              headingStyle: headingStyle,
                              linkStyle: linkStyle,
                              links: [
                                _FooterLink(
                                  'Features',
                                  () => _scrollTo(_featuresKey),
                                ),
                                _FooterLink(
                                  'Advantages',
                                  () => _scrollTo(_advantagesKey),
                                ),
                                _FooterLink(
                                  'Pricing',
                                  () => Navigator.of(
                                    context,
                                  ).pushNamed('/register'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
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
                  const SizedBox(height: 40),
                  Text(
                    'Copyright © 2026 PRIMORIA. All rights reserved. No part '
                    'of this website or any of its contents may be reproduced, '
                    'copied, modified, or adapted without prior written consent '
                    'of the author, unless otherwise indicated for stand-alone '
                    'materials. All content, including text, images, and graphics, '
                    'is protected by international copyright laws.',
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.74),
                      height: 1.5,
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
                fontSize: 30,
                letterSpacing: 1,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ConstrainedBox(
          constraints: BoxConstraints(maxWidth: wide ? 420 : double.infinity),
          child: Text(
            'Building the future of interactive STEM education with powerful '
            'authoring tools and engaging learning experiences',
            style: _bodyStyle(
              16,
              color: Colors.white.withValues(alpha: 0.88),
              weight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Icon(
              Icons.mail_outline_rounded,
              size: 18,
              color: Colors.white.withValues(alpha: 0.92),
            ),
            const SizedBox(width: 8),
            Text(
              'hello@primoria.example',
              style: _bodyStyle(
                15,
                color: Colors.white.withValues(alpha: 0.92),
                weight: FontWeight.w600,
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
        const SizedBox(height: 12),
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
}

class _FeatureCard extends StatelessWidget {
  final String title;
  final List<String> lines;
  final Gradient gradient;

  const _FeatureCard({
    required this.title,
    required this.lines,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 236),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3A0B1834),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -36,
            top: 16,
            child: Container(
              width: 138,
              height: 138,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.12),
              ),
            ),
          ),
          Positioned(
            left: 16,
            bottom: -34,
            child: Transform.rotate(
              angle: -0.6,
              child: Container(
                width: 112,
                height: 38,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 22, 24, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.sora(
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                ...lines.map(
                  (line) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      line,
                      style: GoogleFonts.manrope(
                        fontSize: 16,
                        height: 1.3,
                        color: Colors.white.withValues(alpha: 0.95),
                        fontWeight: FontWeight.w500,
                      ),
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

class _AdvantageData {
  final IconData icon;
  final String title;
  final String subtitle;
  const _AdvantageData({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
}

class _AdvantageCard extends StatelessWidget {
  final _AdvantageData data;
  final double maxWidth;

  const _AdvantageCard({required this.data, required this.maxWidth});

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A002747),
              blurRadius: 14,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.26),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                data.icon,
                color: Colors.white.withValues(alpha: 0.9),
                size: 21,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.title,
                    style: GoogleFonts.sora(
                      fontSize: 17,
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    data.subtitle,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w500,
                    ),
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

class _GearBackdrop extends StatelessWidget {
  final bool isWide;

  const _GearBackdrop({required this.isWide});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: isWide ? 480 : 260,
      height: isWide ? 340 : 220,
      child: Stack(
        children: [
          Positioned(
            left: isWide ? 92 : 24,
            top: 6,
            child: Icon(
              Icons.settings_rounded,
              size: isWide ? 188 : 108,
              color: const Color(0x0B0C1320),
            ),
          ),
          Positioned(
            right: isWide ? 88 : 18,
            top: isWide ? 96 : 68,
            child: Icon(
              Icons.settings_rounded,
              size: isWide ? 156 : 96,
              color: const Color(0x0A0C1320),
            ),
          ),
          Positioned(
            left: isWide ? 218 : 108,
            top: isWide ? 164 : 114,
            child: Icon(
              Icons.settings_rounded,
              size: isWide ? 140 : 78,
              color: const Color(0x090C1320),
            ),
          ),
        ],
      ),
    );
  }
}

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
          'V',
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

class _FooterLink {
  final String label;
  final VoidCallback? onTap;
  const _FooterLink(this.label, this.onTap);
}
