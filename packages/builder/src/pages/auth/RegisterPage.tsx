import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
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
import { getFieldErrors, registerSchema } from './authSchemas';

type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword';
type Provider = 'google' | 'apple' | 'email' | null;

export function RegisterPage() {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState<Provider>(null);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(
    null,
  );
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
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          display_name: result.data.name,
        },
      },
    });
    setLoadingProvider(null);

    if (error) {
      setStatus({ tone: 'error', message: error.message });
      return;
    }

    if (data.session) {
      navigate('/dashboard');
      return;
    }

    setCreatedAccount(true);
    setStatus({
      tone: 'success',
      message: 'Account created. Verify your email, then sign in to continue.',
    });
  }

  if (createdAccount) {
    return (
      <AuthLayout
        pageLabel="Builder sign up"
        title="Check your email"
        subtitle="Your Primoria account is ready. Confirm the email address you used, then come back to sign in."
        alternateLink={
          <FooterPrompt prompt="Already verified?" linkText="Go to sign in" to="/login" />
        }
      >
        <div className="auth-success-card">
          <span className="auth-success-card__badge">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Account created</span>
          </span>
          <h3 className="auth-success-card__title">Verify and launch.</h3>
          <p className="auth-success-card__summary">
            We sent a confirmation link to <strong>{formValues.email}</strong>. Open it, verify the
            account, and return to the builder login to continue.
          </p>
          <div className="auth-actions-row">
            <AuthActionButton
              tone="primary"
              label="Back to sign in"
              type="button"
              onClick={() => navigate('/login')}
            />
            <AuthActionButton
              tone="secondary"
              label="Return to landing"
              type="button"
              onClick={() => navigate('/')}
            />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageLabel="Builder sign up"
      title="Create your account"
      subtitle="Start with Google, Apple, or email, then bring your first course draft into the builder."
      alternateLink={<FooterPrompt prompt="Already have an account?" linkText="Sign in" to="/login" />}
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
            placeholder="author@primoria.dev"
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
              label="Back to sign in"
              onClick={() => navigate('/login')}
              disabled={isSubmitting}
            />
          </div>

          <FeatureCheck>Verification email is sent automatically after account creation.</FeatureCheck>
        </section>
      ) : null}

      {status ? <AuthStatusBanner tone={status.tone} message={status.message} /> : null}
    </AuthLayout>
  );
}
