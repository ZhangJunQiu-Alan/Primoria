import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  AuthActionButton,
  AuthDivider,
  AuthField,
  AuthLayout,
  AuthSocialButton,
  AuthStatusBanner,
  EmailToggleButton,
  FeatureCheck,
  FooterPrompt,
  PasswordVisibilityButton,
} from './AuthLayout';
import { getFieldErrors, loginSchema, passwordResetSchema } from './authSchemas';

type LoginField = 'email' | 'password';
type AuthMode = 'signin' | 'forgot';
type Provider = 'google' | 'apple' | 'email' | null;

export function LoginPage() {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loadingProvider, setLoadingProvider] = useState<Provider>(null);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isForgotMode = mode === 'forgot';
  const isSubmitting = loadingProvider === 'email';

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingProvider(provider);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoadingProvider(null);
    if (error) {
      setStatus({ tone: 'error', message: error.message });
    }
  }

  function handleWeChatComingSoon() {
    setStatus({ tone: 'error', message: 'WeChat login is coming soon.' });
  }

  function handleToggleEmailForm() {
    setShowEmailForm((current) => !current);
    setMode('signin');
    setStatus(null);
    setFieldErrors({});
  }

  async function handleEmailAction() {
    setStatus(null);

    if (isForgotMode) {
      const result = passwordResetSchema.safeParse({ email });
      if (!result.success) {
        setFieldErrors(getFieldErrors<LoginField>(result.error));
        return;
      }

      setFieldErrors({});
      setLoadingProvider('email');
      const { error } = await supabase.auth.resetPasswordForEmail(result.data.email);
      setLoadingProvider(null);

      if (error) {
        setStatus({ tone: 'error', message: error.message });
        return;
      }

      setStatus({ tone: 'success', message: 'Reset link sent. Check your email inbox.' });
      return;
    }

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldErrors(getFieldErrors<LoginField>(result.error));
      return;
    }

    setFieldErrors({});
    setLoadingProvider('email');
    const { error } = await supabase.auth.signInWithPassword(result.data);
    setLoadingProvider(null);

    if (error) {
      setStatus({ tone: 'error', message: error.message });
      return;
    }

    navigate('/dashboard');
  }

  return (
    <AuthLayout
      pageLabel="Builder sign in"
      title="Welcome back"
      subtitle="Continue with social sign-in or unlock the email form to get back into your builder workspace."
      alternateLink={
        <FooterPrompt prompt="New here?" linkText="Create an account" to="/register" />
      }
    >
      <AuthSocialButton
        label="Continue with Google"
        tone="light"
        logoSrc="/primoria-google.png"
        onClick={() => void handleOAuth('google')}
        loading={loadingProvider === 'google'}
        disabled={Boolean(loadingProvider && loadingProvider !== 'google')}
      />
      <AuthSocialButton
        label="Continue with Apple"
        tone="dark"
        icon={<span aria-hidden="true"></span>}
        onClick={() => void handleOAuth('apple')}
        loading={loadingProvider === 'apple'}
        disabled={Boolean(loadingProvider && loadingProvider !== 'apple')}
      />
      <AuthSocialButton
        label="Continue with WeChat"
        tone="wechat"
        logoSrc="/primoria-wechat.png"
        invertLogo
        onClick={handleWeChatComingSoon}
        badge="Soon"
        disabled={Boolean(loadingProvider)}
      />

      <AuthDivider />

      <EmailToggleButton
        label={showEmailForm ? 'Hide email form' : 'Continue with email'}
        onClick={handleToggleEmailForm}
        disabled={Boolean(loadingProvider)}
      />

      {showEmailForm ? (
        <section className="auth-form-block" aria-label="Email sign in form">
          <div className="auth-form-block__header">
            <h3 className="auth-form-block__title">
              {isForgotMode ? 'Reset your password' : 'Sign in with email'}
            </h3>
            <button
              type="button"
              className="auth-form-block__toggle"
              onClick={() => {
                setMode((current) => (current === 'signin' ? 'forgot' : 'signin'));
                setStatus(null);
                setFieldErrors({});
              }}
            >
              {isForgotMode ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>

          <AuthField
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="author@primoria.dev"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          {!isForgotMode ? (
            <AuthField
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              disabled={isSubmitting}
              suffix={
                <PasswordVisibilityButton
                  visible={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                />
              }
            />
          ) : null}

          <div className="auth-actions-row">
            <AuthActionButton
              type="button"
              tone="primary"
              label={isForgotMode ? 'Send reset link' : 'Sign in'}
              onClick={() => void handleEmailAction()}
              loading={isSubmitting}
            />
            <AuthActionButton
              type="button"
              tone="secondary"
              label="Keep exploring"
              icon={<Sparkles size={16} aria-hidden="true" />}
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            />
          </div>

          <FeatureCheck>
            {isForgotMode
              ? 'We send the reset email to the address above.'
              : 'Email sign-in lands directly in your author dashboard.'}
          </FeatureCheck>
        </section>
      ) : null}

      {status ? <AuthStatusBanner tone={status.tone} message={status.message} /> : null}
    </AuthLayout>
  );
}
