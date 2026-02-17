import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Landing page color constants (matching CSS template)
class _C {
  static const Color pageBg = Color(0xFF174A6B);
  static const Color gradientTop = Color(0xFF103452);
  static const Color gradientBottom = Color(0xFF1F5677);
  static const Color cardBg = Color(0xFFF3F4F6);
  static const Color titleColor = Color(0xFF5A6678);
  static const Color buttonBg = Color(0xFF42516A);
  static const Color heroText = Color(0xFFF5F8FB);
  static const Color heroSub = Color(0xE6EAF0F7); // rgba(234,240,247,0.9)
  static const Color sectionTitle = Color(0xFFF6F9FD);
  static const Color cardTitle = Color(0xFF485972);
  static const Color cardBody = Color(0xFF5A687C);
  static const Color cardBorder = Color(0xFFD2DDE9);
  static const Color advantageBorder = Color(
    0x8FCFDCEC,
  ); // rgba(207,220,236,0.56)
  static const Color advantageBg = Color(0x29F3F4F6); // rgba(243,244,246,0.16)
  static const Color advantageText = Color(
    0xF2F2F8FF,
  ); // rgba(242,248,255,0.95)
  static const Color footerBorder = Color(0xFFCFDAE7);
  static const Color navPillBg = Color(0xFFEEF2F7);
  static const Color navPillBorder = Color(0xFFD6DFEA);
  static const Color navText = Color(0xFF5A6678);
  static const Color brandText = Color(0xFF36485F);
  static const Color brandLogoBorder = Color(
    0x3D5F748B,
  ); // rgba(95,116,139,0.24)
}

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _featuresKey = GlobalKey();
  final GlobalKey _advantagesKey = GlobalKey();
  final GlobalKey _contactKey = GlobalKey();
  bool _mobileMenuOpen = false;
  double _rocketProgress = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final screenH = MediaQuery.of(context).size.height;
    final scrollY = _scrollController.offset;
    final startY = 0.0;
    final endY = screenH * 0.75;
    if (endY <= startY) return;
    final progress = ((scrollY - startY) / (endY - startY)).clamp(0.0, 1.0);
    if ((progress - _rocketProgress).abs() > 0.005) {
      setState(() => _rocketProgress = progress);
    }
  }

  void _scrollTo(GlobalKey key) {
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOut,
      );
    }
    if (_mobileMenuOpen) setState(() => _mobileMenuOpen = false);
  }

  void _scrollToTop() {
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
    );
    if (_mobileMenuOpen) setState(() => _mobileMenuOpen = false);
  }

  String? get _fontFamily => GoogleFonts.notoSansSc().fontFamily;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth <= 900;
    final isSmall = screenWidth <= 640;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(-0.3, -1),
            end: Alignment(0.3, 1),
            colors: [_C.gradientTop, _C.pageBg, _C.gradientBottom],
          ),
        ),
        child: Stack(
          children: [
            // Background radial gradients
            Positioned.fill(
              child: IgnorePointer(child: CustomPaint(painter: _BgPainter())),
            ),
            // Main scrollable content
            CustomScrollView(
              controller: _scrollController,
              slivers: [
                // Sticky header
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _HeaderDelegate(
                    isMobile: isMobile,
                    isSmall: isSmall,
                    fontFamily: _fontFamily,
                    onHome: _scrollToTop,
                    onFeatures: () => _scrollTo(_featuresKey),
                    onAdvantages: () => _scrollTo(_advantagesKey),
                    onContact: () => _scrollTo(_contactKey),
                    onMenuToggle: () =>
                        setState(() => _mobileMenuOpen = !_mobileMenuOpen),
                    mobileMenuOpen: _mobileMenuOpen,
                  ),
                ),
                // Mobile nav dropdown
                if (_mobileMenuOpen && isMobile)
                  SliverToBoxAdapter(child: _buildMobileNav()),
                // Hero
                SliverToBoxAdapter(child: _buildHero(isMobile)),
                // Features
                SliverToBoxAdapter(child: _buildFeatures(isMobile)),
                // Advantages
                SliverToBoxAdapter(child: _buildAdvantages(isMobile, isSmall)),
                // Footer
                SliverToBoxAdapter(child: _buildFooter()),
                const SliverToBoxAdapter(child: SizedBox(height: 22)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileNav() {
    return Center(
      child: Container(
        width: min(440, MediaQuery.of(context).size.width - 28),
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F5F9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFD5DEEA)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x29000000),
              blurRadius: 30,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: Column(
          children: [
            _mobileNavItem('Home', _scrollToTop),
            _mobileNavItem('Features', () => _scrollTo(_featuresKey)),
            _mobileNavItem('Advantages', () => _scrollTo(_advantagesKey)),
            _mobileNavItem('Contact', () => _scrollTo(_contactKey)),
          ],
        ),
      ),
    );
  }

  Widget _mobileNavItem(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: _fontFamily,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF495A71),
          ),
        ),
      ),
    );
  }

  Widget _buildHero(bool isMobile) {
    final screenHeight = MediaQuery.of(context).size.height;
    final lift = -320 * _rocketProgress;
    final drift = 44 * _rocketProgress;
    final wobble = sin(_rocketProgress * pi * 10) * 3.2;
    final angle = (-14 + _rocketProgress * 22 + wobble) * pi / 180;
    final fade = 0.82 + _rocketProgress * 0.18;

    return SizedBox(
      height: isMobile ? screenHeight - 104 : screenHeight - 132,
      child: Stack(
        children: [
          Center(
            child: Padding(
              padding: EdgeInsets.only(
                top: isMobile ? 36 : 0,
                left: 12,
                right: 12,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Learn by thinking, not just watching',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: _fontFamily,
                        fontSize: isMobile ? 28 : 48,
                        fontWeight: FontWeight.w700,
                        color: _C.heroText,
                        height: 1.08,
                        letterSpacing: 0.01,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Build and learn interactive STEM courses - from drag-and-drop authoring to brilliant-like lessons.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: _fontFamily,
                        fontSize: isMobile ? 15 : 18,
                        color: _C.heroSub,
                        height: 1.62,
                      ),
                    ),
                    const SizedBox(height: 28),
                    _buildCtaButton(),
                  ],
                ),
              ),
            ),
          ),
          // Rocket
          Positioned(
            right: isMobile ? 4 : 80,
            bottom: isMobile ? -8 : 40,
            child: Transform.translate(
              offset: Offset(drift, lift),
              child: Transform.rotate(
                angle: angle,
                child: Opacity(
                  opacity: fade,
                  child: SizedBox(
                    width: isMobile ? 70 : 90,
                    child: const _RocketSvg(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCtaButton() {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () => Navigator.of(context).pushNamed('/login'),
        child: Container(
          padding: const EdgeInsets.only(
            left: 12,
            top: 12,
            bottom: 12,
            right: 24,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Colors.white.withValues(alpha: 0.34)),
            color: const Color(0x24F3F4F6), // rgba(243,244,246,0.14)
            boxShadow: const [
              BoxShadow(
                color: Color(0x47061929),
                blurRadius: 24,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xC7C1D3E8), // rgba(193,211,232,0.78)
                  ),
                  gradient: const LinearGradient(
                    begin: Alignment(-0.4, -0.8),
                    end: Alignment(0.4, 0.8),
                    colors: [Color(0xFFF5F8FC), Color(0xFFD7E1ED)],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Get Start',
                style: TextStyle(
                  fontFamily: _fontFamily,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFEFF5FA),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatures(bool isMobile) {
    return Container(
      key: _featuresKey,
      width: double.infinity,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 14 : 0,
        vertical: isMobile ? 42 : 64,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1160),
          child: Column(
            children: [
              Text(
                'Features',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: _fontFamily,
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: FontWeight.w700,
                  color: _C.sectionTitle,
                ),
              ),
              const SizedBox(height: 24),
              isMobile
                  ? Column(
                      children: [
                        _featureCard('Builder', const [
                          'Drag-and-drop lesson blocks',
                          'Instant preview while editing',
                          'Export/Import as Course JSON schema',
                          'Cloud save & publish (Supabase-ready)',
                          'AI-assisted course drafting (placeholder)',
                        ]),
                        const SizedBox(height: 16),
                        _featureCard('Viewer', const [
                          'Interactive lessons (sliders, feedback, animations)',
                          'Learn-by-doing flows (not passive video)',
                          'Progress tracking and profiles',
                          'Search & course discovery (placeholder)',
                          'Light/Dark themes',
                        ]),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: _featureCard('Builder', const [
                            'Drag-and-drop lesson blocks',
                            'Instant preview while editing',
                            'Export/Import as Course JSON schema',
                            'Cloud save & publish (Supabase-ready)',
                            'AI-assisted course drafting (placeholder)',
                          ]),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _featureCard('Viewer', const [
                            'Interactive lessons (sliders, feedback, animations)',
                            'Learn-by-doing flows (not passive video)',
                            'Progress tracking and profiles',
                            'Search & course discovery (placeholder)',
                            'Light/Dark themes',
                          ]),
                        ),
                      ],
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _featureCard(String title, List<String> items) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      decoration: BoxDecoration(
        color: _C.cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _C.cardBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x26000000),
            blurRadius: 30,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontFamily: _fontFamily,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _C.cardTitle,
            ),
          ),
          const SizedBox(height: 14),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '  \u2022  ',
                    style: TextStyle(color: _C.cardBody),
                  ),
                  Expanded(
                    child: Text(
                      item,
                      style: TextStyle(
                        fontFamily: _fontFamily,
                        color: _C.cardBody,
                        height: 1.42,
                      ),
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

  Widget _buildAdvantages(bool isMobile, bool isSmall) {
    final items = [
      'Faster authoring: compose lessons in minutes',
      'Better retention: active learning over passive watching',
      'Portable content: JSON decouples content from UI',
      'Web-first: works across devices',
      'Scalable backend path: auth/storage/search with Supabase',
      'Consistent design system across Builder & Viewer',
    ];

    final crossAxisCount = isSmall ? 1 : (isMobile ? 2 : 3);

    return Container(
      key: _advantagesKey,
      width: double.infinity,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 14 : 0,
        vertical: isMobile ? 42 : 64,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1160),
          child: Column(
            children: [
              Text(
                'Advantages',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: _fontFamily,
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: FontWeight.w700,
                  color: _C.sectionTitle,
                ),
              ),
              const SizedBox(height: 24),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: isSmall ? 4 : (isMobile ? 2.2 : 2.6),
                ),
                itemCount: items.length,
                itemBuilder: (context, index) => _advantageCard(items[index]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _advantageCard(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      decoration: BoxDecoration(
        color: _C.advantageBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _C.advantageBorder),
      ),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            fontFamily: _fontFamily,
            fontWeight: FontWeight.w600,
            color: _C.advantageText,
            height: 1.45,
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Center(
      key: _contactKey,
      child: Container(
        width: min(1160, MediaQuery.of(context).size.width - 28),
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: _C.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _C.footerBorder),
          boxShadow: const [
            BoxShadow(
              color: Color(0x24000000),
              blurRadius: 20,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Text.rich(
          TextSpan(
            text: 'Contact: ',
            style: TextStyle(fontFamily: _fontFamily, color: _C.titleColor),
            children: [
              TextSpan(
                text: 'hello@primoria.example',
                style: TextStyle(
                  fontFamily: _fontFamily,
                  color: _C.buttonBg,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

// ─── Header delegate ───────────────────────────────────────────────────────────

class _HeaderDelegate extends SliverPersistentHeaderDelegate {
  final bool isMobile;
  final bool isSmall;
  final String? fontFamily;
  final VoidCallback onHome;
  final VoidCallback onFeatures;
  final VoidCallback onAdvantages;
  final VoidCallback onContact;
  final VoidCallback onMenuToggle;
  final bool mobileMenuOpen;

  _HeaderDelegate({
    required this.isMobile,
    required this.isSmall,
    required this.fontFamily,
    required this.onHome,
    required this.onFeatures,
    required this.onAdvantages,
    required this.onContact,
    required this.onMenuToggle,
    required this.mobileMenuOpen,
  });

  @override
  double get maxExtent => 80;
  @override
  double get minExtent => 80;

  @override
  bool shouldRebuild(covariant _HeaderDelegate oldDelegate) =>
      isMobile != oldDelegate.isMobile ||
      isSmall != oldDelegate.isSmall ||
      mobileMenuOpen != oldDelegate.mobileMenuOpen;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Padding(
      padding: EdgeInsets.only(
        top: isSmall ? 10 : 16,
        left: isSmall ? 8 : 14,
        right: isSmall ? 8 : 14,
      ),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 1160),
          padding: EdgeInsets.symmetric(
            horizontal: isSmall ? 10 : 10,
            vertical: 8,
          ),
          decoration: BoxDecoration(
            color: const Color(0xEBF3F4F6), // rgba(243,244,246,0.92)
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: const Color(0x5CB2C5DA), // rgba(178,197,218,0.36)
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x2E000000),
                blurRadius: 30,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              // Brand
              _buildBrand(context),
              const Spacer(),
              // Nav (desktop only)
              if (!isMobile) _buildDesktopNav(),
              if (!isMobile) const Spacer(),
              // Actions
              _buildActions(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrand(BuildContext context) {
    return GestureDetector(
      onTap: onHome,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: Container(
                width: isSmall ? 36 : 40,
                height: isSmall ? 36 : 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: _C.brandLogoBorder),
                  color: const Color(0xFFF8FCFF),
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/logo_with_bg.png',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Center(
                      child: Text(
                        'P',
                        style: TextStyle(
                          fontFamily: fontFamily,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF3F5370),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Primoria',
              style: TextStyle(
                fontFamily: fontFamily,
                fontSize: isSmall ? 14.7 : 16.2,
                fontWeight: FontWeight.w700,
                color: _C.brandText,
                letterSpacing: 0.01,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopNav() {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: _C.navPillBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _C.navPillBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _navLink('Home', onHome),
          const SizedBox(width: 6),
          _navLink('Features', onFeatures),
          const SizedBox(width: 6),
          _navLink('Advantages', onAdvantages),
        ],
      ),
    );
  }

  Widget _navLink(String label, VoidCallback onTap) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(999)),
          child: Text(
            label,
            style: TextStyle(
              fontFamily: fontFamily,
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: _C.navText,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Hamburger menu button
        MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: onMenuToggle,
            child: Container(
              width: isSmall ? 38 : 42,
              height: isSmall ? 38 : 42,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF7F9FC),
                border: Border.all(color: const Color(0xFFCFD9E5)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  3,
                  (_) => Container(
                    width: 16,
                    height: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    decoration: BoxDecoration(
                      color: _C.navText,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        // Contact pill
        MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: onContact,
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: isSmall ? 11 : 18,
                vertical: isSmall ? 8 : 11,
              ),
              decoration: BoxDecoration(
                color: _C.buttonBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'Contact',
                style: TextStyle(
                  fontFamily: fontFamily,
                  fontWeight: FontWeight.w600,
                  fontSize: isSmall ? 12.6 : 14.2,
                  color: const Color(0xFFF8FBFF),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Background painter ────────────────────────────────────────────────────────

class _BgPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Top-left radial gradient
    final p1 = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.64, -0.64),
        radius: 0.48,
        colors: [
          const Color(0x38ACC3E0), // rgba(172,195,224,0.22)
          const Color(0x00ACC3E0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), p1);

    // Bottom-right radial gradient
    final p2 = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.76, 0.56),
        radius: 0.45,
        colors: [
          const Color(0x24FFFFFF), // rgba(255,255,255,0.14)
          const Color(0x00FFFFFF),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), p2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Rocket SVG (drawn via CustomPaint) ────────────────────────────────────────

class _RocketSvg extends StatelessWidget {
  const _RocketSvg();

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 64 / 128,
      child: CustomPaint(painter: _RocketPainter()),
    );
  }
}

class _RocketPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 64;
    final sy = size.height / 128;

    // Rocket body gradient
    final bodyPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: [const Color(0xFFDBE4EF), const Color(0xFFF7FBFF)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final bodyPath = Path()
      ..moveTo(32 * sx, 6 * sy)
      ..cubicTo(23 * sx, 16 * sy, 18 * sx, 29 * sy, 18 * sx, 51 * sy)
      ..lineTo(18 * sx, 86 * sy)
      ..lineTo(46 * sx, 86 * sy)
      ..lineTo(46 * sx, 51 * sy)
      ..cubicTo(46 * sx, 29 * sy, 41 * sx, 16 * sy, 32 * sx, 6 * sy)
      ..close();
    canvas.drawPath(bodyPath, bodyPaint);

    // Window
    canvas.drawCircle(
      Offset(32 * sx, 42 * sy),
      8 * sx,
      Paint()..color = const Color(0xFF174A6B),
    );

    // Fins
    final finPaint = Paint()..color = const Color(0xFF7388A4);
    final leftFin = Path()
      ..moveTo(18 * sx, 70 * sy)
      ..lineTo(9 * sx, 84 * sy)
      ..lineTo(18 * sx, 86 * sy)
      ..close();
    canvas.drawPath(leftFin, finPaint);
    final rightFin = Path()
      ..moveTo(46 * sx, 70 * sy)
      ..lineTo(55 * sx, 84 * sy)
      ..lineTo(46 * sx, 86 * sy)
      ..close();
    canvas.drawPath(rightFin, finPaint);

    // Flame outer
    final flameOuter = Path()
      ..moveTo(24 * sx, 86 * sy)
      ..cubicTo(24 * sx, 104 * sy, 28 * sx, 116 * sy, 32 * sx, 122 * sy)
      ..cubicTo(36 * sx, 116 * sy, 40 * sx, 104 * sy, 40 * sx, 86 * sy)
      ..close();
    canvas.drawPath(flameOuter, Paint()..color = const Color(0xFFF8B24C));

    // Flame inner
    final flameInner = Path()
      ..moveTo(28 * sx, 86 * sy)
      ..cubicTo(28 * sx, 96 * sy, 30 * sx, 103 * sy, 32 * sx, 108 * sy)
      ..cubicTo(34 * sx, 103 * sy, 36 * sx, 96 * sy, 36 * sx, 86 * sy)
      ..close();
    canvas.drawPath(flameInner, Paint()..color = const Color(0xFFFFD79B));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
