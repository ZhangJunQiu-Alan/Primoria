import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../theme/design_tokens.dart';
import '../services/supabase_service.dart';

/// Sign in / sign up dialog
class AuthDialog extends ConsumerStatefulWidget {
  final VoidCallback? onSuccess;

  const AuthDialog({super.key, this.onSuccess});

  @override
  ConsumerState<AuthDialog> createState() => _AuthDialogState();
}

enum AuthMode { login, register, forgotPassword }

class _AuthDialogState extends ConsumerState<AuthDialog> {
  AuthMode _mode = AuthMode.login;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;
  bool _obscurePassword = true;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();

  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  String _title(BuilderLocalizations t) {
    switch (_mode) {
      case AuthMode.login:
        return t.isZh ? '登录' : 'Sign in';
      case AuthMode.register:
        return t.isZh ? '注册' : 'Sign up';
      case AuthMode.forgotPassword:
        return t.isZh ? '重置密码' : 'Reset password';
    }
  }

  String _subtitle(BuilderLocalizations t) {
    switch (_mode) {
      case AuthMode.login:
        return t.isZh ? '登录后可保存并发布课程' : 'Sign in to save and publish courses';
      case AuthMode.register:
        return t.isZh ? '创建账号以开始创作' : 'Create an account to start building';
      case AuthMode.forgotPassword:
        return t.isZh ? '输入邮箱后我们将发送重置链接' : 'Enter your email and we’ll send a reset link';
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = BuilderLocalizations(ref.watch(languageProvider));
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppBorderRadius.lg),
      ),
      child: Container(
        width: 420,
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              _buildHeader(t),

              const SizedBox(height: AppSpacing.lg),

              // Form content
              _buildForm(t),

              // Message area
              _buildMessages(),

              const SizedBox(height: AppSpacing.lg),

              // Action buttons
              _buildActions(t),

              const SizedBox(height: AppSpacing.md),

              // Divider
              if (_mode != AuthMode.forgotPassword) ...[
                _buildDivider(),
                const SizedBox(height: AppSpacing.md),
                // Social sign-in
                _buildSocialLogin(t),
                const SizedBox(height: AppSpacing.md),
              ],

              // Mode switch
              _buildModeSwitch(t),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuilderLocalizations t) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.primary100,
            borderRadius: BorderRadius.circular(AppBorderRadius.sm),
          ),
          child: Icon(
            _mode == AuthMode.forgotPassword
                ? Icons.lock_reset
                : Icons.account_circle,
            color: AppColors.primary500,
            size: 28,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _title(t),
                style: const TextStyle(
                  fontSize: AppFontSize.xl,
                  fontWeight: FontWeight.w600,
                  color: AppColors.neutral800,
                ),
              ),
              Text(
                _subtitle(t),
                style: const TextStyle(
                  fontSize: AppFontSize.sm,
                  color: AppColors.neutral500,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.close, color: AppColors.neutral400),
        ),
      ],
    );
  }

  Widget _buildForm(BuilderLocalizations t) {
    return AutofillGroup(
      child: Column(
        children: [
          // Show display name input on registration
          if (_mode == AuthMode.register) ...[
            TextFormField(
              controller: _nameController,
              enabled: !_isLoading,
              autofillHints: const [AutofillHints.name],
              decoration: InputDecoration(
                labelText: t.isZh ? '显示名称' : 'Display name',
                hintText: t.isZh ? '我们怎么称呼你？' : 'How should we call you?',
                prefixIcon: Icon(Icons.person_outline, size: 20),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: AppSpacing.md),
          ],

          // Email
          TextFormField(
            controller: _emailController,
            enabled: !_isLoading,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: InputDecoration(
              labelText: t.isZh ? '邮箱' : 'Email',
              hintText: 'example@email.com',
              prefixIcon: Icon(Icons.email_outlined, size: 20),
            ),
            textInputAction: TextInputAction.next,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return t.isZh ? '请输入邮箱' : 'Please enter your email';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                return t.isZh ? '请输入有效邮箱地址' : 'Please enter a valid email address';
              }
              return null;
            },
          ),

          // Password (not in forgot password mode)
          if (_mode != AuthMode.forgotPassword) ...[
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _passwordController,
              enabled: !_isLoading,
              obscureText: _obscurePassword,
              autofillHints: _mode == AuthMode.register
                  ? const [AutofillHints.newPassword]
                  : const [AutofillHints.password],
              decoration: InputDecoration(
                labelText: t.isZh ? '密码' : 'Password',
                hintText: _mode == AuthMode.register
                    ? (t.isZh ? '至少 6 个字符' : 'At least 6 characters')
                    : (t.isZh ? '请输入密码' : 'Enter your password'),
                prefixIcon: const Icon(Icons.lock_outline, size: 20),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    size: 20,
                    color: AppColors.neutral400,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
              ),
              textInputAction: _mode == AuthMode.register
                  ? TextInputAction.next
                  : TextInputAction.done,
              onFieldSubmitted: _mode == AuthMode.login ? (_) => _submit() : null,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return t.isZh ? '请输入密码' : 'Please enter a password';
                }
                if (_mode == AuthMode.register && value.length < 6) {
                  return t.isZh ? '密码至少需要 6 位' : 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
          ],

          // Confirm password (register mode)
          if (_mode == AuthMode.register) ...[
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _confirmPasswordController,
              enabled: !_isLoading,
              obscureText: _obscurePassword,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                labelText: t.isZh ? '确认密码' : 'Confirm password',
                hintText: t.isZh ? '再次输入密码' : 'Enter password again',
                prefixIcon: Icon(Icons.lock_outline, size: 20),
              ),
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return t.isZh ? '请再次输入密码' : 'Please confirm your password';
              }
              if (value != _passwordController.text) {
                return t.isZh ? '两次输入的密码不一致' : 'Passwords do not match';
              }
              return null;
            },
          ),
        ],

        // Forgot password link (login mode)
        if (_mode == AuthMode.login) ...[
          const SizedBox(height: AppSpacing.sm),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _isLoading
                  ? null
                  : () {
                      setState(() {
                        _mode = AuthMode.forgotPassword;
                        _errorMessage = null;
                        _successMessage = null;
                      });
                    },
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                t.isZh ? '忘记密码？' : 'Forgot password?',
                style: TextStyle(
                  fontSize: AppFontSize.sm,
                  color: AppColors.primary500,
                ),
              ),
            ),
          ),
        ],
      ],
      ),
    );
  }

  Widget _buildMessages() {
    return Column(
      children: [
        // Error message
        if (_errorMessage != null) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 18,
                  color: AppColors.error,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Success message
        if (_successMessage != null) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppBorderRadius.sm),
              border: Border.all(
                color: AppColors.success.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle_outline,
                  size: 18,
                  color: AppColors.success,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    _successMessage!,
                    style: const TextStyle(
                      fontSize: AppFontSize.sm,
                      color: AppColors.success,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildActions(BuilderLocalizations t) {
    String buttonText;
    switch (_mode) {
      case AuthMode.login:
        buttonText = t.isZh ? '登录' : 'Sign in';
        break;
      case AuthMode.register:
        buttonText = t.isZh ? '创建账号' : 'Create account';
        break;
      case AuthMode.forgotPassword:
        buttonText = t.isZh ? '发送重置链接' : 'Send reset link';
        break;
    }

    return ElevatedButton(
      onPressed: _isLoading ? null : _submit,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
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
          : Text(buttonText),
    );
  }

  Widget _buildDivider() {
    final t = BuilderLocalizations(ref.read(languageProvider));
    return Row(
      children: [
        Expanded(child: Divider()),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Text(
            t.isZh ? '或' : 'OR',
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              color: AppColors.neutral400,
            ),
          ),
        ),
        Expanded(child: Divider()),
      ],
    );
  }

  Widget _buildSocialLogin(BuilderLocalizations t) {
    return Column(
      children: [
        // Google sign-in
        OutlinedButton.icon(
          onPressed: _isLoading ? null : _signInWithGoogle,
          icon: Image.network(
            'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
            width: 20,
            height: 20,
            errorBuilder: (_, __, ___) =>
                const Icon(Icons.g_mobiledata, size: 20),
          ),
          label: Text(t.isZh ? '使用 Google 继续' : 'Continue with Google'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            foregroundColor: AppColors.neutral700,
          ),
        ),
      ],
    );
  }

  Widget _buildModeSwitch(BuilderLocalizations t) {
    if (_mode == AuthMode.forgotPassword) {
      return TextButton(
        onPressed: _isLoading
            ? null
            : () {
                setState(() {
                  _mode = AuthMode.login;
                  _errorMessage = null;
                  _successMessage = null;
                });
              },
        child: Text(
          t.isZh ? '返回登录' : 'Back to sign in',
          style: TextStyle(color: AppColors.primary500),
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          _mode == AuthMode.login
              ? (t.isZh ? '还没有账号？' : "Don't have an account?")
              : (t.isZh ? '已有账号？' : 'Already have an account?'),
          style: const TextStyle(
            fontSize: AppFontSize.sm,
            color: AppColors.neutral500,
          ),
        ),
        TextButton(
          onPressed: _isLoading
              ? null
              : () {
                  setState(() {
                    _mode = _mode == AuthMode.login
                        ? AuthMode.register
                        : AuthMode.login;
                    _errorMessage = null;
                    _successMessage = null;
                    _confirmPasswordController.clear();
                  });
                },
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            _mode == AuthMode.login
                ? (t.isZh ? '注册' : 'Sign up')
                : (t.isZh ? '登录' : 'Sign in'),
            style: const TextStyle(
              fontSize: AppFontSize.sm,
              fontWeight: FontWeight.w600,
              color: AppColors.primary500,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      switch (_mode) {
        case AuthMode.login:
          await _handleLogin();
          break;
        case AuthMode.register:
          await _handleRegister();
          break;
        case AuthMode.forgotPassword:
          await _handleForgotPassword();
          break;
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleLogin() async {
    final result = await SupabaseService.signIn(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (!mounted) return;

    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else {
      setState(() {
        _errorMessage = result.message;
      });
    }
  }

  Future<void> _handleRegister() async {
    final result = await SupabaseService.signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      displayName: _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : null,
    );

    if (!mounted) return;

    if (result.success) {
      final t = BuilderLocalizations(ref.read(languageProvider));
      setState(() {
        _successMessage = t.isZh
            ? '注册成功！请先前往邮箱完成验证，再回来登录。'
            : 'Sign up successful! Please check your email to confirm your address, then sign in.';
        _mode = AuthMode.login;
        _passwordController.clear();
        _confirmPasswordController.clear();
        _nameController.clear();
      });
    } else {
      setState(() {
        _errorMessage = result.message;
      });
    }
  }

  Future<void> _handleForgotPassword() async {
    final result = await SupabaseService.resetPassword(
      email: _emailController.text.trim(),
    );

    if (!mounted) return;

    if (result.success) {
      final t = BuilderLocalizations(ref.read(languageProvider));
      setState(() {
        _successMessage = t.isZh
            ? '重置链接已发送，请查收邮箱。'
            : 'Reset link sent. Please check your email.';
      });
    } else {
      setState(() {
        _errorMessage = result.message;
      });
    }
  }

  Future<void> _signInWithGoogle() async {
    await _handleSocialSignIn(SupabaseService.signInWithGoogle);
  }

  Future<void> _handleSocialSignIn(Future<AuthResult> Function() action) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await action();

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result.success) {
      Navigator.pop(context);
      widget.onSuccess?.call();
    } else {
      setState(() {
        _errorMessage = result.message;
      });
    }
  }
}
