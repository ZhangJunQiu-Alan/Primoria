import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AuthActionButton,
  AuthDivider,
  AuthField,
  BuilderAuthLayout,
  AuthSocialButton,
  AuthStatusBanner,
  EmailToggleButton,
  FeatureCheck,
  FooterPrompt,
  PasswordVisibilityButton,
} from '@/features/public/BuilderAuthLayout';
import { getFieldErrors, registerSchema } from '@/features/public/builderAuthSchemas';
import { supabase } from '@/shared/api/supabase';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { buildAuthCallbackUrl, readReturnTo } from '@/shared/utils/authRedirect';

type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword';
type Provider = 'google' | 'apple' | 'email' | null;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showEmailForm, setShowEmailForm] = useState(true);
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

  async function handleOAuth(provider: 'google' | 'apple') {
    setLoadingProvider(provider);
    setStatus(null);
    captureViewerEvent('viewer_register_oauth_started', { provider });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: buildAuthCallbackUrl(returnTo) },
    });

    setLoadingProvider(null);
    if (error) {
      setStatus({ tone: 'error', message: error.message });
      captureViewerError(error, { area: 'register_oauth', provider });
    }
  }

  function handleWeChatComingSoon() {
    setStatus({ tone: 'error', message: 'WeChat registration is coming soon.' });
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

    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(returnTo),
        data: {
          name: result.data.name,
          username: result.data.name,
          display_name: result.data.name,
        },
      },
    });

    setLoadingProvider(null);

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
      message: 'Account created. Verify your email, then sign in to continue.',
    });
  }

  if (createdAccount) {
    return (
      <BuilderAuthLayout
        pageLabel="Learner sign up"
        title="Check your email"
        subtitle="Your Primoria learner account is ready. Confirm the email address you used, then come back to sign in."
        alternateLink={<FooterPrompt prompt="Already verified?" linkText="Go to sign in" to={loginPath} />}
      >
        <div className="auth-success-card">
          <span className="auth-success-card__badge">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Account created</span>
          </span>
          <h3 className="auth-success-card__title">Verify and launch.</h3>
          <p className="auth-success-card__summary">
            We sent a confirmation link to <strong>{formValues.email}</strong>. Open it, verify the
            account, and return to the sign-in page to continue.
          </p>
          <div className="auth-actions-row">
            <AuthActionButton
              tone="primary"
              label="Back to sign in"
              type="button"
              onClick={() => navigate(loginPath)}
            />
            <AuthActionButton
              tone="secondary"
              label="Return to landing"
              type="button"
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
      pageLabel="Learner sign up"
      title="Create your learner account"
      subtitle="Use the same builder registration interface, then move directly into the React viewer."
      alternateLink={<FooterPrompt prompt="Already have an account?" linkText="Sign in" to={loginPath} />}
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
        label={showEmailForm ? 'Hide email form' : 'Create with email'}
        onClick={() => {
          setShowEmailForm((current) => !current);
          setStatus(null);
          setFieldErrors({});
        }}
        disabled={Boolean(loadingProvider)}
      />

      {showEmailForm ? (
        <section className="auth-form-block" aria-label="Email registration form">
          <div className="auth-form-block__header">
            <h3 className="auth-form-block__title">Create with email</h3>
          </div>

          <AuthField
            id="register-name"
            label="Name"
            autoComplete="name"
            placeholder="Your display name"
            value={formValues.name}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, name: event.target.value }))
            }
            error={fieldErrors.name}
            disabled={isSubmitting}
          />

          <AuthField
            id="register-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="learner@primoria.dev"
            value={formValues.email}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, email: event.target.value }))
            }
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          <AuthField
            id="register-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a password"
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
            label="Confirm password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
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
              label="Create account"
              onClick={() => void handleRegister()}
              loading={isSubmitting}
            />
            <AuthActionButton
              type="button"
              tone="secondary"
              label="Return to landing"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            />
          </div>

          <FeatureCheck>Email registration can continue directly into library, lessons, and profile.</FeatureCheck>
        </section>
      ) : null}

      {status ? <AuthStatusBanner tone={status.tone} message={status.message} /> : null}
    </BuilderAuthLayout>
  );
}
