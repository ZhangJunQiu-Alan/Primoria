import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';

class _C {
  const _C._();

  static const pageBg = Color(0xFF133151);
  static const shell = Color(0xFF102A46);

  static const formTop = Color(0xFF202C4C);
  static const formBottom = Color(0xFFC65957);

  static const heading = Color(0xFFF4F0F0);
  static const label = Color(0xFFECE8E9);
  static const input = Color(0xFF111217);
  static const hint = Color(0xFF7A7D86);
  static const line = Color(0x66FFFFFF);
  static const meta = Color(0xC9F0ECED);
  static const toggle = Color(0xFF32343A);

  static const button = Color(0xFF2E3138);
  static const buttonText = Color(0xFFFDFDFE);
  static const socialBg = Color(0xFFF4F5F7);

  static const error = Color(0xFFFFC0B8);
  static const success = Color(0xFFCCF4CF);
  static const info = Color(0xFFF3DFDF);
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _isSubmitting = false;
  String _statusMessage = '';
  String _statusState = '';

  @override
  void initState() {
    super.initState();
    _loadRemembered();
  }

  Future<void> _loadRemembered() async {
    final storage = await StorageService.getInstance();
    final remember = storage.getRememberMe();
    final email = storage.getRememberedEmail();
    if (remember && email.isNotEmpty && mounted) {
      setState(() {
        _rememberMe = true;
        _emailController.text = email;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _setStatus(String message, String state) {
    setState(() {
      _statusMessage = message;
      _statusState = state;
    });
  }

  Color _statusColor() {
    switch (_statusState) {
      case 'error':
        return _C.error;
      case 'success':
        return _C.success;
      default:
        return _C.info;
    }
  }

  String? _validate() {
    final account = _emailController.text.trim();
    final password = _passwordController.text;
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    final phoneRegex = RegExp(r'^\+?\d{7,15}$');

    if (account.isEmpty) return 'Please enter your email or phone.';
    if (!emailRegex.hasMatch(account) && !phoneRegex.hasMatch(account)) {
      return 'Please enter a valid email or phone number.';
    }
    if (password.isEmpty) return 'Please enter your password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }

  Future<void> _submit() async {
    final error = _validate();
    if (error != null) {
      _setStatus(error, 'error');
      return;
    }

    setState(() => _isSubmitting = true);
    _setStatus('Logging in...', 'info');

    final userProvider = context.read<UserProvider>();
    final success = await userProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    if (success) {
      final storage = await StorageService.getInstance();
      await storage.saveRememberMe(_rememberMe, _emailController.text.trim());
      if (!mounted) return;
      _setStatus('Login successful.', 'success');
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      _setStatus(userProvider.errorMessage, 'error');
    }

    if (mounted) setState(() => _isSubmitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 980;
    final desktopHeight = (size.height - 24).clamp(700.0, 920.0).toDouble();

    return Scaffold(
      backgroundColor: _C.pageBg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(isMobile ? 0 : 12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1420),
              child: Container(
                height: isMobile ? null : desktopHeight,
                decoration: BoxDecoration(
                  color: _C.shell,
                  borderRadius: BorderRadius.circular(isMobile ? 0 : 8),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x2A000000),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: isMobile ? _buildMobileLayout() : _buildDesktopLayout(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      children: [
        Expanded(flex: 53, child: _buildVisualPanel('assets/imgs/login.jpg')),
        Expanded(flex: 47, child: _buildFormPanel(isMobile: false)),
      ],
    );
  }

  Widget _buildMobileLayout() {
    return SingleChildScrollView(
      child: Column(
        children: [
          SizedBox(
            height: 280,
            width: double.infinity,
            child: _buildVisualPanel('assets/imgs/login.jpg'),
          ),
          _buildFormPanel(isMobile: true),
        ],
      ),
    );
  }

  Widget _buildVisualPanel(String asset) {
    return Image.asset(
      asset,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      alignment: Alignment.centerLeft,
      errorBuilder: (_, __, ___) =>
          const SizedBox.expand(child: ColoredBox(color: _C.shell)),
    );
  }

  Widget _buildFormPanel({required bool isMobile}) {
    final titleSize = isMobile ? 40.0 : 52.0;
    final horizontalPad = isMobile ? 24.0 : 38.0;

    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_C.formTop, _C.formBottom],
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final content = Padding(
            padding: EdgeInsets.fromLTRB(
              horizontalPad,
              isMobile ? 22 : 30,
              horizontalPad,
              isMobile ? 24 : 20,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildBrandTile(isMobile ? 82 : 104),
                    SizedBox(width: isMobile ? 16 : 20),
                    Expanded(
                      child: Text(
                        'Welcome to\nPrimoria',
                        style: GoogleFonts.sora(
                          fontSize: titleSize,
                          fontWeight: FontWeight.w700,
                          height: 0.98,
                          color: _C.heading,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                _buildLabel('Email'),
                _buildInput(
                  controller: _emailController,
                  hint: 'you@example.com or phone',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 18),
                _buildLabel('Password'),
                _buildInput(
                  controller: _passwordController,
                  hint: 'At least 6 characters',
                  obscure: _obscurePassword,
                  suffixText: _obscurePassword ? 'Show' : 'Hide',
                  onSuffixTap: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: Checkbox(
                              value: _rememberMe,
                              side: const BorderSide(
                                color: _C.meta,
                                width: 1.2,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              activeColor: Colors.white,
                              checkColor: _C.formTop,
                              onChanged: (value) =>
                                  setState(() => _rememberMe = value ?? false),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'Remember Me',
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                color: _C.meta,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: _showForgotPasswordDialog,
                      child: Text(
                        'Forgot Password?',
                        style: GoogleFonts.manrope(
                          fontSize: 13.5,
                          color: _C.meta,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                Center(
                  child: SizedBox(
                    width: isMobile ? double.infinity : 250,
                    height: 56,
                    child: _buildLoginButton(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 20,
                  child: Center(
                    child: Text(
                      _statusMessage,
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: _statusColor(),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    const Expanded(
                      child: Divider(color: _C.line, thickness: 1),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: Text(
                        'Login Via',
                        style: GoogleFonts.manrope(
                          color: _C.meta,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Expanded(
                      child: Divider(color: _C.line, thickness: 1),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildSocialButton('assets/imgs/google.png', 34, 'google'),
                    const SizedBox(width: 16),
                    _buildSocialButton('assets/imgs/wechat.png', 38, 'wechat'),
                    const SizedBox(width: 16),
                    _buildSocialButton('assets/imgs/ins.png', 38, 'ins'),
                    const SizedBox(width: 16),
                    _buildSocialButton(
                      'assets/imgs/whatsapp.png',
                      38,
                      'whatsapp',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Center(
                  child: Text.rich(
                    TextSpan(
                      text: "Don’t Have an account? ",
                      style: GoogleFonts.manrope(
                        fontSize: 14.5,
                        color: _C.meta,
                        fontWeight: FontWeight.w700,
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
                              'Sign Up',
                              style: GoogleFonts.manrope(
                                fontSize: 14.5,
                                color: _C.heading,
                                fontWeight: FontWeight.w800,
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
          );

          if (isMobile) return content;

          return SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: content,
            ),
          );
        },
      ),
    );
  }

  Widget _buildBrandTile(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE66558), Color(0xFF8E42F5)],
        ),
      ),
      child: Center(
        child: Text(
          'V',
          style: GoogleFonts.sora(
            fontSize: size * 0.55,
            color: Colors.white,
            fontWeight: FontWeight.w700,
            height: 1,
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.sora(
        color: _C.label,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    TextInputType? keyboardType,
    bool obscure = false,
    String? suffixText,
    VoidCallback? onSuffixTap,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      textInputAction: TextInputAction.next,
      onChanged: (_) {
        if (_statusState == 'error') _setStatus('', '');
      },
      style: GoogleFonts.manrope(
        color: _C.input,
        fontSize: 15.5,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.manrope(
          color: _C.hint,
          fontSize: 15.5,
          fontWeight: FontWeight.w700,
        ),
        contentPadding: const EdgeInsets.only(bottom: 10),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.line),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.white),
        ),
        suffixIcon: suffixText == null
            ? null
            : GestureDetector(
                onTap: onSuffixTap,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    suffixText,
                    style: GoogleFonts.manrope(
                      color: _C.toggle,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
        suffixIconConstraints: const BoxConstraints(minHeight: 0, minWidth: 0),
      ),
      onSubmitted: (_) => _submit(),
    );
  }

  Widget _buildLoginButton() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: _C.button,
        borderRadius: BorderRadius.circular(14),
      ),
      child: TextButton(
        onPressed: _isSubmitting ? null : _submit,
        style: TextButton.styleFrom(
          foregroundColor: _C.buttonText,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.sora(
            fontSize: 15.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text('LOGIN'),
      ),
    );
  }

  Widget _buildSocialButton(String asset, double iconSize, String key) {
    return GestureDetector(
      onTap: () => _onSocialTap(key),
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: _C.socialBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Image.asset(
            asset,
            width: iconSize,
            height: iconSize,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) =>
                const Icon(Icons.link, color: Colors.black54),
          ),
        ),
      ),
    );
  }

  Future<void> _onSocialTap(String key) async {
    if (key == 'google') {
      _setStatus('Redirecting to Google...', 'info');
      final result = await SupabaseService.signInWithGoogle();
      if (!mounted) return;
      if (!result.success) {
        _setStatus(result.message, 'error');
      }
    }
  }

  void _showForgotPasswordDialog() {
    final resetEmailController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Reset Password', style: GoogleFonts.manrope()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Enter your email and we will send a password reset link.',
              style: GoogleFonts.manrope(fontSize: 14),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: resetEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'you@example.com',
                hintStyle: GoogleFonts.manrope(color: Colors.black45),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Cancel', style: GoogleFonts.manrope()),
          ),
          TextButton(
            onPressed: () async {
              final email = resetEmailController.text.trim();
              if (email.isEmpty) return;
              Navigator.of(ctx).pop();
              final userProvider = context.read<UserProvider>();
              final result = await userProvider.resetPassword(email);
              if (!mounted) return;
              if (result.success) {
                _setStatus('Reset link sent! Check your email.', 'success');
              } else {
                _setStatus(result.message, 'error');
              }
            },
            child: Text(
              'Send',
              style: GoogleFonts.manrope(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
