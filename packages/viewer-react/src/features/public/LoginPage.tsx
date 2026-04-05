import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AuthActionButton,
  AuthDivider,
  AuthField,
  BuilderAuthLayout,
  AuthSocialButton,
  AuthStatusBanner,
  FooterPrompt,
  PasswordVisibilityButton,
} from '@/features/public/BuilderAuthLayout';
import { getFieldErrors, loginSchema, passwordResetSchema } from '@/features/public/builderAuthSchemas';
import { viewerCopy } from '@/shared/theme/copy';
import { supabase } from '@/shared/api/supabase';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { buildAuthCallbackUrl, readReturnTo } from '@/shared/utils/authRedirect';
import { publicAssetPath } from '@/shared/utils/publicAsset';

type LoginField = 'email' | 'password';
type AuthMode = 'signin' | 'forgot';
type Provider = 'google' | 'apple' | 'email' | null;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loadingProvider, setLoadingProvider] = useState<Provider>(null);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isForgotMode = mode === 'forgot';
  const isSubmitting = loadingProvider === 'email';
  const returnTo = readReturnTo(`?${searchParams.toString()}`);
  const registerPath = `/register?returnTo=${encodeURIComponent(returnTo)}`;

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingProvider(provider);
    setStatus(null);
    captureViewerEvent('viewer_login_oauth_started', { provider });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: buildAuthCallbackUrl(returnTo) },
    });

    setLoadingProvider(null);
    if (error) {
      setStatus({ tone: 'error', message: error.message });
      captureViewerError(error, { area: 'login_oauth', provider });
    }
  }

  function handleWeChatComingSoon() {
    setStatus({ tone: 'error', message: viewerCopy.auth.wechatSoon });
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
        captureViewerError(error, { area: 'login_reset_password' });
        return;
      }

      captureViewerEvent('viewer_reset_password_requested');
      setStatus({ tone: 'success', message: viewerCopy.auth.resetSuccess });
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
      captureViewerError(error, { area: 'login_password' });
      return;
    }

    captureViewerEvent('viewer_login_password_success');
    navigate(returnTo, { replace: true });
  }

  return (
    <BuilderAuthLayout
      pageLabel=""
      title={viewerCopy.auth.loginTitle}
      subtitle=""
      alternateLink={<FooterPrompt prompt="New here?" linkText="Create an account" to={registerPath} />}
    >
      <AuthSocialButton
        label="Continue with Google"
        tone="light"
        logoSrc={publicAssetPath('primoria-google.png')}
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
        logoSrc={publicAssetPath('primoria-wechat.png')}
        invertLogo
        onClick={handleWeChatComingSoon}
        badge="Soon"
        disabled={Boolean(loadingProvider)}
      />

      <AuthDivider />

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
          placeholder="learner@primoria.dev"
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
      </section>

      {status ? <AuthStatusBanner tone={status.tone} message={status.message} /> : null}
    </BuilderAuthLayout>
  );
}
