import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type User, type Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ user: User | null; session: Session | null }>) {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.loading = false;
    },
    clearSession(state) {
      state.user = null;
      state.session = null;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setSession, clearSession, setLoading } = authSlice.actions;
export default authSlice.reducer;
