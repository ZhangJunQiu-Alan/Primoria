import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BuilderAuthLayout } from '@/features/public/BuilderAuthLayout';
import { supabase } from '@/shared/api/supabase';
import { FooterPrompt } from '@/features/public/BuilderAuthLayout';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { readReturnTo } from '@/shared/utils/authRedirect';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const language = useProductLanguage();
  const isChinese = language === 'zh-CN';
  const loginPath = `/login?returnTo=${encodeURIComponent(readReturnTo(location.search))}`;
  const callbackText = isChinese
    ? {
        pageLabel: '学习者登录',
        title: '正在完成登录',
        subtitle: '正在安全完成与你的登录服务提供方的会话交接。',
        prompt: '需要重新开始？',
        linkText: '前往登录',
        almostThere: '马上就好。',
        summary: 'Primoria 正在同步你的会话，随后会自动把你带回学习空间。',
      }
    : {
        pageLabel: 'Learner sign in',
        title: 'Completing sign in',
        subtitle: 'Finishing the secure hand-off from your sign-in provider.',
        prompt: 'Need to restart?',
        linkText: 'Go to sign in',
        almostThere: 'Almost there.',
        summary: 'Primoria is syncing your session and will route you into the learner experience automatically.',
      };

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
      pageLabel={callbackText.pageLabel}
      title={callbackText.title}
      subtitle={callbackText.subtitle}
      alternateLink={<FooterPrompt prompt={callbackText.prompt} linkText={callbackText.linkText} to={loginPath} />}
    >
      <div className="auth-success-card">
        <h3 className="auth-success-card__title">{callbackText.almostThere}</h3>
        <p className="auth-success-card__summary">
          {callbackText.summary}
        </p>
      </div>
    </BuilderAuthLayout>
  );
}
