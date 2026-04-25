import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BuilderAuthLayout } from '@/features/public/BuilderAuthLayout';
import { FooterPrompt } from '@/features/public/BuilderAuthLayout';
import { usePublicCopy } from '@/features/public/publicCopy';
import { supabase } from '@/shared/api/supabase';
import { useDocumentMeta } from '@/shared/i18n/documentMeta';
import { readReturnTo } from '@/shared/utils/authRedirect';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = usePublicCopy();
  const loginPath = `/login?returnTo=${encodeURIComponent(readReturnTo(location.search))}`;
  useDocumentMeta(copy.meta.callback);

  useEffect(() => {
    let active = true;
    const returnTo = readReturnTo(location.search);

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      if (data.session) {
        navigate(returnTo, { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }
      if (event === 'SIGNED_IN' || session) {
        navigate(returnTo, { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [location.search, navigate]);

  return (
    <BuilderAuthLayout
      pageLabel={copy.callback.pageLabel}
      title={copy.callback.title}
      subtitle={copy.callback.subtitle}
      alternateLink={<FooterPrompt prompt={copy.callback.alternatePrompt} linkText={copy.callback.alternateLink} to={loginPath} />}
    >
      <div className="auth-success-card">
        <h3 className="auth-success-card__title">{copy.callback.cardTitle}</h3>
        <p className="auth-success-card__summary">
          {copy.callback.cardBody}
        </p>
      </div>
    </BuilderAuthLayout>
  );
}
