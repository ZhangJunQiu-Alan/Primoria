import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setSession, clearSession } from '@/store/authSlice';
import { useAppDispatch } from '@/store';

/**
 * Bootstraps the Supabase auth state into Redux on mount.
 * Must be rendered inside <Provider store={store}>.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Hydrate from existing session
    void supabase.auth.getSession().then(({ data }) => {
      dispatch(
        setSession({ user: data.session?.user ?? null, session: data.session ?? null }),
      );
    });

    // Subscribe to future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(setSession({ user: session.user, session }));
      } else {
        dispatch(clearSession());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
