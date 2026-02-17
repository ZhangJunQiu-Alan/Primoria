import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../services/supabase_service.dart';

/// Register page color constants (matching CSS template)
class _C {
  static const Color pageBg = Color(0xFF174A6B);
  static const Color cardBg = Color(0xFFF3F4F6);
  static const Color titleColor = Color(0xFF5A6678);
  static const Color mutedColor = Color(0xFFA2ACB8);
  static const Color lineColor = Color(0xFFDCE3EB);
  static const Color buttonBg = Color(0xFF42516A);
  static const Color errorColor = Color(0xFFD9534F);
  static const Color successColor = Color(0xFF2F8D59);
  static const Color inputText = Color(0xFF455366);
  static const Color inputFocusBorder = Color(0xFF99B3CE);
  static const Color subtitleColor = Color(0xFF8593A5);
  static const Color metaColor = Color(0xFF778599);
  static const Color toggleColor = Color(0xFF5F7088);
  static const Color socialBorder = Color(0xFFD8DFE8);
  static const Color signupLink = Color(0xFF74849A);
  static const Color dividerText = Color(0xFF7B8796);
  static const Color statusInfo = Color(0xFF8692A0);
  static const Color visualBg = Color(0xFF102B45);
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
  String _statusMessage = '';
  String _statusState = '';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? get _fontFamily => GoogleFonts.notoSansSc().fontFamily;

  void _setStatus(String message, String state) {
    setState(() {
      _statusMessage = message;
      _statusState = state;
    });
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
      // Signed up but email confirmation required
      _setStatus(userProvider.errorMessage, 'info');
    } else {
      _setStatus(userProvider.errorMessage, 'error');
    }

    setState(() => _isSubmitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth <= 900;

    return Scaffold(
      backgroundColor: _C.pageBg,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Container(
            constraints: BoxConstraints(
              maxWidth: 1360,
              maxHeight: isMobile ? double.infinity : 820,
            ),
            decoration: BoxDecoration(
              color: _C.cardBg,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x2E000000),
                  blurRadius: 30,
                  offset: Offset(0, 14),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: isMobile ? _buildMobileLayout() : _buildDesktopLayout(),
          ),
        ),
      ),
    );
  }

  Widget _buildDesktopLayout() {
    // Mirrored: form left (48%), image right (52%)
    return Row(
      children: [
        Expanded(flex: 48, child: _buildFormPanel()),
        Expanded(flex: 52, child: _buildVisualPanel()),
      ],
    );
  }

  Widget _buildMobileLayout() {
    // Mobile: form first, image second
    return SingleChildScrollView(
      child: Column(
        children: [
          _buildFormPanel(),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.38,
            child: _buildVisualPanel(),
          ),
        ],
      ),
    );
  }

  Widget _buildVisualPanel() {
    return Container(
      color: _C.visualBg,
      child: Image.asset(
        'assets/images/register.jpg',
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        alignment: Alignment.center,
        errorBuilder: (_, __, ___) =>
            const SizedBox.expand(child: ColoredBox(color: _C.visualBg)),
      ),
    );
  }

  Widget _buildFormPanel() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth <= 900;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 18 : 42,
        vertical: isMobile ? 18 : 16,
      ),
      child: Column(
        mainAxisAlignment: isMobile
            ? MainAxisAlignment.start
            : MainAxisAlignment.spaceEvenly,
        children: [
          // Logo
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: Image.asset(
              'assets/images/logo_with_bg.png',
              width: 80,
              height: 80,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: _C.pageBg,
                ),
                child: Center(
                  child: Text(
                    'P',
                    style: TextStyle(
                      fontFamily: _fontFamily,
                      fontSize: 42,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 2),

          // Title
          Text(
            'Create Your Account',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: _fontFamily,
              fontSize: isMobile ? 22 : 28,
              fontWeight: FontWeight.w700,
              color: _C.titleColor,
              height: 1.16,
            ),
          ),

          // Subtitle
          Text(
            'Register now and start building with Primoria.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: _fontFamily,
              fontSize: 13.5,
              color: _C.subtitleColor,
            ),
          ),
          if (isMobile) const SizedBox(height: 10),

          // Form
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Email
                _buildLabel('Email'),
                const SizedBox(height: 8),
                _buildInput(
                  controller: _emailController,
                  placeholder: 'you@example.com or phone',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),

                // Password
                _buildLabel('Password'),
                const SizedBox(height: 8),
                _buildPasswordInput(
                  controller: _passwordController,
                  obscure: _obscurePassword,
                  onToggle: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  placeholder: 'At least 6 characters',
                ),
                const SizedBox(height: 14),

                // Confirm Password
                _buildLabel('Confirm Password'),
                const SizedBox(height: 8),
                _buildPasswordInput(
                  controller: _confirmPasswordController,
                  obscure: _obscureConfirmPassword,
                  onToggle: () => setState(
                    () => _obscureConfirmPassword = !_obscureConfirmPassword,
                  ),
                  placeholder: 'Repeat your password',
                ),
                const SizedBox(height: 8),

                // Terms + Need help
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: Checkbox(
                            value: _acceptedTerms,
                            onChanged: (v) =>
                                setState(() => _acceptedTerms = v ?? false),
                            activeColor: _C.buttonBg,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'I agree to the Terms & Privacy Policy',
                          style: TextStyle(
                            fontFamily: _fontFamily,
                            fontSize: 12.6,
                            color: _C.metaColor,
                          ),
                        ),
                      ],
                    ),
                    MouseRegion(
                      cursor: SystemMouseCursors.click,
                      child: GestureDetector(
                        onTap: () {},
                        child: Text(
                          'Need help?',
                          style: TextStyle(
                            fontFamily: _fontFamily,
                            fontSize: 12.6,
                            color: _C.metaColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Register button
                Center(
                  child: SizedBox(
                    width: isMobile ? double.infinity : 220,
                    height: 48,
                    child: _buildRegisterButton(),
                  ),
                ),
                const SizedBox(height: 4),

                // Status message
                SizedBox(
                  height: 18,
                  child: Text(
                    _statusMessage,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: _fontFamily,
                      fontSize: 12.6,
                      color: _statusState == 'error'
                          ? _C.errorColor
                          : _statusState == 'success'
                          ? _C.successColor
                          : _C.statusInfo,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Divider
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Row(
              children: [
                Expanded(child: Container(height: 1, color: _C.lineColor)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'Other Register Way',
                    style: TextStyle(
                      fontFamily: _fontFamily,
                      fontSize: 14.2,
                      color: _C.dividerText,
                    ),
                  ),
                ),
                Expanded(child: Container(height: 1, color: _C.lineColor)),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Social buttons
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: _buildSocialGrid(isMobile),
          ),
          const SizedBox(height: 4),

          // Sign in text
          Text.rich(
            TextSpan(
              text: 'Already have an account? ',
              style: TextStyle(
                fontFamily: _fontFamily,
                fontSize: 14.4,
                color: _C.signupLink,
              ),
              children: [
                WidgetSpan(
                  alignment: PlaceholderAlignment.baseline,
                  baseline: TextBaseline.alphabetic,
                  child: MouseRegion(
                    cursor: SystemMouseCursors.click,
                    child: GestureDetector(
                      onTap: () =>
                          Navigator.of(context).pushReplacementNamed('/login'),
                      child: Text(
                        'Sign-in',
                        style: TextStyle(
                          fontFamily: _fontFamily,
                          fontSize: 14.4,
                          fontWeight: FontWeight.w700,
                          color: _C.buttonBg,
                        ),
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

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: _fontFamily,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: _C.mutedColor,
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String placeholder,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      onChanged: (_) {
        if (_statusState == 'error') _setStatus('', '');
      },
      style: TextStyle(
        fontFamily: _fontFamily,
        fontSize: 14.7,
        color: _C.inputText,
      ),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: TextStyle(
          fontFamily: _fontFamily,
          fontSize: 14.7,
          color: _C.mutedColor.withValues(alpha: 0.6),
        ),
        filled: false,
        contentPadding: const EdgeInsets.only(bottom: 10),
        border: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.lineColor),
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.lineColor),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.inputFocusBorder),
        ),
      ),
    );
  }

  Widget _buildPasswordInput({
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback onToggle,
    required String placeholder,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      onChanged: (_) {
        if (_statusState == 'error') _setStatus('', '');
      },
      style: TextStyle(
        fontFamily: _fontFamily,
        fontSize: 14.7,
        color: _C.inputText,
      ),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: TextStyle(
          fontFamily: _fontFamily,
          fontSize: 14.7,
          color: _C.mutedColor.withValues(alpha: 0.6),
        ),
        filled: false,
        contentPadding: const EdgeInsets.only(bottom: 10, right: 62),
        border: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.lineColor),
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.lineColor),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: _C.inputFocusBorder),
        ),
        suffixIcon: MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                obscure ? 'Show' : 'Hide',
                style: TextStyle(
                  fontFamily: _fontFamily,
                  fontSize: 12.9,
                  fontWeight: FontWeight.w600,
                  color: _C.toggleColor,
                ),
              ),
            ),
          ),
        ),
        suffixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      ),
    );
  }

  Widget _buildRegisterButton() {
    return MouseRegion(
      cursor: _isSubmitting
          ? SystemMouseCursors.wait
          : SystemMouseCursors.click,
      child: GestureDetector(
        onTap: _isSubmitting ? null : _submit,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: _C.buttonBg,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    'Register',
                    style: TextStyle(
                      fontFamily: _fontFamily,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFFF8FBFF),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildSocialGrid(bool isMobile) {
    final icons = [
      {'asset': 'assets/images/google.png', 'size': 38.0, 'key': 'google'},
      {'asset': 'assets/images/wechat.png', 'size': 44.0, 'key': 'wechat'},
      {'asset': 'assets/images/ins.png', 'size': 44.0, 'key': 'ins'},
      {'asset': 'assets/images/whatsapp.png', 'size': 44.0, 'key': 'whatsapp'},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isMobile ? 2 : 4,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: isMobile ? 2.5 : 1.6,
      ),
      itemCount: icons.length,
      itemBuilder: (context, index) {
        final icon = icons[index];
        return MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: () => _onSocialTap(icon['key'] as String),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _C.socialBorder),
              ),
              child: Center(
                child: Image.asset(
                  icon['asset'] as String,
                  width: icon['size'] as double,
                  height: icon['size'] as double,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.link, color: _C.titleColor),
                ),
              ),
            ),
          ),
        );
      },
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
