import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { setLoading, setSession, clearSession } from '@/store/authSlice';
import { useAppDispatch } from '@/store';

async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load profile role:', error);
    return null;
  }

  return typeof data?.role === 'string' ? data.role : null;
}

/**
 * Bootstraps the Supabase auth state into Redux on mount.
 * Must be rendered inside <Provider store={store}>.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    let requestId = 0;

    async function syncSession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) {
      const currentRequestId = ++requestId;

      if (!session) {
        if (active && currentRequestId === requestId) {
          dispatch(clearSession());
        }
        return;
      }

      const role = await fetchUserRole(session.user.id);

      if (!active || currentRequestId !== requestId) {
        return;
      }

      dispatch(setSession({ user: session.user, session, role }));
    }

    dispatch(setLoading(true));
    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session ?? null);
    });

    // Subscribe to future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setLoading(true));
      void syncSession(session ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
