import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../providers/user_provider.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';

// ─────────────────────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────────────────────
class _C {
  const _C._();

  // Brand panel (left, dark)
  static const panelA = Color(0xFF09122B);
  static const panelB = Color(0xFF1E1060);
  static const panelGlow = Color(0xFF3B2C9B);

  // Form panel (right, light)
  static const formBg = Color(0xFFFFFFFF);
  static const formFieldBg = Color(0xFFF5F7FA);
  static const formFieldBorder = Color(0xFFE2E8F0);
  static const formFocus = Color(0xFF0D7DEB);

  // Typography
  static const formTitle = Color(0xFF0A0E1A);
  static const formSub = Color(0xFF4A5168);
  static const formMuted = Color(0xFF8891AA);
  static const formText = Color(0xFF0A0E1A);
  static const formHint = Color(0xFF9CA3AF);

  // CTA button
  static const btnA = Color(0xFF0D7DEB);
  static const btnB = Color(0xFF14D7E8);

  // Social providers
  static const googleBg = Color(0xFFFFFFFF);
  static const googleBorder = Color(0xFFDADCE0);
  static const googleText = Color(0xFF3C4043);
  static const appleBg = Color(0xFF050505);
  static const wechatBg = Color(0xFF07C160);

  // Status banners
  static const errorBg = Color(0xFFFEF2F2);
  static const errorTxt = Color(0xFFDC2626);
  static const successBg = Color(0xFFF0FDF4);
  static const successTxt = Color(0xFF16A34A);
  static const infoBg = Color(0xFFEFF6FF);
  static const infoTxt = Color(0xFF2563EB);

  // Misc
  static const accent = Color(0xFF11B4FF);
  static const divider = Color(0xFFE5E7EB);
}

// ─────────────────────────────────────────────────────────────
// LoginScreen
// ─────────────────────────────────────────────────────────────
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _isSubmitting = false;
  String _statusMsg = '';
  String _statusState = ''; // 'error' | 'success' | 'info'

  late final AnimationController _introCtrl;
  late final Animation<double> _fadeIn;
  AppLocalizations get _t => context.read<LanguageProvider>().t;

  @override
  void initState() {
    super.initState();
    _introCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _fadeIn = CurvedAnimation(parent: _introCtrl, curve: Curves.easeOut);
    _loadRemembered();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _introCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadRemembered() async {
    final storage = await StorageService.getInstance();
    final remember = storage.getRememberMe();
    final email = storage.getRememberedEmail();
    if (remember && email.isNotEmpty && mounted) {
      setState(() {
        _rememberMe = true;
        _emailCtrl.text = email;
      });
    }
  }

  void _setStatus(String msg, String state) => setState(() {
    _statusMsg = msg;
    _statusState = state;
  });

  String? _validate() {
    final t = _t;
    final email = _emailCtrl.text.trim();
    final pw = _passwordCtrl.text;
    final emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    final phoneRe = RegExp(r'^\+?\d{7,15}$');
    if (email.isEmpty) return t.authValidationEmailOrPhoneRequired;
    if (!emailRe.hasMatch(email) && !phoneRe.hasMatch(email)) {
      return t.authValidationEmailOrPhoneInvalid;
    }
    if (pw.isEmpty) return t.authValidationPasswordRequired;
    if (pw.length < 6) return t.authValidationPasswordMin6;
    return null;
  }

  Future<void> _submit() async {
    final err = _validate();
    if (err != null) {
      _setStatus(err, 'error');
      return;
    }
    setState(() => _isSubmitting = true);
    _setStatus(_t.authStatusSigningIn, 'info');

    final userProvider = context.read<UserProvider>();
    final ok = await userProvider.login(
      _emailCtrl.text.trim(),
      _passwordCtrl.text,
    );
    if (!mounted) return;

    if (ok) {
      final storage = await StorageService.getInstance();
      await storage.saveRememberMe(_rememberMe, _emailCtrl.text.trim());
      if (!mounted) return;
      _setStatus(_t.authStatusWelcomeBack, 'success');
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      _setStatus(userProvider.errorMessage, 'error');
    }
    if (mounted) setState(() => _isSubmitting = false);
  }

  Future<void> _onSocialTap(String provider) async {
    switch (provider) {
      case 'google':
        _setStatus(_t.authStatusRedirectGoogle, 'info');
        final result = await SupabaseService.signInWithGoogle();
        if (!mounted) return;
        if (!result.success) _setStatus(result.message, 'error');
      case 'apple':
        _setStatus(_t.authStatusRedirectApple, 'info');
        final result = await SupabaseService.signInWithApple();
        if (!mounted) return;
        if (!result.success) _setStatus(result.message, 'error');
      case 'wechat':
        final result = await SupabaseService.signInWithWeChat();
        if (!mounted) return;
        _setStatus(result.message, result.success ? 'success' : 'info');
    }
  }

  void _showForgotPasswordDialog() {
    final resetCtrl = TextEditingController();
    final t = _t;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _C.formBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          t.authResetPasswordTitle,
          style: GoogleFonts.sora(
            fontWeight: FontWeight.w700,
            color: _C.formTitle,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t.authResetPasswordBody,
              style: GoogleFonts.manrope(
                fontSize: 14,
                color: _C.formSub,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            _buildFieldBox(
              controller: resetCtrl,
              hint: t.authPlaceholderEmail,
              icon: Icons.mail_outline_rounded,
              keyboardType: TextInputType.emailAddress,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              t.cancel,
              style: GoogleFonts.manrope(color: _C.formMuted),
            ),
          ),
          TextButton(
            onPressed: () async {
              final email = resetCtrl.text.trim();
              if (email.isEmpty) return;
              Navigator.of(ctx).pop();
              final userProvider = context.read<UserProvider>();
              final result = await userProvider.resetPassword(email);
              if (!mounted) return;
              _setStatus(
                result.success ? t.authResetPasswordSent : result.message,
                result.success ? 'success' : 'error',
              );
            },
            child: Text(
              t.authResetPasswordSend,
              style: GoogleFonts.manrope(
                fontWeight: FontWeight.w700,
                color: _C.btnA,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Build ───────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;
        return Scaffold(
          backgroundColor: isWide ? _C.panelA : _C.formBg,
          body: SafeArea(
            child: FadeTransition(
              opacity: _fadeIn,
              child: isWide ? _buildWide() : _buildNarrow(),
            ),
          ),
        );
      },
    );
  }

  Widget _buildWide() {
    return Row(
      children: [
        Expanded(flex: 5, child: _buildBrandPanel()),
        Expanded(flex: 5, child: _buildFormPanel(isWide: true)),
      ],
    );
  }

  Widget _buildNarrow() {
    return SingleChildScrollView(
      child: Column(
        children: [_buildMobileBrandBar(), _buildFormPanel(isWide: false)],
      ),
    );
  }

  // ─── Brand panel (left, desktop only) ────────────────────────

  Widget _buildBrandPanel() {
    final t = context.watch<LanguageProvider>().t;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.panelA, _C.panelB],
        ),
      ),
      child: Stack(
        children: [
          // Background decorative glows
          Positioned(
            top: -80,
            left: -60,
            child: _glowCircle(300, _C.panelGlow.withValues(alpha: 0.25)),
          ),
          Positioned(
            bottom: 60,
            right: -80,
            child: _glowCircle(260, _C.accent.withValues(alpha: 0.12)),
          ),
          Positioned(
            top: 180,
            right: 40,
            child: _glowCircle(140, _C.panelGlow.withValues(alpha: 0.18)),
          ),
          // Dot grid pattern
          Positioned.fill(child: IgnorePointer(child: _DotGridPainter())),
          // Content
          LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(44, 44, 44, 44),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Logo
                          _buildPanelLogo(),
                          const SizedBox(height: 52),
                          // Headline
                          Text(
                            t.authBrandHeadline,
                            style: GoogleFonts.sora(
                              fontSize: 44,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              height: 1.08,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            t.authBrandSubtitle,
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              color: Colors.white.withValues(alpha: 0.65),
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 36),
                          // Feature pills
                          _featurePill(
                            Icons.touch_app_rounded,
                            const Color(0xFF11D9A8),
                            t.authFeatureInteractiveLessons,
                          ),
                          const SizedBox(height: 10),
                          _featurePill(
                            Icons.smart_toy_rounded,
                            const Color(0xFF8B5CF6),
                            t.authFeatureAiTutor,
                          ),
                          const SizedBox(height: 10),
                          _featurePill(
                            Icons.emoji_events_rounded,
                            const Color(0xFFFFAB40),
                            t.authFeatureXpAchievements,
                          ),
                          const SizedBox(height: 10),
                          _featurePill(
                            Icons.group_rounded,
                            const Color(0xFF11B4FF),
                            t.authFeatureStudyBuddy,
                          ),
                          const SizedBox(height: 10),
                        ],
                      ),
                      // Testimonial card
                      _buildTestimonialCard(),
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

  Widget _glowCircle(double size, Color color) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: color,
      // Soft glow via boxShadow
      boxShadow: [BoxShadow(color: color, blurRadius: size * 0.6)],
    ),
  );

  Widget _buildPanelLogo() => Row(
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.asset(
          'assets/imgs/logo.png',
          width: 36,
          height: 36,
          fit: BoxFit.cover,
        ),
      ),
      const SizedBox(width: 10),
      Text(
        'PRIMORIA',
        style: GoogleFonts.sora(
          fontSize: 18,
          letterSpacing: 1.2,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    ],
  );

  Widget _featurePill(IconData icon, Color color, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.07),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 10),
        Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 14,
            color: Colors.white.withValues(alpha: 0.9),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    ),
  );

  Widget _buildTestimonialCard() => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(
            5,
            (_) => const Padding(
              padding: EdgeInsets.only(right: 2),
              child: Icon(
                Icons.star_rounded,
                color: Color(0xFFFFB347),
                size: 14,
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _t.authTestimonialQuote,
          style: GoogleFonts.manrope(
            fontSize: 13,
            color: Colors.white.withValues(alpha: 0.8),
            height: 1.55,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF11D9A8).withValues(alpha: 0.2),
              ),
              child: Center(
                child: Text(
                  'LW',
                  style: GoogleFonts.sora(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF11D9A8),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Lingyun W.',
                  style: GoogleFonts.sora(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                Text(
                  _t.authTestimonialRole,
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
  );

  // ─── Mobile brand bar ─────────────────────────────────────────
  Widget _buildMobileBrandBar() => Container(
    color: _C.panelA,
    padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
    child: Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(9),
          child: Image.asset(
            'assets/imgs/logo.png',
            width: 32,
            height: 32,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'PRIMORIA',
          style: GoogleFonts.sora(
            fontSize: 18,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const Spacer(),
        GestureDetector(
          onTap: () => Navigator.of(context).pushReplacementNamed('/'),
          child: Text(
            _t.authBackShort,
            style: GoogleFonts.manrope(
              fontSize: 13,
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
        ),
      ],
    ),
  );

  // ─── Form panel (right, white) ────────────────────────────────
  Widget _buildFormPanel({required bool isWide}) {
    final t = context.watch<LanguageProvider>().t;
    // Force light theme so system dark mode doesn't bleed into form inputs
    return Theme(
      data: ThemeData.light().copyWith(
        colorScheme: const ColorScheme.light(primary: _C.formFocus),
      ),
      child: Container(
        color: _C.formBg,
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: isWide ? 56 : 24,
            vertical: isWide ? 48 : 32,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isWide) ...[
                    GestureDetector(
                      onTap: () =>
                          Navigator.of(context).pushReplacementNamed('/'),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.arrow_back_ios_rounded,
                            size: 13,
                            color: _C.formMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            t.authBackToHome,
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              color: _C.formMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                  // Heading
                  Text(
                    t.authWelcomeBackTitle,
                    style: GoogleFonts.sora(
                      fontSize: isWide ? 32 : 28,
                      fontWeight: FontWeight.w800,
                      color: _C.formTitle,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t.authWelcomeBackSubtitle,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: _C.formSub,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Email
                  _buildLabel(t.authEmailLabel),
                  const SizedBox(height: 6),
                  _buildFieldBox(
                    controller: _emailCtrl,
                    focusNode: _emailFocus,
                    hint: t.authPlaceholderEmail,
                    icon: Icons.mail_outline_rounded,
                    keyboardType: TextInputType.emailAddress,
                    onChanged: (_) {
                      if (_statusState == 'error') _setStatus('', '');
                    },
                    onSubmitted: (_) => _passwordFocus.requestFocus(),
                  ),
                  const SizedBox(height: 16),

                  // Password
                  _buildLabel(t.authPasswordLabel),
                  const SizedBox(height: 6),
                  _buildFieldBox(
                    controller: _passwordCtrl,
                    focusNode: _passwordFocus,
                    hint: t.authPlaceholderPasswordMin6,
                    icon: Icons.lock_outline_rounded,
                    obscure: _obscurePassword,
                    trailing: _EyeToggle(
                      obscure: _obscurePassword,
                      onTap: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    onChanged: (_) {
                      if (_statusState == 'error') _setStatus('', '');
                    },
                    onSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 14),

                  // Remember + Forgot
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => setState(() => _rememberMe = !_rememberMe),
                        child: Row(
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(
                                  color: _rememberMe
                                      ? _C.formFocus
                                      : _C.formFieldBorder,
                                  width: 1.5,
                                ),
                                color: _rememberMe
                                    ? _C.formFocus
                                    : Colors.transparent,
                              ),
                              child: _rememberMe
                                  ? const Icon(
                                      Icons.check_rounded,
                                      size: 12,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 7),
                            Text(
                              t.authRememberMe,
                              style: GoogleFonts.manrope(
                                fontSize: 13,
                                color: _C.formSub,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: _showForgotPasswordDialog,
                        child: Text(
                          t.authForgotPassword,
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            color: _C.btnA,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),

                  // Status message
                  if (_statusMsg.isNotEmpty) ...[
                    _buildStatusBanner(),
                    const SizedBox(height: 14),
                  ],

                  // Sign In button
                  _buildPrimaryButton(
                    label: t.authSignInButton,
                    loading: _isSubmitting,
                    onTap: _submit,
                  ),
                  const SizedBox(height: 24),

                  // Divider
                  _buildDivider(t.authOrContinueWith),
                  const SizedBox(height: 20),

                  // Social buttons
                  _buildSocialButton(
                    onTap: () => _onSocialTap('google'),
                    logo: const _GoogleLogo(size: 20),
                    label: t.authContinueWithGoogle,
                    bg: _C.googleBg,
                    border: _C.googleBorder,
                    textColor: _C.googleText,
                  ),
                  const SizedBox(height: 10),
                  _buildSocialButton(
                    onTap: () => _onSocialTap('apple'),
                    logo: const _AppleLogo(size: 20),
                    label: t.authContinueWithApple,
                    bg: _C.appleBg,
                    border: _C.appleBg,
                    textColor: Colors.white,
                  ),
                  const SizedBox(height: 10),
                  _buildSocialButton(
                    onTap: () => _onSocialTap('wechat'),
                    logo: const _WeChatLogo(size: 22),
                    label: t.authContinueWithWeChat,
                    bg: _C.wechatBg,
                    border: _C.wechatBg,
                    textColor: Colors.white,
                  ),
                  const SizedBox(height: 28),

                  // Switch to register
                  Center(
                    child: Text.rich(
                      TextSpan(
                        text: t.authNoAccountPrompt,
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          color: _C.formSub,
                        ),
                        children: [
                          WidgetSpan(
                            alignment: PlaceholderAlignment.baseline,
                            baseline: TextBaseline.alphabetic,
                            child: GestureDetector(
                              onTap: () => Navigator.of(
                                context,
                              ).pushReplacementNamed('/register'),
                              child: Text(
                                t.authSignUpLink,
                                style: GoogleFonts.manrope(
                                  fontSize: 14,
                                  color: _C.btnA,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─── Shared form widgets ──────────────────────────────────────

  Widget _buildLabel(String text) => Text(
    text,
    style: GoogleFonts.manrope(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: _C.formSub,
    ),
  );

  Widget _buildFieldBox({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    FocusNode? focusNode,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? trailing,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
  }) {
    return _FocusableField(
      controller: controller,
      focusNode: focusNode,
      hint: hint,
      icon: icon,
      keyboardType: keyboardType,
      obscure: obscure,
      trailing: trailing,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
    );
  }

  Widget _buildStatusBanner() {
    Color bg;
    Color txt;
    IconData icon;
    switch (_statusState) {
      case 'error':
        bg = _C.errorBg;
        txt = _C.errorTxt;
        icon = Icons.error_outline_rounded;
      case 'success':
        bg = _C.successBg;
        txt = _C.successTxt;
        icon = Icons.check_circle_outline_rounded;
      default:
        bg = _C.infoBg;
        txt = _C.infoTxt;
        icon = Icons.info_outline_rounded;
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: txt),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _statusMsg,
              style: GoogleFonts.manrope(
                fontSize: 13,
                color: txt,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required bool loading,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: const LinearGradient(colors: [_C.btnA, _C.btnB]),
          boxShadow: [
            BoxShadow(
              color: _C.btnA.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: TextButton(
          onPressed: loading ? null : onTap,
          style: TextButton.styleFrom(
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: GoogleFonts.sora(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          child: loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(label),
        ),
      ),
    );
  }

  Widget _buildDivider(String text) => Row(
    children: [
      const Expanded(child: Divider(color: _C.divider, thickness: 1)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text(
          text,
          style: GoogleFonts.manrope(
            fontSize: 12,
            color: _C.formMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      const Expanded(child: Divider(color: _C.divider, thickness: 1)),
    ],
  );

  Widget _buildSocialButton({
    required VoidCallback onTap,
    required Widget logo,
    required String label,
    required Color bg,
    required Color border,
    required Color textColor,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: border, width: 1.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                logo,
                const SizedBox(width: 12),
                Text(
                  label,
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Focusable input field widget
// ─────────────────────────────────────────────────────────────────────────────
class _FocusableField extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool obscure;
  final Widget? trailing;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  const _FocusableField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.focusNode,
    this.keyboardType,
    this.obscure = false,
    this.trailing,
    this.onChanged,
    this.onSubmitted,
  });

  @override
  State<_FocusableField> createState() => _FocusableFieldState();
}

class _FocusableFieldState extends State<_FocusableField> {
  bool _focused = false;
  late final FocusNode _node;
  bool _ownNode = false;

  @override
  void initState() {
    super.initState();
    if (widget.focusNode != null) {
      _node = widget.focusNode!;
    } else {
      _node = FocusNode();
      _ownNode = true;
    }
    _node.addListener(_onFocusChange);
  }

  void _onFocusChange() => setState(() => _focused = _node.hasFocus);

  @override
  void dispose() {
    _node.removeListener(_onFocusChange);
    if (_ownNode) _node.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final border = _focused ? _C.formFocus : _C.formFieldBorder;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        color: _C.formFieldBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border, width: _focused ? 1.8 : 1.2),
        boxShadow: _focused
            ? [
                BoxShadow(
                  color: _C.formFocus.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: _node,
        keyboardType: widget.keyboardType,
        obscureText: widget.obscure,
        textInputAction: TextInputAction.next,
        onChanged: widget.onChanged,
        onSubmitted: widget.onSubmitted,
        style: GoogleFonts.manrope(
          fontSize: 15,
          color: _C.formText,
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: GoogleFonts.manrope(fontSize: 15, color: _C.formHint),
          prefixIcon: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Icon(
              widget.icon,
              size: 18,
              color: _focused ? _C.formFocus : _C.formMuted,
            ),
          ),
          prefixIconConstraints: const BoxConstraints(
            minWidth: 0,
            minHeight: 0,
          ),
          suffixIcon: widget.trailing != null
              ? Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: widget.trailing,
                )
              : null,
          suffixIconConstraints: const BoxConstraints(
            minWidth: 0,
            minHeight: 0,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Eye toggle (password show/hide)
// ─────────────────────────────────────────────────────────────────────────────
class _EyeToggle extends StatelessWidget {
  final bool obscure;
  final VoidCallback onTap;
  const _EyeToggle({required this.obscure, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Icon(
      obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
      size: 18,
      color: _C.formMuted,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dot grid background for brand panel
// ─────────────────────────────────────────────────────────────────────────────
class _DotGridPainter extends StatelessWidget {
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _DotGridPaint());
}

class _DotGridPaint extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0x0EFFFFFF)
      ..style = PaintingStyle.fill;
    const spacing = 28.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social logo widgets
// ─────────────────────────────────────────────────────────────────────────────

/// Google logo — official asset image
class _GoogleLogo extends StatelessWidget {
  final double size;
  const _GoogleLogo({required this.size});

  @override
  Widget build(BuildContext context) => Image.asset(
    'assets/imgs/google.png',
    width: size,
    height: size,
    errorBuilder: (_, __, ___) =>
        Icon(Icons.g_mobiledata, size: size, color: const Color(0xFF4285F4)),
  );
}

/// Apple logo — simplified apple silhouette
class _AppleLogo extends StatelessWidget {
  final double size;
  const _AppleLogo({required this.size});

  @override
  Widget build(BuildContext context) =>
      Icon(Icons.apple, size: size, color: Colors.white);
}

/// WeChat logo — official asset image
class _WeChatLogo extends StatelessWidget {
  final double size;
  const _WeChatLogo({required this.size});

  @override
  Widget build(BuildContext context) => ColorFiltered(
    colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
    child: Image.asset(
      'assets/imgs/wechat.png',
      width: size,
      height: size,
      errorBuilder: (_, __, ___) =>
          Icon(Icons.chat_bubble, size: size, color: Colors.white),
    ),
  );
}
