import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/language_provider.dart';
import '../../services/supabase_service.dart';
import '../../theme/design_tokens.dart';

// ─── Color tokens ───────────────────────────────────────────────
class _LC {
  _LC._();
  static const leftBg1 = Color(0xFF1A3A2A);
  static const leftBg2 = Color(0xFF0D1F16);
  static const googleBorder = Color(0xFFDADCE0);
  static const googleText = Color(0xFF3C4043);
  static const appleBg = Color(0xFF000000);
  static const wechatBg = Color(0xFF07C160);
  static const dividerColor = Color(0xFFE5E7EB);
  static const formBorder = Color(0xFFD1D5DB);
  static const formFill = Color(0xFFF9FAFB);
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  bool _showEmailForm = true;
  String? _loadingProvider; // 'google'|'apple'|'wechat'|'email'|null
  String? _error;
  String? _success;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _clearStatus() {
    _error = null;
    _success = null;
  }

  Future<void> _signInWithGoogle(BuilderLocalizations t) async {
    setState(() {
      _loadingProvider = 'google';
      _clearStatus();
    });
    final result = await SupabaseService.signInWithGoogle();
    if (!mounted) return;
    setState(() => _loadingProvider = null);
    if (!result.success) {
      setState(() => _error = result.message);
    }
    // success: router redirect handles navigation
  }

  Future<void> _signInWithApple(BuilderLocalizations t) async {
    setState(() {
      _loadingProvider = 'apple';
      _clearStatus();
    });
    final result = await SupabaseService.signInWithApple();
    if (!mounted) return;
    setState(() => _loadingProvider = null);
    if (!result.success) {
      setState(() => _error = result.message);
    }
  }

  Future<void> _signInWithWeChat(BuilderLocalizations t) async {
    setState(() {
      _loadingProvider = 'wechat';
      _clearStatus();
    });
    final result = await SupabaseService.signInWithWeChat();
    if (!mounted) return;
    setState(() {
      _loadingProvider = null;
      if (result.success) {
        _success = result.message;
      } else {
        _error = result.message.isEmpty
            ? t.loginWeChatComingSoon
            : result.message;
      }
    });
  }

  Future<void> _signUpWithEmail(BuilderLocalizations t) async {
    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text;
    final confirmPassword = _confirmCtrl.text;
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

    if (name.isEmpty) {
      setState(() => _error = t.isZh ? '请输入你的姓名。' : 'Please enter your name.');
      return;
    }
    if (email.isEmpty || password.isEmpty || confirmPassword.isEmpty) {
      setState(
        () => _error = t.isZh
            ? '请完整填写所有字段。'
            : 'Please fill in all required fields.',
      );
      return;
    }
    if (!emailRegex.hasMatch(email)) {
      setState(
        () => _error = t.isZh
            ? '请输入有效的邮箱地址。'
            : 'Please enter a valid email address.',
      );
      return;
    }
    if (password.length < 6) {
      setState(
        () => _error = t.isZh
            ? '密码至少需要 6 位。'
            : 'Password must be at least 6 characters.',
      );
      return;
    }
    if (password != confirmPassword) {
      setState(
        () => _error = t.isZh ? '两次输入的密码不一致。' : 'Passwords do not match.',
      );
      return;
    }

    setState(() {
      _loadingProvider = 'email';
      _clearStatus();
    });

    final result = await SupabaseService.signUp(
      email: email,
      password: password,
      displayName: name,
    );

    if (!mounted) return;

    setState(() => _loadingProvider = null);

    if (!result.success) {
      setState(() => _error = result.message);
      return;
    }

    if (SupabaseService.isLoggedIn) {
      context.go('/dashboard');
      return;
    }

    setState(
      () => _success = t.isZh
          ? '账号创建成功。请先验证邮箱，然后登录。'
          : 'Account created. Please verify your email, then sign in.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 700;

    if (isWide) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Row(
          children: [
            // Left branding panel
            SizedBox(
              width: screenWidth * 0.38,
              child: _LeftPanel(t: t),
            ),
            // Right form panel
            Expanded(child: _buildFormPanel(context, t)),
          ],
        ),
      );
    }

    // Narrow layout
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          _NarrowHeader(t: t),
          Expanded(child: _buildFormPanel(context, t)),
        ],
      ),
    );
  }

  Widget _buildFormPanel(BuildContext context, BuilderLocalizations t) {
    return SingleChildScrollView(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title
                Text(
                  t.isZh ? '创建账号' : 'Create your account',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  t.isZh
                      ? '注册 Primoria 账号，开始构建课程'
                      : 'Sign up for Primoria and start building courses',
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 32),

                // Social buttons
                _SocialButton(
                  provider: 'google',
                  label: t.loginWithGoogle,
                  logoAsset: 'assets/imgs/google.png',
                  bgColor: Colors.white,
                  borderColor: _LC.googleBorder,
                  textColor: _LC.googleText,
                  loadingProvider: _loadingProvider,
                  onTap: () => _signInWithGoogle(t),
                ),
                const SizedBox(height: 12),
                _SocialButton(
                  provider: 'apple',
                  label: t.loginWithApple,
                  leadingIcon: Icons.apple,
                  bgColor: _LC.appleBg,
                  textColor: Colors.white,
                  loadingProvider: _loadingProvider,
                  onTap: () => _signInWithApple(t),
                ),
                const SizedBox(height: 12),
                _SocialButton(
                  provider: 'wechat',
                  label: t.loginWithWeChat,
                  logoAsset: 'assets/imgs/wechat.png',
                  logoTintColor: Colors.white,
                  bgColor: _LC.wechatBg,
                  textColor: Colors.white,
                  loadingProvider: _loadingProvider,
                  onTap: () => _signInWithWeChat(t),
                ),

                // Divider
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: _OrDivider(t: t),
                ),

                // Email toggle button
                _SocialButton(
                  provider: 'emailToggle',
                  label: t.isZh ? '使用邮箱创建账号' : 'Create with email',
                  leadingIcon: Icons.email_outlined,
                  bgColor: const Color(0xFFF3F4F6),
                  textColor: const Color(0xFF111827),
                  loadingProvider: _loadingProvider,
                  onTap: () {
                    setState(() {
                      _showEmailForm = !_showEmailForm;
                      _clearStatus();
                    });
                  },
                ),

                // Email form (animated expand)
                AnimatedSize(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeInOut,
                  child: AnimatedOpacity(
                    opacity: _showEmailForm ? 1.0 : 0.0,
                    duration: const Duration(milliseconds: 200),
                    child: _showEmailForm
                        ? _buildEmailForm(t)
                        : const SizedBox.shrink(),
                  ),
                ),

                // Status display
                if (_error != null || _success != null) ...[
                  const SizedBox(height: 16),
                  _StatusBanner(
                    message: _error ?? _success!,
                    isError: _error != null,
                  ),
                ],

                const SizedBox(height: 24),

                // Footnote
                Center(
                  child: TextButton(
                    onPressed: () => context.go('/login'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF6B7280),
                    ),
                    child: Text(
                      t.isZh ? '已有账号？去登录' : 'Already have an account? Sign in',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmailForm(BuilderLocalizations t) {
    final isLoading = _loadingProvider == 'email';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 20),
        _FormField(
          controller: _nameCtrl,
          label: t.isZh ? '姓名' : 'Name',
          autofillHints: const [AutofillHints.name],
          enabled: !isLoading,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 12),
        _FormField(
          controller: _emailCtrl,
          label: t.loginEmailLabel,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          enabled: !isLoading,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 12),
        _FormField(
          controller: _passwordCtrl,
          label: t.loginPasswordLabel,
          obscureText: _obscurePassword,
          autofillHints: const [AutofillHints.newPassword],
          enabled: !isLoading,
          textInputAction: TextInputAction.next,
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off : Icons.visibility,
              size: 18,
              color: const Color(0xFF9CA3AF),
            ),
            onPressed: () =>
                setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        const SizedBox(height: 12),
        _FormField(
          controller: _confirmCtrl,
          label: t.isZh ? '确认密码' : 'Confirm password',
          obscureText: _obscureConfirm,
          autofillHints: const [AutofillHints.newPassword],
          enabled: !isLoading,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _signUpWithEmail(t),
          suffixIcon: IconButton(
            icon: Icon(
              _obscureConfirm ? Icons.visibility_off : Icons.visibility,
              size: 18,
              color: const Color(0xFF9CA3AF),
            ),
            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: isLoading ? null : () => _signUpWithEmail(t),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary500,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              textStyle: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(Colors.white),
                    ),
                  )
                : Text(t.isZh ? '创建账号' : 'Create account'),
          ),
        ),
      ],
    );
  }
}

// ─── Left branding panel ─────────────────────────────────────────

class _LeftPanel extends StatelessWidget {
  final BuilderLocalizations t;
  const _LeftPanel({required this.t});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_LC.leftBg1, _LC.leftBg2],
        ),
      ),
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          Row(
            children: [
              Image.asset(
                'assets/imgs/logo.png',
                width: 32,
                height: 32,
                errorBuilder: (_, __, ___) =>
                    const Icon(Icons.school, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 10),
              const Text(
                'Primoria',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),

          const Spacer(flex: 2),

          // Tagline
          Text(
            t.loginTagline,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w700,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 32),

          // Features
          _FeatureLine(t.loginFeature1),
          const SizedBox(height: 12),
          _FeatureLine(t.loginFeature2),
          const SizedBox(height: 12),
          _FeatureLine(t.loginFeature3),

          const Spacer(flex: 3),

          // Copyright
          Text(
            '© 2025 Primoria',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.45),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureLine extends StatelessWidget {
  final String text;
  const _FeatureLine(this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check, color: Colors.white, size: 13),
        ),
        const SizedBox(width: 12),
        Text(
          text,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.85),
            fontSize: 15,
          ),
        ),
      ],
    );
  }
}

// ─── Narrow header ───────────────────────────────────────────────

class _NarrowHeader extends ConsumerWidget {
  final BuilderLocalizations t;
  const _NarrowHeader({required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      height: 56,
      color: _LC.leftBg1,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Image.asset(
            'assets/imgs/logo.png',
            width: 28,
            height: 28,
            errorBuilder: (_, __, ___) =>
                const Icon(Icons.school, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 8),
          const Text(
            'Primoria',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Spacer(),
          // Language toggle
          _LanguageToggle(t: t),
        ],
      ),
    );
  }
}

class _LanguageToggle extends ConsumerWidget {
  final BuilderLocalizations t;
  const _LanguageToggle({required this.t});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isZh = t.isZh;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _LangChip(
          label: 'EN',
          active: !isZh,
          onTap: () => ref.read(languageProvider.notifier).setLanguage('en'),
        ),
        const SizedBox(width: 4),
        _LangChip(
          label: 'ZH',
          active: isZh,
          onTap: () => ref.read(languageProvider.notifier).setLanguage('zh'),
        ),
      ],
    );
  }
}

class _LangChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _LangChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: active ? 1.0 : 0.6),
            fontSize: 13,
            fontWeight: active ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

// ─── Social login button ─────────────────────────────────────────

class _SocialButton extends StatefulWidget {
  final String provider;
  final String label;
  final String? logoAsset;
  final Color? logoTintColor;
  final IconData? leadingIcon;
  final Color bgColor;
  final Color? borderColor;
  final Color textColor;
  final String? loadingProvider;
  final VoidCallback onTap;

  const _SocialButton({
    required this.provider,
    required this.label,
    this.logoAsset,
    this.logoTintColor,
    this.leadingIcon,
    required this.bgColor,
    this.borderColor,
    required this.textColor,
    required this.loadingProvider,
    required this.onTap,
  });

  @override
  State<_SocialButton> createState() => _SocialButtonState();
}

class _SocialButtonState extends State<_SocialButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final isThisLoading = widget.loadingProvider == widget.provider;
    final anyLoading =
        widget.loadingProvider != null &&
        widget.loadingProvider != 'emailToggle';
    final disabled = anyLoading && !isThisLoading;

    Widget leading;
    if (isThisLoading) {
      leading = SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation(widget.textColor),
        ),
      );
    } else if (widget.leadingIcon != null) {
      leading = Icon(widget.leadingIcon, size: 20, color: widget.textColor);
    } else if (widget.logoAsset != null) {
      leading = Image.asset(
        widget.logoAsset!,
        width: 20,
        height: 20,
        color: widget.logoTintColor,
        colorBlendMode: widget.logoTintColor != null ? BlendMode.srcIn : null,
        errorBuilder: (_, __, ___) =>
            Icon(Icons.login, size: 20, color: widget.textColor),
      );
    } else {
      leading = const SizedBox(width: 20);
    }

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedScale(
        scale: _hovered && !disabled ? 1.02 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: GestureDetector(
          onTap: disabled ? null : widget.onTap,
          child: Opacity(
            opacity: disabled ? 0.5 : 1.0,
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: widget.bgColor,
                borderRadius: BorderRadius.circular(12),
                border: widget.borderColor != null
                    ? Border.all(color: widget.borderColor!, width: 1)
                    : null,
                boxShadow: widget.borderColor != null
                    ? null
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  leading,
                  const SizedBox(width: 8),
                  Text(
                    widget.label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: widget.textColor,
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
}

// ─── Or divider ──────────────────────────────────────────────────

class _OrDivider extends StatelessWidget {
  final BuilderLocalizations t;

  const _OrDivider({required this.t});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: _LC.dividerColor)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            t.isZh ? '或' : 'or',
            style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
          ),
        ),
        const Expanded(child: Divider(color: _LC.dividerColor)),
      ],
    );
  }
}

// ─── Form field ──────────────────────────────────────────────────

class _FormField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final bool enabled;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final Widget? suffixIcon;

  const _FormField({
    required this.controller,
    required this.label,
    this.obscureText = false,
    this.keyboardType,
    this.autofillHints,
    this.enabled = true,
    this.textInputAction,
    this.onSubmitted,
    this.suffixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      enabled: enabled,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      style: const TextStyle(fontSize: 15, color: Color(0xFF111827)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
        filled: true,
        fillColor: _LC.formFill,
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _LC.formBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _LC.formBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppColors.primary500, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),
    );
  }
}

// ─── Status banner ───────────────────────────────────────────────

class _StatusBanner extends StatelessWidget {
  final String message;
  final bool isError;
  const _StatusBanner({required this.message, required this.isError});

  @override
  Widget build(BuildContext context) {
    final bg = isError ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4);
    final textColor = isError
        ? const Color(0xFFDC2626)
        : const Color(0xFF16A34A);
    final borderColor = isError
        ? const Color(0xFFFECACA)
        : const Color(0xFFBBF7D0);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        message,
        style: TextStyle(
          fontSize: 14,
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
