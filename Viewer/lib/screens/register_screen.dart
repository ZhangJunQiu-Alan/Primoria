import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
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

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptedTerms = false;
  bool _isSubmitting = false;
  String _statusMessage = '';
  String _statusState = '';

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
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
    final confirm = _confirmPasswordController.text;
    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    final phoneRegex = RegExp(r'^\+?\d{7,15}$');

    if (account.isEmpty) return 'Please enter your email or phone.';
    if (!emailRegex.hasMatch(account) && !phoneRegex.hasMatch(account)) {
      return 'Please enter a valid email or phone number.';
    }
    if (password.isEmpty) return 'Please enter your password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (confirm.isEmpty) return 'Please confirm your password.';
    if (password != confirm) return 'Passwords do not match.';
    if (!_acceptedTerms) return 'Please accept the Terms & Privacy Policy.';
    return null;
  }

  Future<void> _submit() async {
    final error = _validate();
    if (error != null) {
      _setStatus(error, 'error');
      return;
    }

    setState(() => _isSubmitting = true);
    _setStatus('Creating your account...', 'info');

    final userProvider = context.read<UserProvider>();
    final name = _emailController.text.trim().split('@').first;
    final success = await userProvider.register(
      name,
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    if (success && userProvider.isLoggedIn) {
      _setStatus('Registration successful.', 'success');
      Navigator.of(context).pushReplacementNamed('/home');
    } else if (success) {
      _setStatus(userProvider.errorMessage, 'info');
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
        Expanded(flex: 48, child: _buildFormPanel(isMobile: false)),
        Expanded(
          flex: 52,
          child: _buildVisualPanel('assets/imgs/register.jpg'),
        ),
      ],
    );
  }

  Widget _buildMobileLayout() {
    return SingleChildScrollView(
      child: Column(
        children: [
          _buildFormPanel(isMobile: true),
          SizedBox(
            height: 280,
            width: double.infinity,
            child: _buildVisualPanel('assets/imgs/register.jpg'),
          ),
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
      alignment: Alignment.center,
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
                        'Create Your\nAccount',
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
                const SizedBox(height: 20),
                _buildLabel('Email'),
                _buildInput(
                  controller: _emailController,
                  hint: 'you@example.com or phone',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                _buildLabel('Password'),
                _buildInput(
                  controller: _passwordController,
                  hint: 'At least 6 characters',
                  obscure: _obscurePassword,
                  suffixText: _obscurePassword ? 'Show' : 'Hide',
                  onSuffixTap: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
                const SizedBox(height: 16),
                _buildLabel('Confirm Password'),
                _buildInput(
                  controller: _confirmPasswordController,
                  hint: 'Repeat your password',
                  obscure: _obscureConfirmPassword,
                  suffixText: _obscureConfirmPassword ? 'Show' : 'Hide',
                  onSuffixTap: () => setState(
                    () => _obscureConfirmPassword = !_obscureConfirmPassword,
                  ),
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
                              value: _acceptedTerms,
                              side: const BorderSide(
                                color: _C.meta,
                                width: 1.2,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              activeColor: Colors.white,
                              checkColor: _C.formTop,
                              onChanged: (value) => setState(
                                () => _acceptedTerms = value ?? false,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'I Agree to the Terms & Privacy Policy',
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
                      onTap: () {},
                      child: Text(
                        'Need Help?',
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
                    child: _buildRegisterButton(),
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
                const SizedBox(height: 16),
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
                      text: 'Already Have an account? ',
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
                            ).pushReplacementNamed('/login'),
                            child: Text(
                              'Sign In',
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
    );
  }

  Widget _buildRegisterButton() {
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
            : const Text('REGISTER'),
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
}
