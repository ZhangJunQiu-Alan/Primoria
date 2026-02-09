import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen>
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

  void _showSignInOverlay(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: const Color(0xB80F1826), // rgba(15,24,38,0.72)
      builder: (ctx) => _SignInModal(
        onSuccess: () {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Signed in'),
                backgroundColor: AppColors.success,
              ),
            );
            context.go('/dashboard');
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _C.bg,
      body: Stack(
        children: [
          // ── Decorative blur blobs ──
          Positioned(
            top: -120,
            left: -120,
            child: _BlurBlob(
              color: _C.accent.withValues(alpha: 0.22),
            ),
          ),
          Positioned(
            bottom: -120,
            right: -120,
            child: _BlurBlob(
              color: _C.primary.withValues(alpha: 0.28),
            ),
          ),

          // ── Scrollable content ──
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
                      _buildHeader(),
                      _buildHero(context),
                      const SizedBox(height: 40),
                      _buildFeatureRow(),
                      const SizedBox(height: 40),
                      _buildCtaBand(context),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════
  //  Header – logo + brand
  // ═══════════════════════════════════════════════════
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      child: Row(
        children: [
          Image.asset(
            'assets/images/logo.png',
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
    );
  }

  // ═══════════════════════════════════════════════════
  //  Hero section – two-column on wide, stacked on narrow
  // ═══════════════════════════════════════════════════
  Widget _buildHero(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final wide = constraints.maxWidth > 900;
      final gutter = _gutter(constraints.maxWidth);

      final leftColumn = Padding(
        padding: EdgeInsets.only(left: gutter),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tag
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _C.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'Learn by teaching',
                style: TextStyle(
                  color: Color(0xFF1D6B00),
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Headline
            Text(
              'If you want to master\nsomething, teach it.',
              style: TextStyle(
                fontSize: wide ? 42 : 32,
                fontWeight: FontWeight.w700,
                height: 1.1,
                color: _C.text,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Build courses, share insights, and turn curiosity into a daily habit. '
              'Primoria blends Brilliant-style exploration with Duolingo-like momentum.',
              style: TextStyle(fontSize: 16, color: _C.muted, height: 1.5),
            ),
            const SizedBox(height: 24),
            // Quote card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: _C.accent.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(18),
                border: Border(
                  left: BorderSide(color: _C.accent, width: 4),
                ),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '"If you want to master something, teach it."',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: _C.text,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
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
                  label: 'Apply Now',
                  filled: true,
                  onTap: () {},
                ),
                _PillButton(
                  label: 'Already Qualified',
                  filled: false,
                  onTap: () => _showSignInOverlay(context),
                ),
              ],
            ),
          ],
        ),
      );

      final rightColumn = Padding(
        padding: EdgeInsets.only(right: gutter),
        child: _HeroCard(),
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
          children: [
            leftColumn,
            const SizedBox(height: 32),
            rightColumn,
          ],
        ),
      );
    });
  }

  // ═══════════════════════════════════════════════════
  //  Feature cards row
  // ═══════════════════════════════════════════════════
  Widget _buildFeatureRow() {
    return LayoutBuilder(builder: (context, constraints) {
      final gutter = _gutter(constraints.maxWidth);
      final wide = constraints.maxWidth > 900;

      final cards = [
        _FeatureCard(
          badge: 'Guided',
          title: 'Course builder that feels like play',
          subtitle: 'Drag blocks, remix templates, and publish at any pace.',
        ),
        _FeatureCard(
          badge: 'Social',
          title: 'Community feedback loops',
          subtitle: 'Turn comments into insights with smart highlights.',
        ),
        _FeatureCard(
          badge: 'Momentum',
          title: 'Daily quests and streaks',
          subtitle: 'Stay consistent with bite-sized missions.',
        ),
      ];

      if (wide) {
        return Padding(
          padding: EdgeInsets.symmetric(horizontal: gutter),
          child: Row(
            children: cards
                .map((c) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: c,
                      ),
                    ))
                .toList(),
          ),
        );
      }

      return Padding(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        child: Column(
          children: cards
              .map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: c,
                  ))
              .toList(),
        ),
      );
    });
  }

  // ═══════════════════════════════════════════════════
  //  CTA band
  // ═══════════════════════════════════════════════════
  Widget _buildCtaBand(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
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
                            'Ready to launch your next lesson?',
                            style: TextStyle(
                              fontSize: wide ? 28 : 22,
                              fontWeight: FontWeight.w700,
                              color: _C.text,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Bring your expertise and let Primoria handle the rest.',
                            style: TextStyle(color: _C.muted, fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    _PillButton(
                      label: 'Start Creating',
                      filled: true,
                      onTap: () => context.go('/builder'),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ready to launch your next lesson?',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: _C.text,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Bring your expertise and let Primoria handle the rest.',
                      style: TextStyle(color: _C.muted, fontSize: 15),
                    ),
                    const SizedBox(height: 20),
                    _PillButton(
                      label: 'Start Creating',
                      filled: true,
                      onTap: () => context.go('/builder'),
                    ),
                  ],
                ),
        ),
      );
    });
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
        return Transform.translate(
          offset: Offset(0, dy),
          child: child,
        );
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
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xE6FFFFFF), // rgba(255,255,255,0.9)
            Color(0xD9F0F8FF), // rgba(240,248,255,0.85)
          ],
        ),
        border: Border.all(
          color: const Color(0x1F506E96), // rgba(80,110,150,0.12)
        ),
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
          const Text(
            "Today's Teaching Sprint",
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: _C.text,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Create a bite-sized lesson and publish in minutes.',
            style: TextStyle(fontSize: 14, color: _C.muted),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(builder: (context, constraints) {
            final crossCount = constraints.maxWidth > 300 ? 2 : 1;
            return GridView.count(
              crossAxisCount: crossCount,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 2.2,
              children: const [
                _StatTile(value: '48 min', label: 'Avg build time'),
                _StatTile(value: '92%', label: 'Learner completion'),
                _StatTile(value: '132', label: 'New learners'),
                _StatTile(value: '4x', label: 'Boosted income'),
              ],
            );
          }),
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
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: _C.muted),
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
        border: Border.all(
          color: const Color(0x14506E96), // rgba(80,110,150,0.08)
        ),
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

/// Pill-shaped button matching .btn / .btn-primary / .btn-secondary
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
        side: BorderSide(color: const Color(0x2E506E96)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
      child: Text(label),
    );
  }
}

// ═══════════════════════════════════════════════════════
//  Sign-in modal overlay – matches Design/signin_design.png
// ═══════════════════════════════════════════════════════

class _SignInModal extends StatefulWidget {
  final VoidCallback? onSuccess;
  const _SignInModal({this.onSuccess});

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
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });
    final result = await SupabaseService.signInWithGoogle();
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else if (result.isUserNotFound) {
      _setStatus(
        "We couldn't find an account linked to that Google profile. "
        'Please apply for access first.',
        error: true,
      );
    } else {
      _setStatus(result.message, error: true);
    }
  }

  Future<void> _signInWithGitHub() async {
    setState(() {
      _isLoading = true;
      _statusMessage = null;
    });
    final result = await SupabaseService.signInWithGitHub();
    if (!mounted) return;
    setState(() => _isLoading = false);
    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else if (result.isUserNotFound) {
      _setStatus(
        "We couldn't find an account linked to that profile. "
        'Please apply for access first.',
        error: true,
      );
    } else {
      _setStatus(result.message, error: true);
    }
  }

  Future<void> _signInWithPassword() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      _setStatus('Please enter your email and password.', error: true);
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
      _setStatus(
        "We couldn't find an account with that email. "
        'Please check your spelling or apply for access.',
        error: true,
      );
    } else {
      _setStatus(result.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
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
            border: Border.all(
              color: const Color(0x29506E96), // rgba(80,110,150,0.16)
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x400A1428), // rgba(10,20,40,0.25)
                blurRadius: 60,
                offset: Offset(0, 28),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Close button – top right
              Align(
                alignment: Alignment.topRight,
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _C.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'Close',
                      style: TextStyle(
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
                'assets/images/logo.png',
                width: 40,
                height: 40,
                errorBuilder: (_, __, ___) =>
                    const Icon(Icons.school, color: _C.accent, size: 40),
              ),
              const SizedBox(height: 16),

              // Title
              const Text(
                'Sign in',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: _C.text,
                ),
              ),
              const SizedBox(height: 24),

              // ── Social buttons ──
              // Google
              _ModalButton(
                label: 'Sign in with Google',
                onTap: _isLoading ? null : _signInWithGoogle,
                style: _ModalButtonStyle.outlined,
              ),
              const SizedBox(height: 12),

              // Apple
              _ModalButton(
                label: 'Continue with Apple',
                onTap: _isLoading ? null : _signInWithGitHub, // GitHub as Apple placeholder
                style: _ModalButtonStyle.dark,
              ),
              const SizedBox(height: 12),

              // Password toggle
              _ModalButton(
                label: 'Sign in with password',
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

              // ── Password form (expandable) ──
              if (_showPasswordForm) ...[
                const SizedBox(height: 20),
                TextField(
                  controller: _emailController,
                  enabled: !_isLoading,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: 'Email',
                    prefixIcon:
                        const Icon(Icons.email_outlined, size: 18, color: _C.muted),
                    filled: true,
                    fillColor: const Color(0xFFF9FBFF),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: Color(0x1F506E96)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: Color(0x1F506E96)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  enabled: !_isLoading,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'Password',
                    prefixIcon:
                        const Icon(Icons.lock_outline, size: 18, color: _C.muted),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        size: 18,
                        color: _C.muted,
                      ),
                      onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword),
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF9FBFF),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: Color(0x1F506E96)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide:
                          const BorderSide(color: Color(0x1F506E96)),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
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
                          fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const Text('Sign in'),
                  ),
                ),
              ],

              // ── Status badge ──
              if (_statusMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                  const Text(
                    'New user? ',
                    style: TextStyle(fontSize: 14, color: _C.muted),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                      // Scroll to CTA or do nothing
                    },
                    child: const Text(
                      'Apply for access',
                      style: TextStyle(
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
