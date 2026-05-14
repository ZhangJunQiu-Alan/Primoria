import { useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
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
import { getAuthFailureMessage, runAuthRequest } from '@/features/public/authRequest';
import { getFieldErrors, registerSchema } from '@/features/public/builderAuthSchemas';
import { usePublicCopy } from '@/features/public/publicCopy';
import { supabase } from '@/shared/api/supabase';
import { useDocumentMeta } from '@/shared/i18n/documentMeta';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { buildAuthCallbackUrl, readReturnTo } from '@/shared/utils/authRedirect';
import { publicAssetPath } from '@/shared/utils/publicAsset';

type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword';
type Provider = 'google' | 'apple' | 'email' | null;

function buildSignupUsername(displayName: string, email: string) {
  const emailLocalPart = email.split('@')[0]?.trim() || 'user';
  const base = displayName.trim() || emailLocalPart;
  const normalizedBase = base
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 21);
  const safeBase = normalizedBase.length >= 3 ? normalizedBase : `user-${emailLocalPart}`.slice(0, 21);
  const uniquenessSuffix = email
    .trim()
    .toLowerCase()
    .split('')
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
    .toString(36)
    .slice(0, 8);

  return `${safeBase}-${uniquenessSuffix}`.slice(0, 32);
}

export function RegisterPage() {
  const copy = usePublicCopy();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<Provider>(null);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [createdAccount, setCreatedAccount] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isSubmitting = loadingProvider === 'email';
  const returnTo = readReturnTo(`?${searchParams.toString()}`);
  const loginPath = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  useDocumentMeta(copy.meta.register);

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingProvider(provider);
    setStatus(null);
    captureViewerEvent('viewer_register_oauth_started', { provider });

    try {
      const { error } = await runAuthRequest(() =>
        supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: buildAuthCallbackUrl(returnTo) },
        }),
      );

      if (error) {
        setStatus({ tone: 'error', message: error.message });
        captureViewerError(error, { area: 'register_oauth', provider });
      }
    } catch (error) {
      setStatus({ tone: 'error', message: getAuthFailureMessage(error, copy.auth.networkError) });
      captureViewerError(error, { area: 'register_oauth_network', provider });
    } finally {
      setLoadingProvider(null);
    }
  }

  function handleWeChatComingSoon() {
    setStatus({ tone: 'error', message: copy.auth.wechatSoon });
  }

  async function handleRegister() {
    setStatus(null);
    const result = registerSchema.safeParse(formValues);

    if (!result.success) {
      setFieldErrors(getFieldErrors<RegisterField>(result.error));
      return;
    }

    setFieldErrors({});
    setLoadingProvider('email');
    captureViewerEvent('viewer_register_started');

    const signupUsername = buildSignupUsername(result.data.name, result.data.email);

    try {
      const { data, error } = await runAuthRequest(() =>
        supabase.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            emailRedirectTo: buildAuthCallbackUrl(returnTo),
            data: {
              name: signupUsername,
              username: signupUsername,
              display_name: result.data.name,
            },
          },
        }),
      );

      if (error) {
        setStatus({ tone: 'error', message: error.message });
        captureViewerError(error, { area: 'register' });
        return;
      }

      if (data.session) {
        captureViewerEvent('viewer_register_completed', { sessionCreated: true });
        navigate(returnTo, { replace: true });
        return;
      }

      setCreatedAccount(true);
      captureViewerEvent('viewer_register_completed', { sessionCreated: false });
      setStatus({
        tone: 'success',
        message: copy.auth.registerSuccess,
      });
    } catch (error) {
      setStatus({ tone: 'error', message: getAuthFailureMessage(error, copy.auth.networkError) });
      captureViewerError(error, { area: 'register_network' });
    } finally {
      setLoadingProvider(null);
    }
  }

  if (createdAccount) {
    return (
      <BuilderAuthLayout
        pageLabel=""
        title={copy.auth.verifyTitle}
        subtitle={copy.auth.verifyMessage}
        alternateLink={<FooterPrompt prompt={copy.auth.alreadyHaveAccount} linkText={copy.auth.signInLink} to={loginPath} />}
      >
        <div className="auth-success-card">
          <span className="auth-success-card__badge">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{copy.auth.accountCreated}</span>
          </span>
          <h3 className="auth-success-card__title">{copy.auth.verifyAndLaunch}</h3>
          <p className="auth-success-card__summary">
            {copy.auth.verifySummaryPrefix} <strong>{formValues.email}</strong>. {copy.auth.verifySummarySuffix}
          </p>
          <div className="auth-actions-row">
            <AuthActionButton
              tone="primary"
              label={copy.auth.backToLogin}
              type="button"
              onClick={() => navigate(loginPath)}
            />
            <AuthActionButton
              tone="secondary"
              label={copy.auth.keepExploring}
              type="button"
              icon={<Sparkles size={16} aria-hidden="true" />}
              onClick={() => navigate('/')}
            />
          </div>
        </div>
        {status ? <AuthStatusBanner tone={status.tone} message={status.message} /> : null}
      </BuilderAuthLayout>
    );
  }

  return (
    <BuilderAuthLayout
      pageLabel=""
      title={copy.auth.registerTitle}
      subtitle={copy.auth.registerSubtitle}
      alternateLink={<FooterPrompt prompt={copy.auth.alreadyHaveAccount} linkText={copy.auth.signInLink} to={loginPath} />}
    >
      <AuthSocialButton
        label={copy.auth.google}
        tone="light"
        logoSrc={publicAssetPath('primoria-google.png')}
        onClick={() => void handleOAuth('google')}
        loading={loadingProvider === 'google'}
        disabled={Boolean(loadingProvider && loadingProvider !== 'google')}
      />
      <AuthSocialButton
        label={copy.auth.apple}
        tone="dark"
        icon={<span aria-hidden="true"></span>}
        onClick={() => void handleOAuth('apple')}
        loading={loadingProvider === 'apple'}
        disabled={Boolean(loadingProvider && loadingProvider !== 'apple')}
      />
      <AuthSocialButton
        label={copy.auth.wechat}
        tone="wechat"
        logoSrc={publicAssetPath('primoria-wechat.png')}
        invertLogo
        onClick={handleWeChatComingSoon}
        badge={copy.auth.soon}
        disabled={Boolean(loadingProvider)}
      />

      <AuthDivider />

      <section className="auth-form-block" aria-label={copy.layout.emailRegisterForm}>
        <div className="auth-form-block__header">
          <h3 className="auth-form-block__title">{copy.auth.registerEmailSectionTitle}</h3>
        </div>

        <AuthField
          id="register-name"
          label={copy.auth.displayName}
          autoComplete="name"
          placeholder={copy.auth.displayNamePlaceholder}
          value={formValues.name}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, name: event.target.value }))
          }
          error={fieldErrors.name}
          disabled={isSubmitting}
        />

        <AuthField
          id="register-email"
          label={copy.auth.email}
          type="email"
          autoComplete="email"
          placeholder={copy.auth.emailPlaceholder}
          value={formValues.email}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, email: event.target.value }))
          }
          error={fieldErrors.email}
          disabled={isSubmitting}
        />

        <AuthField
          id="register-password"
          label={copy.auth.password}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={copy.auth.createPasswordPlaceholder}
          value={formValues.password}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, password: event.target.value }))
          }
          error={fieldErrors.password}
          disabled={isSubmitting}
          suffix={
            <PasswordVisibilityButton
              visible={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            />
          }
        />

        <AuthField
          id="register-confirm-password"
          label={copy.auth.confirmPassword}
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={copy.auth.confirmPasswordPlaceholder}
          value={formValues.confirmPassword}
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting}
          suffix={
            <PasswordVisibilityButton
              visible={showConfirmPassword}
              onClick={() => setShowConfirmPassword((current) => !current)}
            />
          }
        />

        <div className="auth-actions-row">
          <AuthActionButton
            type="button"
            tone="primary"
            label={copy.auth.signUp}
            onClick={() => void handleRegister()}
            loading={isSubmitting}
          />
          <AuthActionButton
            type="button"
            tone="secondary"
            label={copy.auth.keepExploring}
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
