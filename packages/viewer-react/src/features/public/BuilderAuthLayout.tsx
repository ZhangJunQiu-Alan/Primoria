import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Eye,
  EyeOff,
  Mail,
  MonitorPlay,
  Sparkles,
} from 'lucide-react';
import { usePublicCopy } from '@/features/public/publicCopy';
import { useCoreCopy } from '@/shared/theme/coreCopy';
import { cn } from '@/shared/utils/cn';
import { publicAssetPath } from '@/shared/utils/publicAsset';

type StatusTone = 'error' | 'success';
type ButtonTone = 'primary' | 'secondary';
type SocialButtonTone = 'light' | 'dark' | 'wechat' | 'muted';

export function BuilderAuthLayout({
  title,
  subtitle,
  pageLabel,
  alternateLink,
  children,
}: {
  title: string;
  subtitle: string;
  pageLabel: string;
  alternateLink: ReactNode;
  children: ReactNode;
}) {
  const copy = usePublicCopy();
  const authFeatures = [
    { icon: Sparkles, label: copy.landing.authPanel.features[0] },
    { icon: Bot, label: copy.landing.authPanel.features[1] },
    { icon: MonitorPlay, label: copy.auth.registrationSupport },
  ];

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <BrandLockup />

          <div className="auth-brand-panel__copy">
            <div className="auth-panel__eyebrow">{copy.landing.authPanel.badge}</div>
            <h1 className="auth-brand-panel__title">{copy.landing.authPanel.title}</h1>
          </div>

          <div className="auth-brand-panel__feature-list">
            {authFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.label} className="auth-feature-line">
                  <span className="auth-feature-line__icon">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span>{feature.label}</span>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="auth-panel">
          <header className="auth-mobile-header">
            <BrandLockup />
          </header>

          <div className="auth-panel__inner">
            <div className="auth-panel__frame">
              <div className="auth-panel__heading">
                {pageLabel ? <p className="auth-panel__eyebrow">{pageLabel}</p> : null}
                <h2 className="auth-panel__title">{title}</h2>
                {subtitle ? <p className="auth-panel__subtitle">{subtitle}</p> : null}
              </div>

              <div className="auth-panel__body">{children}</div>

              <footer className="auth-panel__footer">{alternateLink}</footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function BrandLockup() {
  const coreCopy = useCoreCopy();
  const publicCopy = usePublicCopy();

  return (
    <Link to="/" className="auth-brand-lockup" aria-label={publicCopy.layout.homeAriaLabel}>
      <span className="auth-brand-lockup__mark">
        <img src={publicAssetPath('primoria-logo.png')} alt="" aria-hidden="true" />
      </span>
      <span className="auth-brand-lockup__wordmark">{coreCopy.brand.name}</span>
    </Link>
  );
}

export function AuthStatusBanner({
  tone,
  message,
}: {
  tone: StatusTone;
  message: string;
}) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheckBig;

  return (
    <div className={cn('auth-status-banner', `auth-status-banner--${tone}`)} role="status">
      <Icon size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  const copy = usePublicCopy();

  return (
    <div className="auth-divider" aria-hidden="true">
      <span className="auth-divider__line" />
      <span className="auth-divider__label">{label === 'or' ? copy.auth.or : label}</span>
      <span className="auth-divider__line" />
    </div>
  );
}

export function AuthSocialButton({
  label,
  tone,
  onClick,
  loading = false,
  disabled = false,
  logoSrc,
  invertLogo = false,
  icon,
  badge,
}: {
  label: string;
  tone: SocialButtonTone;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  logoSrc?: string;
  invertLogo?: boolean;
  icon?: ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={cn('auth-social-button', `auth-social-button--${tone}`)}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className="auth-social-button__content">
        <span className="auth-social-button__leading">
          {loading ? (
            <span className="auth-spinner" aria-hidden="true" />
          ) : logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              aria-hidden="true"
              className={cn(
                'auth-social-button__logo',
                invertLogo && 'auth-social-button__logo--inverted',
              )}
            />
          ) : (
            icon
          )}
        </span>
        <span>{label}</span>
      </span>
      {badge ? <span className="auth-social-button__badge">{badge}</span> : null}
    </button>
  );
}

export function AuthActionButton({
  label,
  tone,
  icon,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}: {
  label: string;
  tone: ButtonTone;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn('auth-action-button', `auth-action-button--${tone}`)}
      disabled={disabled || loading}
    >
      <span>{label}</span>
      {loading ? (
        <span className="auth-spinner auth-spinner--light" aria-hidden="true" />
      ) : icon ? (
        icon
      ) : tone === 'primary' ? (
        <ArrowRight size={16} aria-hidden="true" />
      ) : null}
    </button>
  );
}

export function AuthField({
  id,
  label,
  error,
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  suffix?: ReactNode;
  className?: string;
}) {
  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
      </label>
      <div className={cn('auth-field__input-wrap', error && 'auth-field__input-wrap--error')}>
        <input
          id={id}
          className={cn('auth-field__input', className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {suffix ? <span className="auth-field__suffix">{suffix}</span> : null}
      </div>
      {error ? <p className="auth-field__error">{error}</p> : null}
    </div>
  );
}

export function PasswordVisibilityButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  const copy = usePublicCopy();
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      type="button"
      className="auth-password-toggle"
      onClick={onClick}
      aria-label={visible ? copy.auth.hidePassword : copy.auth.showPassword}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

export function AuthInlineLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="auth-inline-link">
      <span>{children}</span>
      <ChevronRight size={15} aria-hidden="true" />
    </Link>
  );
}

export function EmailToggleButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <AuthSocialButton
      label={label}
      tone="muted"
      icon={<Mail size={18} aria-hidden="true" />}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

export function FooterPrompt({
  prompt,
  linkText,
  to,
}: {
  prompt: string;
  linkText: string;
  to: string;
}) {
  return (
    <div className="auth-footer-prompt">
      <span>{prompt}</span>
      <AuthInlineLink to={to}>{linkText}</AuthInlineLink>
    </div>
  );
}

export function FeatureCheck({ children }: { children: ReactNode }) {
  return (
    <div className="auth-feature-check">
      <span className="auth-feature-check__icon">
        <Check size={14} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </div>
  );
}
