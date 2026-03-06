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

  void _showSignInOverlay(BuildContext context, BuilderLocalizations t) {
    showDialog(
      context: context,
      barrierColor: const Color(0xB80F1826),
      builder: (ctx) => _SignInModal(
        t: t,
        // Navigation is driven entirely by builderAccessNotifier + GoRouter.
        // Calling ScaffoldMessenger / context.go here is unsafe: by the time
        // onSuccess fires, the router may have already navigated away and
        // deactivated this context.
        onSuccess: null,
      ),
    );
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
              // Decorative blur blobs
              Positioned(
                top: -120,
                left: -120,
                child: _BlurBlob(color: _C.accent.withValues(alpha: 0.22)),
              ),
              Positioned(
                bottom: -120,
                right: -120,
                child: _BlurBlob(color: _C.primary.withValues(alpha: 0.28)),
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

        final leftColumn = Padding(
          padding: EdgeInsets.only(left: gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Tag
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: _C.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  t.landingTagline,
                  style: const TextStyle(
                    color: Color(0xFF1D6B00),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Headline
              Text(
                t.landingHeadline,
                style: TextStyle(
                  fontSize: wide ? 42 : 32,
                  fontWeight: FontWeight.w700,
                  height: 1.1,
                  color: _C.text,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                t.landingSubtitle,
                style: const TextStyle(
                  fontSize: 16,
                  color: _C.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              // Quote card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: _C.accent.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(18),
                  border: Border(left: BorderSide(color: _C.accent, width: 4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.landingQuote,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: _C.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Richard Feynman',
                      style: TextStyle(fontSize: 13, color: _C.muted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              // Action buttons
              Wrap(
                spacing: 16,
                runSpacing: 12,
                children: [
                  _PillButton(
                    label: t.landingApplyNow,
                    filled: true,
                    onTap: () {},
                  ),
                  _PillButton(
                    label: t.landingAlreadyQualified,
                    filled: false,
                    onTap: () => _showSignInOverlay(context, t),
                  ),
                ],
              ),
            ],
          ),
        );

        final rightColumn = Padding(
          padding: EdgeInsets.only(right: gutter),
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
          ),
          _FeatureCard(
            badge: t.featureBadge2,
            title: t.featureTitle2,
            subtitle: t.featureSubtitle2,
          ),
          _FeatureCard(
            badge: t.featureBadge3,
            title: t.featureTitle3,
            subtitle: t.featureSubtitle3,
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
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 32),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _C.primary.withValues(alpha: 0.18),
                  _C.accent.withValues(alpha: 0.16),
                ],
              ),
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
                                fontWeight: FontWeight.w700,
                                color: _C.text,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t.landingReadySubtitle,
                              style: const TextStyle(
                                color: _C.muted,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 24),
                      _PillButton(
                        label: t.landingStartCreating,
                        filled: true,
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
                          fontWeight: FontWeight.w700,
                          color: _C.text,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        t.landingReadySubtitle,
                        style: const TextStyle(color: _C.muted, fontSize: 15),
                      ),
                      const SizedBox(height: 20),
                      _PillButton(
                        label: t.landingStartCreating,
                        filled: true,
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
        width: 380,
        height: 380,
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

/// Hero stats card
class _HeroCard extends StatelessWidget {
  final BuilderLocalizations t;
  const _HeroCard({required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xE6FFFFFF), Color(0xD9F0F8FF)],
        ),
        border: Border.all(color: const Color(0x1F506E96)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.landingTodaysSprint,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t.landingSprintSubtitle,
            style: const TextStyle(fontSize: 14, color: _C.muted),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossCount = constraints.maxWidth > 300 ? 2 : 1;
              return GridView.count(
                crossAxisCount: crossCount,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 2.2,
                children: [
                  _StatTile(value: '48 min', label: t.statAvgBuild),
                  _StatTile(value: '92%', label: t.statLearnerCompletion),
                  _StatTile(value: '132', label: t.statNewLearners),
                  _StatTile(value: '4x', label: t.statBoostedIncome),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Single stat tile inside the hero card
class _StatTile extends StatelessWidget {
  final String value;
  final String label;
  const _StatTile({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1E1E2E50),
            blurRadius: 25,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: _C.muted)),
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

  const _FeatureCard({
    required this.badge,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      constraints: const BoxConstraints(minHeight: 150),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0x14506E96)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x261E2E50),
            blurRadius: 40,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _C.accentYellow.withValues(alpha: 0.2),
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
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 14, color: _C.muted, height: 1.5),
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
  final VoidCallback onTap;

  const _PillButton({
    required this.label,
    required this.filled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (filled) {
      return ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: _C.primary,
          foregroundColor: const Color(0xFF0F2C00),
          elevation: 4,
          shadowColor: const Color(0x1E1E2E50),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        child: Text(label),
      );
    }

    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: _C.text,
        side: const BorderSide(color: Color(0x2E506E96)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
      child: Text(label),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  Sign-in modal overlay
// ═══════════════════════════════════════════════════════

class _SignInModal extends StatefulWidget {
  final BuilderLocalizations t;
  final VoidCallback? onSuccess;
  const _SignInModal({required this.t, this.onSuccess});

  @override
  State<_SignInModal> createState() => _SignInModalState();
}

class _SignInModalState extends State<_SignInModal> {
  bool _showPasswordForm = false;
  bool _isLoading = false;
  String? _statusMessage;
  bool _isError = false;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _setStatus(String msg, {bool error = false}) {
    setState(() {
      _statusMessage = msg;
      _isError = error;
    });
  }

  Future<void> _signInWithGoogle() async {
    await _handleOAuthSignIn(
      action: SupabaseService.signInWithGoogle,
      notFoundMessage: widget.t.signInNotFoundMsg,
    );
  }

  Future<void> _handleOAuthSignIn({
    required Future<AuthResult> Function() action,
    required String notFoundMessage,
  }) async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });
    final result = await action();
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else if (result.isUserNotFound) {
      _setStatus(notFoundMessage, error: true);
    } else {
      _setStatus(result.message, error: true);
    }
  }

  Future<void> _signInWithPassword() async {
    final t = widget.t;
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      _setStatus(t.signInEmptyFields, error: true);
      return;
    }
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });
    final result = await SupabaseService.signIn(
      email: email,
      password: password,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else if (result.isUserNotFound) {
      _setStatus(t.signInInvalidCredentials, error: true);
    } else {
      _setStatus(result.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 420,
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0x29506E96)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x400A1428),
                blurRadius: 60,
                offset: Offset(0, 28),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Close button
              Align(
                alignment: Alignment.topRight,
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _C.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      t.signInClose,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: _C.accent,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // Logo
              Image.asset(
                'assets/imgs/logo32.png',
                width: 40,
                height: 40,
                errorBuilder: (_, __, ___) =>
                    const Icon(Icons.school, color: _C.accent, size: 40),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                t.signInTitle,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: _C.text,
                ),
              ),
              const SizedBox(height: 24),

              // Google
              _ModalButton(
                label: t.signInWithGoogle,
                onTap: _isLoading ? null : _signInWithGoogle,
                style: _ModalButtonStyle.outlined,
              ),
              const SizedBox(height: 12),

              // Password toggle
              _ModalButton(
                label: t.signInWithPassword,
                onTap: _isLoading
                    ? null
                    : () {
                        setState(() {
                          _showPasswordForm = !_showPasswordForm;
                          _statusMessage = null;
                        });
                      },
                style: _ModalButtonStyle.outlined,
              ),

              // Password form
              if (_showPasswordForm) ...[
                const SizedBox(height: 20),
                TextField(
                  controller: _emailController,
                  enabled: !_isLoading,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: t.signInEmailHint,
                    prefixIcon: const Icon(
                      Icons.email_outlined,
                      size: 18,
                      color: _C.muted,
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF9FBFF),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0x1F506E96)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0x1F506E96)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  enabled: !_isLoading,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: t.signInPasswordHint,
                    prefixIcon: const Icon(
                      Icons.lock_outline,
                      size: 18,
                      color: _C.muted,
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        size: 18,
                        color: _C.muted,
                      ),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF9FBFF),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0x1F506E96)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0x1F506E96)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _signInWithPassword(),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _signInWithPassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _C.accent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Text(t.signInButton),
                  ),
                ),
              ],

              // Status badge
              if (_statusMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _C.accentYellow.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _statusMessage!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _isError ? AppColors.error : _C.text,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Footnote
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    t.signInNewUser,
                    style: const TextStyle(fontSize: 14, color: _C.muted),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                    },
                    child: Text(
                      t.signInApplyAccess,
                      style: const TextStyle(
                        fontSize: 14,
                        color: _C.muted,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _ModalButtonStyle { outlined, dark }

class _ModalButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final _ModalButtonStyle style;

  const _ModalButton({
    required this.label,
    required this.onTap,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = style == _ModalButtonStyle.dark;

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
          foregroundColor: isDark ? Colors.white : _C.text,
          side: isDark
              ? BorderSide.none
              : const BorderSide(color: Color(0x2E506E96)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        child: Text(label),
      ),
    );
  }
}
