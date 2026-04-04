import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BuilderAuthLayout } from '@/features/public/BuilderAuthLayout';
import { supabase } from '@/shared/api/supabase';
import { FooterPrompt } from '@/features/public/BuilderAuthLayout';
import { readReturnTo } from '@/shared/utils/authRedirect';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginPath = `/login?returnTo=${encodeURIComponent(readReturnTo(location.search))}`;

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
      pageLabel="Learner sign in"
      title="Completing sign in"
      subtitle="Finishing the secure hand-off from your sign-in provider."
      alternateLink={<FooterPrompt prompt="Need to restart?" linkText="Go to sign in" to={loginPath} />}
    >
      <div className="auth-success-card">
        <h3 className="auth-success-card__title">Almost there.</h3>
        <p className="auth-success-card__summary">
          Primoria is syncing your session and will route you into the learner experience automatically.
        </p>
      </div>
    </BuilderAuthLayout>
  );
}
