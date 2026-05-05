import { useEffect } from 'react';
import { type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { markBootSplashAuthSettled } from '@/shared/boot/bootSplash';
import { supabase } from '@/shared/api/supabase';
import { captureViewerError, clearViewerUserContext, setViewerUserContext } from '@/shared/platform/observability';
import { getDemoRole } from '@/shared/utils/demoMode';
import { useAppDispatch } from '@/shared/state/store';
import { clearSession, setLoading, setSession } from '@/features/auth/authSlice';
import { clearAiTutorSessionStorage } from '@/features/ai-tutor/aiTutorUtils';

async function fetchUserRole(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    captureViewerError(error, { area: 'auth_fetch_profile', userId });
    return {
      role: 'user',
      displayName: '',
    };
  }

  return {
    role: typeof data?.role === 'string' ? data.role : 'user',
    displayName:
      typeof data?.username === 'string' && data.username.trim()
        ? data.username
        : typeof data?.display_name === 'string' && data.display_name.trim()
          ? data.display_name
          : '',
  };
}

async function syncSupabaseSession(dispatch: ReturnType<typeof useAppDispatch>, session: Session | null) {
  if (!session) {
    const demoRole = getDemoRole();
    if (demoRole) {
      const demoUser = {
        id: 'demo-user',
        email: demoRole === 'parent' ? 'parent@demo.primoria.dev' : 'learner@demo.primoria.dev',
        displayName: demoRole === 'parent' ? 'Demo Parent' : 'Demo Learner',
      };
      setViewerUserContext({ ...demoUser, role: demoRole });
      dispatch(
        setSession({
          user: demoUser,
          role: demoRole,
          source: 'demo',
        }),
      );
      markBootSplashAuthSettled();
      return;
    }

    clearViewerUserContext();
    clearAiTutorSessionStorage();
    dispatch(clearSession());
    markBootSplashAuthSettled();
    return;
  }

  const roleData = await fetchUserRole(session.user.id);
  setViewerUserContext({
    id: session.user.id,
    email: session.user.email ?? '',
    displayName:
      roleData.displayName || session.user.user_metadata.display_name || session.user.email?.split('@')[0] || 'Learner',
    role: roleData.role,
  });
  dispatch(
    setSession({
      user: {
        id: session.user.id,
        email: session.user.email ?? '',
        displayName: roleData.displayName || session.user.user_metadata.display_name || session.user.email?.split('@')[0] || 'Learner',
      },
      role: roleData.role,
      source: 'supabase',
    }),
  );
  markBootSplashAuthSettled();
}

async function confirmCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    captureViewerError(error, { area: 'auth_confirm_session' });
    return null;
  }
  return data.session ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    dispatch(setLoading(true));

    void confirmCurrentSession().then((session) => {
      if (!active) {
        return;
      }
      void syncSupabaseSession(dispatch, session);
    });

    async function handleAuthStateChange(event: AuthChangeEvent, session: Session | null) {
      let nextSession = session;

      if (!nextSession && event !== 'SIGNED_OUT') {
        const confirmedSession = await confirmCurrentSession();
        nextSession = confirmedSession;
      }

      if (!active) {
        return;
      }

      await syncSupabaseSession(dispatch, nextSession);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthStateChange(event, session ?? null);
    });

    return () => {
      active = false;
      clearViewerUserContext();
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
