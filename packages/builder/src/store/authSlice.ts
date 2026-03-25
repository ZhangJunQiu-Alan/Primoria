import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type User, type Session } from '@supabase/supabase-js';

export type BuilderRole = 'user' | 'subscriber' | 'author' | 'admin';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: true,
};

export function hasBuilderAccess(role: string | null | undefined): role is BuilderRole {
  return role === 'user' || role === 'subscriber' || role === 'author' || role === 'admin';
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ user: User | null; session: Session | null; role?: string | null }>,
    ) {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.role = action.payload.role ?? null;
      state.loading = false;
    },
    clearSession(state) {
      state.user = null;
      state.session = null;
      state.role = null;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setSession, clearSession, setLoading } = authSlice.actions;
export default authSlice.reducer;
